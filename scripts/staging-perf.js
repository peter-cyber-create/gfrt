#!/usr/bin/env node
/**
 * Compare staging remote timings vs local perf baseline.
 */
const fs = require("node:fs");
const path = require("node:path");
const https = require("node:https");

require("dotenv").config({ path: path.resolve(__dirname, "../infra/staging/.env"), quiet: true });

const STAGING_URL = process.env.STAGING_URL || "https://127.0.0.1:8443";
const tlsAgent = new https.Agent({ rejectUnauthorized: false });
const ADMIN_EMAIL = process.env.STAGING_ADMIN_EMAIL || "admin@staging.musooka.local";
const PASSWORD = process.env.STAGING_SEED_PASSWORD || "StagingOnly!Pass123";
const BASELINE_PATH = path.resolve(__dirname, "../data/perf-baseline.json");
const OUT = path.resolve(__dirname, "../data/staging-perf.json");

async function timed(name, fn) {
  const start = performance.now();
  await fn();
  return { name, ms: Math.round(performance.now() - start) };
}

async function api(path, opts = {}, cookieRef = { v: "" }) {
  const res = await fetch(`${STAGING_URL}${path}`, {
    ...opts,
    agent: tlsAgent,
    headers: {
      Accept: "application/json",
      ...(opts.body ? { "Content-Type": "application/json" } : {}),
      ...(cookieRef.v ? { Cookie: cookieRef.v } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const setCookie = res.headers.getSetCookie?.() || [];
  if (setCookie.length) cookieRef.v = setCookie.map((c) => c.split(";")[0]).join("; ");
  if (!res.ok) throw new Error(`${path} → ${res.status}`);
  if (res.status === 204) return null;
  return res.json();
}

async function main() {
  const cookieRef = { v: "" };
  const timings = [];

  timings.push(
    await timed("login", () =>
      api("/api/v1/auth/login", { method: "POST", body: { email: ADMIN_EMAIL, password: PASSWORD } }, cookieRef)
    )
  );
  timings.push(await timed("list_requisitions", () => api("/api/v1/requisitions", {}, cookieRef)));
  timings.push(await timed("dashboard", () => api("/api/v1/reports/dashboard", {}, cookieRef)));

  const list = await api("/api/v1/requisitions", {}, cookieRef);
  const id = list.data?.[0]?.id;
  if (id) {
    timings.push(await timed("requisition_detail", () => api(`/api/v1/requisitions/${id}`, {}, cookieRef)));
  }

  let baseline = null;
  if (fs.existsSync(BASELINE_PATH)) {
    baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, "utf8"));
  }

  const comparison = timings.map((t) => {
    const base = baseline?.timings?.find((b) => b.name === t.name);
    return {
      name: t.name,
      stagingMs: t.ms,
      baselineMs: base?.ms ?? null,
      deltaMs: base ? t.ms - base.ms : null,
    };
  });

  const report = {
    timestamp: new Date().toISOString(),
    stagingUrl: STAGING_URL,
    baselineFile: fs.existsSync(BASELINE_PATH) ? BASELINE_PATH : null,
    timings: comparison,
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(`Wrote ${OUT}`);
  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
