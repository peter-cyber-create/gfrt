#!/usr/bin/env node
/**
 * Security checks for local staging HTTPS stack.
 */
const fs = require("node:fs");
const path = require("node:path");
const https = require("node:https");

require("dotenv").config({ path: path.resolve(__dirname, "../infra/staging/.env"), quiet: true });

const STAGING_URL = process.env.STAGING_URL || "https://127.0.0.1:8443";
if (STAGING_URL.includes("127.0.0.1")) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}
const ADMIN_EMAIL = process.env.STAGING_ADMIN_EMAIL || "admin@staging.musooka.local";
const PASSWORD = process.env.STAGING_SEED_PASSWORD || "StagingOnly!Pass123";
const OUT = path.resolve(__dirname, "../data/staging-security-check.json");

const agent = new https.Agent({ rejectUnauthorized: false });
const results = [];

function record(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "OK  " : "FAIL"} ${name}${detail ? `: ${detail}` : ""}`);
}

async function fetchUrl(url, opts = {}) {
  const res = await fetch(url, { ...opts, agent, redirect: "manual" });
  const text = await res.text().catch(() => "");
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { res, text, json };
}

async function main() {
  const httpsProbe = await fetchUrl(`${STAGING_URL}/health`);
  record("HTTPS health", httpsProbe.res.status === 200, String(httpsProbe.res.status));

  const login = await fetchUrl(`${STAGING_URL}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: PASSWORD }),
  });
  const setCookie = login.res.headers.get("set-cookie") || "";
  record("Secure cookie on login", /;\s*Secure/i.test(setCookie) && /HttpOnly/i.test(setCookie), "Secure; HttpOnly attributes present (value redacted)");

  const hsts = login.res.headers.get("strict-transport-security") ||
    (await fetchUrl(`${STAGING_URL}/login`)).res.headers.get("strict-transport-security");
  record("HSTS header", !!hsts, hsts || "missing");

  const corsBad = await fetchUrl(`${STAGING_URL}/api/v1/auth/me`, {
    headers: { Origin: "https://evil.example", Accept: "application/json" },
  });
  record("CORS evil origin blocked", corsBad.res.status === 401 || corsBad.res.status === 403, String(corsBad.res.status));

  const csrfBad = await fetchUrl(`${STAGING_URL}/api/v1/auth/logout`, {
    method: "POST",
    headers: {
      Origin: "https://evil.example",
      Accept: "application/json",
      Cookie: setCookie.split(";")[0],
    },
  });
  record("CSRF origin fail", csrfBad.res.status === 403, String(csrfBad.res.status));

  const unauth = await fetchUrl(`${STAGING_URL}/api/v1/auth/me`);
  record("401 unauthenticated", unauth.res.status === 401, String(unauth.res.status));

  const bigBody = "x".repeat(300 * 1024);
  const oversized = await fetchUrl(`${STAGING_URL}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ email: "a@b.c", password: bigBody }),
  });
  record("oversized body rejected", oversized.res.status === 413, String(oversized.res.status));

  const headersProbe = await fetchUrl(`${STAGING_URL}/login`);
  const xcto = headersProbe.res.headers.get("x-content-type-options");
  const xfo = headersProbe.res.headers.get("x-frame-options");
  record("security headers scan", xcto === "nosniff" && !!xfo, `xcto=${xcto} xfo=${xfo}`);

  const report = {
    timestamp: new Date().toISOString(),
    stagingUrl: STAGING_URL,
    results,
    passed: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(`Wrote ${OUT}`);

  if (report.failed) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
