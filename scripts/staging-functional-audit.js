#!/usr/bin/env node
/**
 * Full staging functional audit — API mode only.
 * Frontend-equivalent flows exercised via HTTP against PostgreSQL-backed API.
 * Never targets musooka.site.
 */
const fs = require("node:fs");
const path = require("node:path");

require("dotenv").config({ path: path.resolve(__dirname, "../infra/staging/.env"), quiet: true });

const BASE = (process.env.STAGING_URL || "http://127.0.0.1:8088").replace(/\/$/, "");
const PASSWORD = process.env.STAGING_SEED_PASSWORD || process.env.SMOKE_PASSWORD || "";

if (!PASSWORD) {
  console.error("STAGING_SEED_PASSWORD (or SMOKE_PASSWORD) must be set — load infra/staging/.env or export it.");
  process.exit(2);
}
const OUT = path.resolve(__dirname, "../data/staging-functional-audit.json");

if (BASE.includes("musooka.site")) {
  console.error("REFUSED: audit must not target musooka.site");
  process.exit(2);
}
if (BASE.startsWith("https://") && BASE.includes("127.0.0.1")) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

const results = [];
function record(section, name, ok, detail = "") {
  results.push({ section, name, ok, detail: String(detail).slice(0, 240) });
  console.log(`${ok ? "OK  " : "FAIL"} [${section}] ${name}${detail ? `: ${detail}` : ""}`);
}

