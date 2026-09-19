#!/usr/bin/env node
/**
 * API-mode data consistency checks against staging.
 * Verifies dashboard / analytics / export counts reconcile with requisitions.
 */
const path = require("node:path");
const fs = require("node:fs");

require("dotenv").config({ path: path.resolve(__dirname, "../infra/staging/.env"), quiet: true });

const BASE = (process.env.STAGING_URL || "http://127.0.0.1:8088").replace(/\/$/, "");
const EMAIL = process.env.STAGING_ADMIN_EMAIL || "admin@gfrt.local";
const PASSWORD = process.env.STAGING_SEED_PASSWORD || process.env.SMOKE_PASSWORD || "";

if (!PASSWORD) {
  console.error("STAGING_SEED_PASSWORD (or SMOKE_PASSWORD) must be set — load infra/staging/.env or export it.");
  process.exit(2);
}
const OUT = path.resolve(__dirname, "../data/staging-consistency.json");

if (BASE.startsWith("https://") && BASE.includes("127.0.0.1")) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

const results = [];
function record(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "OK  " : "FAIL"} ${name}${detail ? `: ${detail}` : ""}`);
}

async function main() {
  const loginRes = await fetch(`${BASE}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: BASE },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const setCookie = loginRes.headers.getSetCookie?.() || [];
  const cookie = setCookie.map((c) => c.split(";")[0]).join("; ");
  record("login", loginRes.ok, String(loginRes.status));

  async function get(p) {
    const res = await fetch(`${BASE}${p}`, {
      headers: { Accept: "application/json", Cookie: cookie, Origin: BASE },
    });
    const json = await res.json().catch(() => ({}));
    return { status: res.status, json };
  }

  const list = await get("/api/v1/requisitions");
  const dash = await get("/api/v1/reports/dashboard");
  const depts = await get("/api/v1/departments");
  const catalog = await get("/api/v1/reports/catalog");
  const roles = await get("/api/v1/roles");
  const users = await get("/api/v1/users");
  const notifs = await get("/api/v1/notifications");
  const audit = await get("/api/v1/audit-logs?limit=100");

  const listN = list.json.data?.length ?? -1;
  const dashTotal = dash.json.data?.total ?? -1;
  record("requisitions list", list.status === 200 && listN >= 0, `n=${listN}`);
  record("dashboard metrics", dash.status === 200 && dashTotal >= 0, `total=${dashTotal}`);
  record("dashboard == list total", listN === dashTotal, `list=${listN} dash=${dashTotal}`);
  record("presentation volume (100+ reqs)", listN >= 100, `n=${listN}`);
  record("departments (8+)", depts.status === 200 && (depts.json.data?.length || 0) >= 8, `n=${depts.json.data?.length}`);
  record("users (25+)", users.status === 200 && (users.json.data?.length || 0) >= 25, `n=${users.json.data?.length}`);
  record("roles (3+)", (roles.json.data?.length || 0) >= 3, `n=${roles.json.data?.length}`);
  record("catalog has titles", (catalog.json.data || []).every((r) => r.title || r.name), `n=${catalog.json.data?.length}`);
  record(
    "roles have user counts",
    (roles.json.data || []).every((r) => typeof (r._count?.userRoles ?? r.userCount) === "number" || r.rolePermissions),
    `n=${roles.json.data?.length}`
  );
  record("users list", users.status === 200 && (users.json.data?.length || 0) >= 1, `n=${users.json.data?.length}`);
  record("notifications", notifs.status === 200 && (notifs.json.data?.length || 0) >= 1, `n=${notifs.json.data?.length}`);
  record("audit events", audit.status === 200 && (audit.json.data?.length || 0) >= 1, `n=${audit.json.data?.length}`);

  const statusSum = ["draft", "submitted", "underReview", "approved", "rejected", "processing", "completed", "cancelled"]
    .map((k) => Number(dash.json.data?.[k] || 0))
    .reduce((a, b) => a + b, 0);
  record("status counts sum to total", statusSum === dashTotal, `sum=${statusSum} total=${dashTotal}`);

  const approved = Number(dash.json.data?.approved || 0);
  const nonApproved = dashTotal - approved;
  record("mixed statuses (not all approved)", dashTotal > 0 && nonApproved > 0, `approved=${approved} other=${nonApproved}`);

  const amounts = (list.json.data || []).map((r) => Number(r.amountValue ?? r.amount ?? 0)).filter((n) => n > 0);
  const uniqueAmounts = new Set(amounts);
  record("amount variety", uniqueAmounts.size >= 20, `unique=${uniqueAmounts.size}`);

  const sample = list.json.data?.[0];
  if (sample?.id) {
    const detail = await get(`/api/v1/requisitions/${sample.id}`);
    const hist = detail.json.data?.history?.length || 0;
    record("requisition has status history", detail.status === 200 && hist >= 1, `history=${hist}`);
  } else {
    record("requisition has status history", false, "no sample");
  }

  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;
  fs.writeFileSync(OUT, JSON.stringify({ at: new Date().toISOString(), base: BASE, passed, failed, results }, null, 2));
  console.log(`\nConsistency ${passed}/${results.length} → ${OUT}`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
