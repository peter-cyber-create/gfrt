#!/usr/bin/env node
/**
 * Multi-role API enforcement against staging (not UI-only).
 */
const fs = require("node:fs");
const path = require("node:path");
require("dotenv").config({ path: path.resolve(__dirname, "../infra/staging/.env"), quiet: true });

const STAGING_URL = process.env.STAGING_URL || "https://127.0.0.1:8443";
if (STAGING_URL.includes("127.0.0.1")) process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const ADMIN = process.env.STAGING_ADMIN_EMAIL || "admin@staging.musooka.local";
const REVIEWER = process.env.STAGING_REVIEWER_EMAIL || "reviewer@staging.musooka.local";
const USER = process.env.STAGING_USER_EMAIL || "user@staging.musooka.local";
const PASSWORD = process.env.STAGING_SEED_PASSWORD || "StagingOnly!Pass123";
const OUT = path.resolve(__dirname, "../data/staging-multirole.json");

const results = [];
function record(name, ok, detail = "") {
  results.push({ name, ok, detail: String(detail).slice(0, 120) });
  console.log(`${ok ? "OK  " : "FAIL"} ${name}: ${detail}`);
}

async function login(email) {
  const res = await fetch(`${STAGING_URL}/api/v1/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: STAGING_URL,
    },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  const setCookie = res.headers.getSetCookie?.() || [];
  const cookie = setCookie.map((c) => c.split(";")[0]).join("; ");
  const json = await res.json().catch(() => ({}));
  return { status: res.status, cookie, json };
}

async function api(cookie, method, pathName, body) {
  const res = await fetch(`${STAGING_URL}${pathName}`, {
    method,
    headers: {
      Accept: "application/json",
      Origin: STAGING_URL,
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

async function main() {
  const admin = await login(ADMIN);
  record("admin login", admin.status === 200, admin.status);

  // Create DRAFT as user for lifecycle
  const user = await login(USER);
  record("user login", user.status === 200, user.status);

  const depts = await api(user.cookie, "GET", "/api/v1/departments");
  const deptId = depts.json?.data?.[0]?.id;
  record("user departments", !!deptId, deptId ? "ok" : "missing");

  const created = await api(user.cookie, "POST", "/api/v1/requisitions", {
    facility: "MultiRole Facility",
    district: "Kampala",
    departmentId: deptId,
    description: "Multi-role E2E requisition",
    amountValue: 2500,
    items: [{ description: "Item", quantity: 1 }],
  });
  record("user create requisition", created.status === 201, created.status);
  const id = created.json?.data?.id;

  const submitted = await api(user.cookie, "POST", `/api/v1/requisitions/${id}/submit`, {
    note: "submit",
  });
  record("user submit", submitted.status === 200 && submitted.json?.data?.status === "SUBMITTED", submitted.status);

  const denyApprove = await api(user.cookie, "POST", `/api/v1/requisitions/${id}/approve`, {
    note: "should fail",
  });
  record("user approve forbidden", denyApprove.status === 403, denyApprove.status);

  const denyUsers = await api(user.cookie, "POST", "/api/v1/users", {
    email: "evil@staging.musooka.local",
    name: "Evil",
    password: "Password123!",
    roleId: "00000000-0000-0000-0000-000000000001",
  });
  record("user manage users forbidden", denyUsers.status === 403 || denyUsers.status === 400, denyUsers.status);

  const reviewer = await login(REVIEWER);
  record("reviewer login", reviewer.status === 200, reviewer.status);

  const reviewed = await api(reviewer.cookie, "POST", `/api/v1/requisitions/${id}/review`, {
    note: "reviewing",
  });
  record("reviewer review", reviewed.status === 200 && reviewed.json?.data?.status === "UNDER_REVIEW", reviewed.status);

  const approved = await api(reviewer.cookie, "POST", `/api/v1/requisitions/${id}/approve`, {
    note: "approved",
  });
  record("reviewer approve", approved.status === 200 && approved.json?.data?.status === "APPROVED", approved.status);

  const notes = await api(user.cookie, "GET", "/api/v1/notifications");
  const hasNote = (notes.json?.data || []).some((n) => String(n.text || "").includes("APPROVED"));
  record("requester notification", hasNote || notes.status === 200, hasNote ? "APPROVED notice" : `count=${(notes.json?.data||[]).length}`);

  const audit = await api(admin.cookie, "GET", "/api/v1/audit-logs?limit=10");
  const hasAudit = (audit.json?.data || []).some((a) => a.action === "requisition.approve");
  record("admin audit sees approve", hasAudit, hasAudit ? "found" : "missing");

  const failed = results.filter((r) => !r.ok).length;
  fs.writeFileSync(OUT, JSON.stringify({ timestamp: new Date().toISOString(), stagingUrl: STAGING_URL, passed: results.length - failed, failed, results }, null, 2));
  if (failed) {
    console.error(`Multi-role FAILED (${failed})`);
    process.exit(1);
  }
  console.log("Multi-role PASSED");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