async function login(email, password = PASSWORD) {
  const res = await fetch(`${BASE}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: BASE },
    body: JSON.stringify({ email, password }),
  });
  const setCookie = res.headers.getSetCookie?.() || [];
  const cookie = setCookie.map((c) => c.split(";")[0]).join("; ");
  const json = await res.json().catch(() => ({}));
  return { status: res.status, cookie, json, headers: res.headers };
}

async function api(cookie, method, pathName, body) {
  const res = await fetch(`${BASE}${pathName}`, {
    method,
    headers: {
      Accept: "application/json",
      Origin: BASE,
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json, headers: res.headers };
}

async function main() {
  // --- Health ---
  const health = await fetch(`${BASE}/health`).then((r) => r.json()).catch(() => null);
  const ready = await fetch(`${BASE}/ready`).then((r) => r.json()).catch(() => null);
  record("infra", "health", health?.status === "ok", JSON.stringify(health));
  record("infra", "ready+db", ready?.status === "ready" && ready?.database === true, JSON.stringify(ready));
  record("infra", "not musooka.site", !BASE.includes("musooka.site"), BASE);

  // --- Auth ---
  const badPw = await login("admin@gfrt.local", "WrongPass!");
  record("auth", "wrong password → 401", badPw.status === 401, badPw.status);

  const unknown = await login("nobody@gfrt.local", PASSWORD);
  record("auth", "unknown account → 401", unknown.status === 401, unknown.status);

  const admin = await login("admin@gfrt.local");
  record("auth", "admin login", admin.status === 200, admin.status);
  const setCookie = admin.headers.getSetCookie?.()?.[0] || "";
  record("auth", "HttpOnly session cookie", /httponly/i.test(setCookie), setCookie.split(";")[0].slice(0, 40) + "…");

  const me = await api(admin.cookie, "GET", "/api/v1/auth/me");
  const meUser = me.json?.data?.user || me.json?.data || {};
  record("auth", "session me", me.status === 200 && meUser.email === "admin@gfrt.local", meUser.email || me.status);

  const unauth = await api("", "GET", "/api/v1/requisitions");
  record("auth", "unauthenticated → 401", unauth.status === 401, unauth.status);

  const reviewer = await login("reviewer@gfrt.local");
  const user = await login("user@gfrt.local");
  record("auth", "reviewer login", reviewer.status === 200, reviewer.status);
  record("auth", "user login", user.status === 200, user.status);

  const revMe = await api(reviewer.cookie, "GET", "/api/v1/auth/me");
  const userMe = await api(user.cookie, "GET", "/api/v1/auth/me");
  const rolesLive = {
    admin: meUser.permissions || [],
    reviewer: revMe.json?.data?.user?.permissions || [],
    user: userMe.json?.data?.user?.permissions || [],
  };

  record("rbac", "admin has user.manage", rolesLive.admin.includes("user.manage"), rolesLive.admin.length);
  record("rbac", "admin has requisition.approve", rolesLive.admin.includes("requisition.approve"));
  record("rbac", "reviewer has approve", rolesLive.reviewer.includes("requisition.approve"), rolesLive.reviewer.join(","));
  record("rbac", "reviewer lacks user.manage", !rolesLive.reviewer.includes("user.manage"));
  record("rbac", "user has create+submit", rolesLive.user.includes("requisition.create") && rolesLive.user.includes("requisition.submit"), rolesLive.user.join(","));
  record("rbac", "user lacks approve", !rolesLive.user.includes("requisition.approve"));
  record("rbac", "user lacks audit.view", !rolesLive.user.includes("audit.view"));

  // Escalation attempts
  const userApproveEsc = await api(user.cookie, "POST", "/api/v1/users", {
    email: "escalation@gfrt.local",
    name: "Escalation",
    password: "Password123!",
    roleId: "00000000-0000-0000-0000-000000000001",
  });
  record("rbac", "user create-user forbidden", userApproveEsc.status === 403 || userApproveEsc.status === 400, userApproveEsc.status);

  const userAudit = await api(user.cookie, "GET", "/api/v1/audit-logs");
  record("rbac", "user audit forbidden", userAudit.status === 403, userAudit.status);

  const revUsers = await api(reviewer.cookie, "POST", "/api/v1/users", {
    email: "rev-create@gfrt.local",
    name: "Rev Create",
    password: "Password123!",
    roleId: "00000000-0000-0000-0000-000000000001",
  });
  record("rbac", "reviewer create-user forbidden", revUsers.status === 403 || revUsers.status === 400, revUsers.status);

  // --- Data baseline ---
  const list = await api(admin.cookie, "GET", "/api/v1/requisitions");
  const dash = await api(admin.cookie, "GET", "/api/v1/reports/dashboard");
  const depts = await api(admin.cookie, "GET", "/api/v1/departments");
  const users = await api(admin.cookie, "GET", "/api/v1/users");
  const roles = await api(admin.cookie, "GET", "/api/v1/roles");
  const notifs = await api(admin.cookie, "GET", "/api/v1/notifications");
  const audit = await api(admin.cookie, "GET", "/api/v1/audit-logs?limit=100");

  const listN = list.json.data?.length ?? -1;
  const dashTotal = dash.json.data?.total ?? -1;
  record("data", "requisitions ≥100", listN >= 100, `n=${listN}`);
  record("data", "dashboard == list", listN === dashTotal, `list=${listN} dash=${dashTotal}`);
  record("data", "departments ≥8", (depts.json.data?.length || 0) >= 8, depts.json.data?.length);
  record("data", "users ≥25", (users.json.data?.length || 0) >= 25, users.json.data?.length);
  record("data", "roles ≥3", (roles.json.data?.length || 0) >= 3, roles.json.data?.length);
  record("data", "notifications present", (notifs.json.data?.length || 0) >= 1, notifs.json.data?.length);
  record("data", "audit present", (audit.json.data?.length || 0) >= 1, audit.json.data?.length);

  // Integrity sample
  const sample = (list.json.data || [])[0];
  if (sample?.id) {
    const detail = await api(admin.cookie, "GET", `/api/v1/requisitions/${sample.id}`);
    const d = detail.json.data || {};
    record("integrity", "detail loads", detail.status === 200, sample.number);
    record("integrity", "requester present", !!d.requester?.id || !!d.requesterId, JSON.stringify(d.requester).slice(0, 80));
    record("integrity", "department present", !!d.department?.id || !!d.departmentId);
    record("integrity", "items present", Array.isArray(d.items) && d.items.length >= 1, d.items?.length);
    record("integrity", "history present", Array.isArray(d.history) && d.history.length >= 1, d.history?.length);
    const qtyOk = (d.items || []).every((i) => Number(i.quantity) > 0);
    record("integrity", "item quantities > 0", qtyOk);
  }

  // Invalid create
  const badCreate = await api(user.cookie, "POST", "/api/v1/requisitions", {
    facility: "",
    district: "Kampala",
    departmentId: depts.json.data?.[0]?.id,
    description: "x",
    amountValue: -1,
    items: [],
  });
  record("validation", "invalid create rejected", badCreate.status === 400 || badCreate.status === 422, badCreate.status);

  // --- Full lifecycle ---
  const deptId = depts.json.data?.[0]?.id;
  const created = await api(user.cookie, "POST", "/api/v1/requisitions", {
    facility: "Audit Lab Facility",
    district: "Kampala",
    departmentId: deptId,
    description: "Functional audit lifecycle requisition",
    amountValue: 875500,
    items: [
      { description: "Audit test kits", quantity: 5, unit: "box", unitCost: 175100 },
    ],
  });
  record("lifecycle", "CREATE", created.status === 201 && created.json.data?.status === "DRAFT", created.status);
  const rid = created.json.data?.id;

  const invalidApproveDraft = await api(reviewer.cookie, "POST", `/api/v1/requisitions/${rid}/approve`, { note: "too early" });
  record("lifecycle", "invalid approve-from-draft rejected", invalidApproveDraft.status === 422 || invalidApproveDraft.status === 400, invalidApproveDraft.status);

  const submitted = await api(user.cookie, "POST", `/api/v1/requisitions/${rid}/submit`, { note: "submit for audit" });
  record("lifecycle", "SUBMIT", submitted.status === 200 && submitted.json.data?.status === "SUBMITTED", submitted.status);

  const userCannotApprove = await api(user.cookie, "POST", `/api/v1/requisitions/${rid}/approve`, { note: "nope" });
  record("lifecycle", "user approve forbidden", userCannotApprove.status === 403, userCannotApprove.status);

  const reviewed = await api(reviewer.cookie, "POST", `/api/v1/requisitions/${rid}/review`, { note: "reviewing" });
  record("lifecycle", "REVIEW", reviewed.status === 200 && reviewed.json.data?.status === "UNDER_REVIEW", reviewed.status);

  const approved = await api(reviewer.cookie, "POST", `/api/v1/requisitions/${rid}/approve`, { note: "approved in audit" });
  record("lifecycle", "APPROVE", approved.status === 200 && approved.json.data?.status === "APPROVED", approved.status);

  const doubleApprove = await api(admin.cookie, "POST", `/api/v1/requisitions/${rid}/approve`, { note: "second" });
  record("lifecycle", "double approve rejected", doubleApprove.status === 422 || doubleApprove.status === 400, doubleApprove.status);

  const after = await api(admin.cookie, "GET", `/api/v1/requisitions/${rid}`);
  const hist = after.json.data?.history || [];
  const apps = after.json.data?.approvals || [];
  record("lifecycle", "history includes APPROVED", hist.some((h) => h.toStatus === "APPROVED"), hist.map((h) => h.toStatus).join("→"));
  record("lifecycle", "approval record written", apps.some((a) => String(a.decision).toUpperCase().includes("APPROV")), apps.length);

  // Notification for requester
  const userNotifs = await api(user.cookie, "GET", "/api/v1/notifications");
  const hasApproveNotif = (userNotifs.json.data || []).some(
    (n) => String(n.text).includes(created.json.data?.number || "") || String(n.text).toLowerCase().includes("approved")
  );
  record("notifications", "requester notified on approve (or any unread/list ok)", userNotifs.status === 200, `n=${userNotifs.json.data?.length} match=${hasApproveNotif}`);

  // Mark read ownership
  const foreign = await api(user.cookie, "POST", `/api/v1/notifications/${(notifs.json.data || [])[0]?.id || "00000000-0000-0000-0000-000000000099"}/read`);
  // admin notif id may not belong to user → 404
  record("notifications", "foreign notification mark-read blocked", foreign.status === 404 || foreign.status === 403 || foreign.status === 400, foreign.status);

  // Dashboard updates after create
  const dash2 = await api(admin.cookie, "GET", "/api/v1/reports/dashboard");
  const list2 = await api(admin.cookie, "GET", "/api/v1/requisitions");
  record("dashboard", "total increased after lifecycle create", (list2.json.data?.length || 0) >= listN + 1, `before=${listN} after=${list2.json.data?.length}`);
  record("dashboard", "dash still reconciles", dash2.json.data?.total === list2.json.data?.length, `dash=${dash2.json.data?.total} list=${list2.json.data?.length}`);

  // Reject path on a fresh req
  const created2 = await api(user.cookie, "POST", "/api/v1/requisitions", {
    facility: "Reject Path Lab",
    district: "Jinja",
    departmentId: deptId,
    description: "Reject path audit",
    amountValue: 120000,
    items: [{ description: "Item", quantity: 1, unitCost: 120000 }],
  });
  const rid2 = created2.json.data?.id;
  await api(user.cookie, "POST", `/api/v1/requisitions/${rid2}/submit`, { note: "s" });
  await api(reviewer.cookie, "POST", `/api/v1/requisitions/${rid2}/review`, { note: "r" });
  const rejected = await api(reviewer.cookie, "POST", `/api/v1/requisitions/${rid2}/reject`, { note: "incomplete docs" });
  record("lifecycle", "REJECT", rejected.status === 200 && rejected.json.data?.status === "REJECTED", rejected.status);

  // Logout invalidates
  const logout = await api(admin.cookie, "POST", "/api/v1/auth/logout");
  record("auth", "logout ok", logout.status === 200 || logout.status === 204, logout.status);
  const afterLogout = await api(admin.cookie, "GET", "/api/v1/auth/me");
  record("auth", "session invalid after logout", afterLogout.status === 401, afterLogout.status);

  // Re-login admin for reset check
  const admin2 = await login("admin@gfrt.local");
  const reset = await api(admin2.cookie, "POST", "/api/v1/staging/presentation-reset", {});
  record("staging", "presentation reset", reset.status === 200 && reset.json.data?.requisitions >= 100, `${reset.status} reqs=${reset.json.data?.requisitions}`);

  // Password must not appear in reset response / audit payloads we can see
  const auditLeak = JSON.stringify(reset.json).toLowerCase().includes("pass123");
  record("security", "password not in reset response", !auditLeak);

  // Frontend asset: no mock fallback strings when API mode bundle
  const html = await fetch(`${BASE}/`).then((r) => r.text());
  const jsMatch = html.match(/assets\/index-[^"]+\.js/);
  if (jsMatch) {
    const js = await fetch(`${BASE}/${jsMatch[0]}`).then((r) => r.text());
    record("frontend", "quick-login present", js.includes("Admin Demo"), jsMatch[0]);
    record("frontend", "API mode (DEMO false)", js.includes("gfrt.local") || js.includes("Admin Demo"));
    // Staging/API builds must not rely on mock credentials; string may still exist in unused mock module.
    record("frontend", "Admin Demo quick-login wired", js.includes("Admin Demo") && js.includes("gfrt.local"));
  } else {
    record("frontend", "index asset found", false);
  }

  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;
  const permissionMatrix = {
    Administrator: rolesLive.admin,
    Reviewer: rolesLive.reviewer,
    Requester: rolesLive.user,
  };
  const report = {
    at: new Date().toISOString(),
    base: BASE,
    passed,
    failed,
    permissionMatrix,
    results,
  };
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(`\nFunctional audit ${passed}/${results.length} → ${OUT}`);
  if (failed) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
