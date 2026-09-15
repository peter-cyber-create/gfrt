#!/usr/bin/env node
/**
 * Staging smoke — assumes API is running. Does not deploy or touch production.
 * Uses dedicated non-production accounts only.
 */
const API_BASE = process.env.API_BASE || "http://127.0.0.1:4000";
const ADMIN_EMAIL = process.env.SMOKE_ADMIN_EMAIL || "admin@musooka.local";
const REVIEWER_EMAIL = process.env.SMOKE_REVIEWER_EMAIL || "reviewer@musooka.local";
const USER_EMAIL = process.env.SMOKE_USER_EMAIL || "user@musooka.local";
const PASSWORD = process.env.SMOKE_PASSWORD || "DevOnly!Pass123";

let cookie = "";
let failures = 0;

async function req(path, { method = "GET", body } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const setCookie = res.headers.getSetCookie?.() || [];
  if (setCookie.length) {
    cookie = setCookie.map((c) => c.split(";")[0]).join("; ");
  }
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  return { status: res.status, json };
}

function assert(name, ok, detail = "") {
  if (!ok) {
    console.error(`FAIL ${name}${detail ? `: ${detail}` : ""}`);
    failures += 1;
    return false;
  }
  console.log(`OK   ${name}`);
  return true;
}

async function login(email) {
  cookie = "";
  return req("/api/v1/auth/login", {
    method: "POST",
    body: { email, password: PASSWORD },
  });
}

async function main() {
  console.log(`Smoke against ${API_BASE}`);

  const health = await req("/health");
  assert("health", health.status === 200 && health.json?.status === "ok");

  const ready = await req("/ready");
  assert("ready", ready.status === 200 && ready.json?.database === true);

  const adminLogin = await login(ADMIN_EMAIL);
  assert("admin login", adminLogin.status === 200, String(adminLogin.status));

  const me = await req("/api/v1/auth/me");
  assert("admin me", me.status === 200 && me.json?.data?.user?.email === ADMIN_EMAIL);

  const dashboard = await req("/api/v1/reports/dashboard");
  assert("dashboard", dashboard.status === 200 && typeof dashboard.json?.data?.total === "number");

  const requisitions = await req("/api/v1/requisitions");
  assert("requisitions list", requisitions.status === 200 && Array.isArray(requisitions.json?.data));

  const filtered = await req("/api/v1/requisitions?query=REQ&status=UNDER_REVIEW");
  assert("requisitions filter/search", filtered.status === 200 && Array.isArray(filtered.json?.data));

  const first = requisitions.json?.data?.[0];
  if (first) {
    const detail = await req(`/api/v1/requisitions/${first.id}`);
    assert("requisition detail", detail.status === 200 && detail.json?.data?.id === first.id);
  } else {
    console.log("SKIP requisition detail (empty list)");
  }

  const users = await req("/api/v1/users");
  assert("users list", users.status === 200 && Array.isArray(users.json?.data));

  const roles = await req("/api/v1/roles");
  assert("roles list", roles.status === 200 && Array.isArray(roles.json?.data));

  const notes = await req("/api/v1/notifications");
  assert("notifications", notes.status === 200 && Array.isArray(notes.json?.data));

  const audit = await req("/api/v1/audit-logs?limit=5");
  assert("audit logs", audit.status === 200 && Array.isArray(audit.json?.data));

  // Unauthorized transition
  await login(USER_EMAIL);
  assert("user login", true);
  const underReview =
    filtered.json?.data?.[0] ||
    requisitions.json?.data?.find((r) => r.status === "UNDER_REVIEW");
  if (underReview) {
    const deny = await req(`/api/v1/requisitions/${underReview.id}/approve`, {
      method: "POST",
      body: { note: "smoke deny" },
    });
    assert("unauthorized transition denied", deny.status === 403);
  } else {
    console.log("SKIP unauthorized transition (no UNDER_REVIEW)");
  }

  // Authorized lifecycle: create draft as requester → submit → review → approve as reviewer
  await login(USER_EMAIL);
  const depts = await req("/api/v1/departments");
  const deptId = depts.json?.data?.[0]?.id;
  if (deptId) {
    const created = await req("/api/v1/requisitions", {
      method: "POST",
      body: {
        facility: "Smoke Facility",
        district: "Smoke District",
        departmentId: deptId,
        description: "Staging smoke requisition",
        amountValue: 1000,
        items: [{ description: "Smoke item", quantity: 1 }],
      },
    });
    assert("create requisition", created.status === 201, String(created.status));
    const newId = created.json?.data?.id;
    if (newId) {
      const submitted = await req(`/api/v1/requisitions/${newId}/submit`, {
        method: "POST",
        body: { note: "smoke submit" },
      });
      assert("authorized submit", submitted.status === 200 && submitted.json?.data?.status === "SUBMITTED");

      await login(REVIEWER_EMAIL);
      const reviewed = await req(`/api/v1/requisitions/${newId}/review`, {
        method: "POST",
        body: { note: "smoke review" },
      });
      assert("authorized review", reviewed.status === 200 && reviewed.json?.data?.status === "UNDER_REVIEW");

      const approved = await req(`/api/v1/requisitions/${newId}/approve`, {
        method: "POST",
        body: { note: "smoke approve" },
      });
      assert("authorized approve", approved.status === 200 && approved.json?.data?.status === "APPROVED");
    }
  } else {
    console.log("SKIP lifecycle transitions (no department)");
  }

  const logout = await req("/api/v1/auth/logout", { method: "POST" });
  assert("logout", logout.status === 204);

  const meAfter = await req("/api/v1/auth/me");
  assert("me after logout", meAfter.status === 401);

  if (failures) {
    console.error(`\nStaging smoke FAILED (${failures})`);
    process.exit(1);
  }
  console.log("\nStaging smoke PASSED");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
