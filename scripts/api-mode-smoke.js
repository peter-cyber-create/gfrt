#!/usr/bin/env node
/**
 * API-mode facade contract smoke — assumes API is up; validates HTTP shapes the UI expects.
 */
const API_BASE = process.env.API_BASE || "http://127.0.0.1:4000";
const EMAIL = process.env.SMOKE_EMAIL || "admin@musooka.local";
const PASSWORD = process.env.SMOKE_PASSWORD || "DevOnly!Pass123";

let cookie = "";

async function api(path, { method = "GET", body } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const setCookie = res.headers.getSetCookie?.() || [];
  if (setCookie.length) cookie = setCookie.map((c) => c.split(";")[0]).join("; ");
  if (res.status === 204) return { status: 204, data: null };
  const payload = await res.json();
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${payload?.error?.message}`);
  return { status: res.status, data: payload.data };
}

function assertField(obj, field) {
  if (!(field in obj)) throw new Error(`Missing field: ${field}`);
}

async function main() {
  console.log(`API contract smoke → ${API_BASE}`);

  await api("/health");
  await api("/ready");

  const login = await api("/api/v1/auth/login", {
    method: "POST",
    body: { email: EMAIL, password: PASSWORD },
  });
  const user = login.data.user;
  assertField(user, "id");
  assertField(user, "email");
  assertField(user, "permissions");
  if (!Array.isArray(user.permissions)) throw new Error("permissions must be array");

  const me = await api("/api/v1/auth/me");
  assertField(me.data.user, "roles");

  const users = await api("/api/v1/users");
  if (!Array.isArray(users.data) || users.data.length === 0) throw new Error("users empty");
  const u = users.data[0];
  assertField(u, "email");
  assertField(u, "status");

  const roles = await api("/api/v1/roles");
  if (!Array.isArray(roles.data)) throw new Error("roles not array");

  const perms = await api("/api/v1/permissions");
  if (!Array.isArray(perms.data)) throw new Error("permissions not array");

  const reqs = await api("/api/v1/requisitions");
  if (!Array.isArray(reqs.data)) throw new Error("requisitions not array");
  if (reqs.data[0]) {
    assertField(reqs.data[0], "status");
    assertField(reqs.data[0], "number");
  }

  const dash = await api("/api/v1/reports/dashboard");
  assertField(dash.data, "total");

  const notes = await api("/api/v1/notifications");
  if (!Array.isArray(notes.data)) throw new Error("notifications not array");

  const audit = await api("/api/v1/audit-logs?limit=5");
  if (!Array.isArray(audit.data)) throw new Error("audit not array");

  await api("/api/v1/auth/logout", { method: "POST" });
  console.log("API contract smoke PASSED");
}

main().catch((err) => {
  console.error("API contract smoke FAILED:", err.message);
  process.exit(1);
});
