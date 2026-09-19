import { STATUS_CODE_TO_LABEL } from "../../data/config.js";

function countByCode(rows, code) {
  return rows.filter((r) => r.statusCode === code).length;
}

export function computeMetricsFromRequisitions(rows = []) {
  const total = rows.length;
  const submitted = countByCode(rows, "SUBMITTED");
  const underReview = countByCode(rows, "UNDER_REVIEW");
  const approved = countByCode(rows, "APPROVED");
  const completed = countByCode(rows, "COMPLETED");
  const rejected = countByCode(rows, "REJECTED");
  const processing = countByCode(rows, "PROCESSING");
  const draft = countByCode(rows, "DRAFT");
  const pendingWorkload = submitted + underReview + processing;
  const closed = approved + completed + rejected;
  const approvalRate = closed ? Math.round((approved / closed) * 1000) / 10 : 0;
  const completionRate = total ? Math.round((completed / total) * 1000) / 10 : 0;
  const performanceRate = total ? Math.round(((approved + completed) / total) * 1000) / 10 : 0;

  const durations = [];
  for (const r of rows) {
    if (!r.submitted || !r.updated) continue;
    if (!["APPROVED", "COMPLETED", "REJECTED"].includes(r.statusCode)) continue;
    const a = new Date(r.submitted);
    const b = new Date(r.updated);
    if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) continue;
    const days = Math.max(0, (b.getTime() - a.getTime()) / 86_400_000);
    durations.push(days);
  }
  const avgProcessingDays = durations.length
    ? Math.round((durations.reduce((s, d) => s + d, 0) / durations.length) * 10) / 10
    : 0;

  // Share of closed outcomes as a simple directional signal (not historical period-over-period).
  const trend = (part, whole) => {
    if (!whole) return null;
    const value = Math.round((part / whole) * 1000) / 10;
    return { value, direction: value >= 50 ? "up" : "down" };
  };

  return {
    total,
    draft,
    submitted,
    pending: processing,
    underReview,
    processing,
    approved,
    completed,
    rejected,
    pendingWorkload,
    avgProcessingDays,
    approvalRate,
    completionRate,
    performanceRate,
    trends: {
      total: total ? { value: total, direction: "up" } : null,
      pending: trend(pendingWorkload, total),
      underReview: trend(underReview, total),
      approved: trend(approved, total),
      completed: trend(completed, total),
      rejected: trend(rejected, total),
    },
  };
}

export function buildStatusDistribution(rows = []) {
  const order = [
    ["Submitted", "SUBMITTED"],
    ["Under Review", "UNDER_REVIEW"],
    ["Processing", "PROCESSING"],
    ["Approved", "APPROVED"],
    ["Completed", "COMPLETED"],
    ["Rejected", "REJECTED"],
    ["Draft", "DRAFT"],
    ["Cancelled", "CANCELLED"],
  ];
  return order
    .map(([name, code]) => ({
      name,
      value: countByCode(rows, code),
    }))
    .filter((x) => x.value > 0);
}

export function buildDepartmentPerformance(rows = []) {
  const depts = {};
  for (const r of rows) {
    const name = r.department || "Unknown";
    depts[name] = depts[name] || { total: 0, done: 0 };
    depts[name].total += 1;
    if (r.statusCode === "APPROVED" || r.statusCode === "COMPLETED") depts[name].done += 1;
  }
  return Object.entries(depts).map(([department, v]) => ({
    department,
    rate: v.total ? Math.round((v.done / v.total) * 100) : 0,
    total: v.total,
  }));
}

/** Build monthly submitted/approved/completed counts from requisition timestamps. */
export function buildOverTimeSeries(rows = []) {
  const buckets = new Map();
  for (const r of rows) {
    const raw = r.submitted || r.updated || "";
    if (!raw) continue;
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!buckets.has(key)) buckets.set(key, { month: key, submitted: 0, approved: 0, completed: 0 });
    const b = buckets.get(key);
    if (r.statusCode === "SUBMITTED" || r.submitted) b.submitted += 1;
    if (r.statusCode === "APPROVED") b.approved += 1;
    if (r.statusCode === "COMPLETED") b.completed += 1;
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => v);
}

/** Approximate weekly processing-time placeholder from completed volume (API has no duration field yet). */
export function buildProcessingTimeSeries(rows = []) {
  const closed = rows.filter((r) => ["APPROVED", "COMPLETED", "REJECTED"].includes(r.statusCode) && r.submitted && r.updated);
  if (!closed.length) {
    return [
      { week: "W1", days: 0 },
      { week: "W2", days: 0 },
      { week: "W3", days: 0 },
      { week: "W4", days: 0 },
    ];
  }
  const byWeek = { W1: [], W2: [], W3: [], W4: [] };
  closed.forEach((r, i) => {
    const days = Math.max(0, (new Date(r.updated) - new Date(r.submitted)) / 86_400_000);
    const key = `W${(i % 4) + 1}`;
    byWeek[key].push(days);
  });
  return Object.entries(byWeek).map(([week, vals]) => ({
    week,
    days: vals.length ? Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 10) / 10 : 0,
  }));
}

export function filterRequisitions(rows, { department = "All", status = "All", dateFrom, dateTo, period } = {}) {
  let out = [...rows];
  if (department && department !== "All") {
    out = out.filter((r) => r.department === department);
  }
  if (status && status !== "All") {
    const code =
      Object.entries(STATUS_CODE_TO_LABEL).find(([, label]) => label === status)?.[0] || status;
    out = out.filter((r) => r.statusCode === code || r.status === status);
  }

  let from = dateFrom || null;
  let to = dateTo || null;
  if (period && !from && !to) {
    // Presentation periods map onto calendar ranges used by staging seed (2026).
    const ranges = {
      "2026-H1": ["2026-01-01", "2026-06-30"],
      "2026-H2": ["2026-07-01", "2026-12-31"],
      "2026-Q3": ["2026-07-01", "2026-09-30"],
      "2026-Q4": ["2026-10-01", "2026-12-31"],
    };
    const r = ranges[period];
    if (r) {
      from = r[0];
      to = r[1];
    }
  }
  if (from) {
    out = out.filter((r) => {
      const raw = r.submitted || r.updated || "";
      return raw && raw.slice(0, 10) >= from;
    });
  }
  if (to) {
    out = out.filter((r) => {
      const raw = r.submitted || r.updated || "";
      return raw && raw.slice(0, 10) <= to;
    });
  }
  return out;
}

export function formatAmount(value) {
  if (value == null || value === "") return "—";
  const n = Number(value);
  if (Number.isNaN(n)) return String(value);
  return `UGX ${n.toLocaleString()}`;
}
