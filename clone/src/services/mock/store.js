/**
 * Mutable in-memory store for mock services.
 * Cloned from static seed data so UI mutations stay local.
 */
import {
  activities,
  auditLogs,
  chartSeries,
  notifications,
  reportCatalog,
  requisitions as seedRequisitions,
  roles as seedRoles,
  users as seedUsers,
} from "../../data/mock.js";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function seedSnapshot() {
  return {
    users: clone(seedUsers),
    roles: clone(seedRoles),
    requisitions: clone(seedRequisitions),
    notifications: clone(notifications),
    reports: clone(reportCatalog),
    activities: clone(activities),
    auditLogs: clone(auditLogs),
    chartSeries: clone(chartSeries),
    preferences: {
      density: "comfortable",
      emailDigest: true,
      inAppNotifications: true,
    },
  };
}

export const store = seedSnapshot();

/** Restore initial presentation dataset (local only). */
export function resetDemoData() {
  const next = seedSnapshot();
  Object.keys(next).forEach((key) => {
    store[key] = next[key];
  });
  pushAudit({
    user: "system",
    action: "demo.reset",
    entity: "store",
    entityId: "local",
    metadata: { at: new Date().toISOString() },
  });
  return store;
}

/** Derive KPIs from current requisition rows so dashboard reconciles with data. */
export function computeMetricsFromRequisitions(rows = store.requisitions) {
  const count = (code) => rows.filter((r) => (r.statusCode || r.status) === code || r.status === code).length;
  const byCode = (code) => rows.filter((r) => r.statusCode === code).length;

  const total = rows.length;
  const submitted = byCode("SUBMITTED");
  const underReview = byCode("UNDER_REVIEW");
  const approved = byCode("APPROVED");
  const completed = byCode("COMPLETED");
  const rejected = byCode("REJECTED");
  const processing = byCode("PROCESSING");
  const draft = byCode("DRAFT");
  const pendingWorkload = submitted + underReview + processing;

  const closed = approved + completed + rejected;
  const approvalRate = closed ? Math.round((approved / closed) * 1000) / 10 : 0;
  const completionRate = total ? Math.round((completed / total) * 1000) / 10 : 0;
  const performanceRate = total ? Math.round(((approved + completed) / total) * 1000) / 10 : 0;

  return {
    total,
    draft,
    submitted,
    pending: processing, // legacy key used by older KPI cards
    underReview,
    processing,
    approved,
    completed,
    rejected,
    pendingWorkload,
    avgProcessingDays: 6.4,
    approvalRate,
    completionRate,
    performanceRate,
    trends: {
      total: { value: 4.2, direction: "up" },
      pending: { value: 1.1, direction: "down" },
      underReview: { value: 0.8, direction: "up" },
      approved: { value: 3.8, direction: "up" },
      completed: { value: 2.4, direction: "up" },
      rejected: { value: 0.5, direction: "down" },
      avgProcessingDays: { value: 0.6, direction: "down" },
      performanceRate: { value: 1.5, direction: "up" },
    },
  };
}

export function buildStatusDistribution(rows = store.requisitions) {
  const order = [
    ["Submitted", "SUBMITTED"],
    ["Under Review", "UNDER_REVIEW"],
    ["Processing", "PROCESSING"],
    ["Approved", "APPROVED"],
    ["Completed", "COMPLETED"],
    ["Rejected", "REJECTED"],
  ];
  return order
    .map(([name, code]) => ({
      name,
      value: rows.filter((r) => r.statusCode === code).length,
    }))
    .filter((x) => x.value > 0);
}

export function buildDepartmentPerformance(rows = store.requisitions) {
  const depts = {};
  for (const r of rows) {
    depts[r.department] = depts[r.department] || { total: 0, done: 0 };
    depts[r.department].total += 1;
    if (r.statusCode === "APPROVED" || r.statusCode === "COMPLETED") depts[r.department].done += 1;
  }
  return Object.entries(depts).map(([department, v]) => ({
    department,
    rate: v.total ? Math.round((v.done / v.total) * 100) : 0,
    total: v.total,
  }));
}

export function pushAudit({ user, action, entity, entityId, metadata = {} }) {
  const entry = {
    id: `AUD-${String(store.auditLogs.length + 1).padStart(2, "0")}`,
    user: user || "system",
    action,
    entity,
    entityId: String(entityId),
    timestamp: new Date().toISOString().replace("T", " ").slice(0, 16),
    metadata,
  };
  store.auditLogs.unshift(entry);
  return entry;
}

export function pushNotification(text, { unread = true } = {}) {
  const n = {
    id: `N-${Date.now()}`,
    text,
    unread,
    time: "just now",
  };
  store.notifications.unshift(n);
  return n;
}
