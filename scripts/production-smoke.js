#!/usr/bin/env node
/**
 * Non-destructive production-candidate smoke test.
 *
 * Requires explicit BASE_URL. Does NOT default to musooka.site.
 * Refuses legacy hosts musooka.site / www.musooka.site unless
 * ALLOW_LEGACY_HOST=1 is set (still read-oriented; prefer dedicated candidate).
 *
 * Optional credentials (for authenticated checks):
 *   SMOKE_EMAIL / SMOKE_PASSWORD
 *
 * Usage:
 *   BASE_URL=https://staging.example npm run production:smoke
 *   BASE_URL=https://127.0.0.1:8443 SMOKE_EMAIL=... SMOKE_PASSWORD=... npm run production:smoke
 */
const fs = require("node:fs");
const path = require("node:path");
const https = require("node:https");

const results = [];
let cookie = "";

function record(name, ok, detail = "") {
  results.push({ name, ok, detail: String(detail).slice(0, 160) });
  console.log(`${ok ? "OK  " : "FAIL"} ${name}${detail ? `: ${detail}` : ""}`);
}

function requireBaseUrl() {
  const base = (process.env.BASE_URL || "").replace(/\/$/, "");
  if (!base) {
    console.error("FAIL  BASE_URL is required (no default). Example: BASE_URL=https://candidate.example npm run production:smoke");
    process.exit(2);
  }
  let host = "";
  try {
    host = new URL(base).hostname;
  } catch {
    console.error("FAIL  BASE_URL is not a valid URL");
    process.exit(2);
  }
  if ((host === "musooka.site" || host === "www.musooka.site") && process.env.ALLOW_LEGACY_HOST !== "1") {
    console.error("FAIL  Refusing musooka.site (legacy production). Use a candidate URL, or set ALLOW_LEGACY_HOST=1 only with explicit approval.");
    process.exit(2);
  }
  if (base.startsWith("https://") && /127\.0\.0\.1|localhost/.test(host)) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  }
  return base;
}

async function req(base, p, { method = "GET", body, headers } = {}) {
  const url = `${base}${p}`;
  const init = {
    method,
    headers: {
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
      Origin: base,
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
    redirect: "manual",
  };
  if (url.startsWith("https:")) {
    init.agent = new https.Agent({ rejectUnauthorized: process.env.NODE_TLS_REJECT_UNAUTHORIZED !== "0" ? true : false });
  }
  const res = await fetch(url, init);
  const setCookie = res.headers.getSetCookie?.() || [];
  if (setCookie.length) cookie = setCookie.map((c) => c.split(";")[0]).join("; ");
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { status: res.status, headers: res.headers, json, text };
}

async function main() {
  const base = requireBaseUrl();
  console.log(`Production smoke → ${base}`);

  // HTTPS / connectivity
  try {
    const u = new URL(base);
    record("HTTPS scheme", u.protocol === "https:", u.protocol);
  } catch (e) {
    record("HTTPS scheme", false, e.message);
  }

  const health = await req(base, "/health");
  record("health", health.status === 200 && health.json?.status === "ok", health.status);

  const ready = await req(base, "/ready");
  record("ready", ready.status === 200 && ready.json?.database === true, ready.status);

  // Security headers (from a document response when possible)
  const home = await req(base, "/login");
  const hsts = home.headers.get("strict-transport-security");
  const xcto = home.headers.get("x-content-type-options");
  const xfo = home.headers.get("x-frame-options");
  record("security headers", !!(hsts || xcto || xfo), `hsts=${!!hsts} xcto=${xcto || "-"} xfo=${xfo || "-"}`);

  const email = process.env.SMOKE_EMAIL;
  const password = process.env.SMOKE_PASSWORD;
  if (!email || !password) {
    record("authenticated checks", true, "SKIPPED (set SMOKE_EMAIL and SMOKE_PASSWORD to enable)");
  } else {
    cookie = "";
    const login = await req(base, "/api/v1/auth/login", {
      method: "POST",
      body: { email, password },
    });
    record("login", login.status === 200 && !!login.json?.data?.user, login.status);
    const setCookie = login.headers.get("set-cookie") || "";
    record(
      "session cookie flags",
      /httponly/i.test(setCookie) && (/;\s*secure/i.test(setCookie) || base.includes("127.0.0.1")),
      "flags checked (value redacted)"
    );

    const me = await req(base, "/api/v1/auth/me");
    record("me", me.status === 200 && me.json?.data?.user?.email === email, me.status);

    const dash = await req(base, "/api/v1/reports/dashboard");
    record("dashboard", dash.status === 200 && typeof dash.json?.data?.total === "number", dash.status);

    const list = await req(base, "/api/v1/requisitions");
    record("requisition list", list.status === 200 && Array.isArray(list.json?.data), list.status);

    const first = list.json?.data?.[0];
    if (first?.id) {
      const detail = await req(base, `/api/v1/requisitions/${first.id}`);
      record("requisition detail", detail.status === 200, detail.status);
    } else {
      record("requisition detail", true, "SKIPPED (empty list)");
    }

    const notes = await req(base, "/api/v1/notifications");
    record("notifications", notes.status === 200 && Array.isArray(notes.json?.data), notes.status);

    const audit = await req(base, "/api/v1/audit-logs?limit=5");
    record(
      "audit availability",
      audit.status === 200 || audit.status === 403,
      `${audit.status} (200 if permitted, 403 if role lacks audit.view)`
    );

    // Authorization boundary: unauthenticated approve must fail
    const saved = cookie;
    cookie = "";
    const unauth = await req(base, `/api/v1/requisitions/${first?.id || "00000000-0000-0000-0000-000000000001"}/approve`, {
      method: "POST",
      body: { note: "smoke" },
    });
    record("authz unauthenticated deny", unauth.status === 401 || unauth.status === 403 || unauth.status === 400, unauth.status);
    cookie = saved;

    const logout = await req(base, "/api/v1/auth/logout", { method: "POST" });
    record("logout", logout.status === 204 || logout.status === 200, logout.status);
    const meAfter = await req(base, "/api/v1/auth/me");
    record("session cleared", meAfter.status === 401, meAfter.status);

    // Password reset request — non-destructive (always 200-shaped)
    const reset = await req(base, "/api/v1/auth/password-reset/request", {
      method: "POST",
      body: { email },
    });
    record("password reset request", reset.status === 200, reset.status);
  }

  const failed = results.filter((r) => !r.ok).length;
  const out = {
    timestamp: new Date().toISOString(),
    baseUrl: base,
    passed: results.length - failed,
    failed,
    results,
  };
  const outPath = path.resolve(__dirname, "../data/production-smoke-report.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log(`Wrote ${outPath}`);
  if (failed) {
    console.error(`\nProduction smoke FAILED (${failed})`);
    process.exit(1);
  }
  console.log("\nProduction smoke PASSED");
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
