#!/usr/bin/env node
/**
 * Measure baseline API timings; writes data/perf-baseline.json
 */
const fs = require("node:fs");
const path = require("node:path");

const API_BASE = process.env.API_BASE || "http://127.0.0.1:4000";
const EMAIL = process.env.SMOKE_EMAIL || "admin@musooka.local";
const PASSWORD = process.env.SMOKE_PASSWORD || "DevOnly!Pass123";
const OUT = path.resolve(__dirname, "../data/perf-baseline.json");

let cookie = "";

async function timed(name, fn) {
  const start = performance.now();
  const result = await fn();
  const ms = Math.round(performance.now() - start);
  return { name, ms, ok: true, result };
}

async function api(path, opts = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      Accept: "application/json",
      ...(opts.body ? { "Content-Type": "application/json" } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
      ...(opts.headers || {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const setCookie = res.headers.getSetCookie?.() || [];
  if (setCookie.length) cookie = setCookie.map((c) => c.split(";")[0]).join("; ");
  if (!res.ok) throw new Error(`${path} → ${res.status}`);
  if (res.status === 204) return null;
  return res.json();
}

async function main() {
  const timings = [];

  timings.push(
    await timed("login", () =>
      api("/api/v1/auth/login", { method: "POST", body: { email: EMAIL, password: PASSWORD } })
    )
  );

  timings.push(await timed("list_requisitions", () => api("/api/v1/requisitions")));
  timings.push(await timed("dashboard", () => api("/api/v1/reports/dashboard")));

  const list = await api("/api/v1/requisitions");
  const id = list.data?.[0]?.id;
  if (id) {
    timings.push(await timed("requisition_detail", () => api(`/api/v1/requisitions/${id}`)));
  }

  const report = {
    timestamp: new Date().toISOString(),
    apiBase: API_BASE,
    timings: timings.map(({ name, ms }) => ({ name, ms })),
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
