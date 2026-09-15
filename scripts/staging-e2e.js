#!/usr/bin/env node
/**
 * Playwright E2E against local staging (https://127.0.0.1:8443).
 */
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");

require("dotenv").config({ path: path.resolve(__dirname, "../infra/staging/.env"), quiet: true });

const STAGING_URL = process.env.STAGING_URL || "https://127.0.0.1:8443";
if (STAGING_URL.includes("127.0.0.1")) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}
const ADMIN_EMAIL = process.env.STAGING_ADMIN_EMAIL || "admin@staging.musooka.local";
const REVIEWER_EMAIL = process.env.STAGING_REVIEWER_EMAIL || "reviewer@staging.musooka.local";
const USER_EMAIL = process.env.STAGING_USER_EMAIL || "user@staging.musooka.local";
const PASSWORD = process.env.STAGING_SEED_PASSWORD || process.env.SMOKE_PASSWORD || "StagingOnly!Pass123";
const OUT = path.resolve(__dirname, "../data/staging-e2e-results.json");

const results = [];

function record(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "OK  " : "FAIL"} ${name}${detail ? `: ${detail}` : ""}`);
}

async function login(page, email) {
  await page.context().clearCookies();
  const res = await page.request.post(`${STAGING_URL}/api/v1/auth/login`, {
    data: { email, password: PASSWORD },
  });
  if (!res.ok()) return false;
  const json = await res.json();
  const user = json.data?.user;
  if (!user) return false;
  await page.goto(`${STAGING_URL}/login`, { waitUntil: "networkidle" });
  await page.evaluate((u) => {
    localStorage.setItem(
      "musooka_api_user",
      JSON.stringify({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role || u.roles?.[0] || null,
        roles: u.roles || [],
        permissions: u.permissions || [],
        department: u.department || "—",
        status: u.status,
      })
    );
  }, user);
  await page.goto(`${STAGING_URL}/home`, { waitUntil: "networkidle" });
  return /\/(home|requisitions)/.test(page.url());
}

async function hardLogout(page) {
  await page.request.post(`${STAGING_URL}/api/v1/auth/logout`).catch(() => {});
  await page.context().clearCookies();
  await page.goto(`${STAGING_URL}/login`, { waitUntil: "load" });
  await page.evaluate(() => localStorage.removeItem("musooka_api_user"));
  await page.goto(`${STAGING_URL}/home`, { waitUntil: "networkidle" });
  await page.waitForURL(/\/login/, { timeout: 10000 }).catch(() => {});
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();

  try {
    const health = await page.request.get(`${STAGING_URL}/health`);
    record("health", health.ok(), String(health.status()));

    record("admin login", await login(page, ADMIN_EMAIL), page.url());

    await page.goto(`${STAGING_URL}/home`, { waitUntil: "domcontentloaded" });
    record("dashboard", page.url().includes("/home"), page.url());

    await page.goto(`${STAGING_URL}/requisitions`, { waitUntil: "domcontentloaded" });
    record("requisitions page", page.url().includes("/requisitions"), page.url());

    const search = page.locator('input[type="search"], input[placeholder*="Search"], input.form-control').first();
    if (await search.count()) {
      await search.fill("REQ");
      await page.waitForTimeout(500);
    }
    record("requisitions search/filter", true);

    await page.goto(`${STAGING_URL}/users`, { waitUntil: "domcontentloaded" });
    record("users page", page.url().includes("/users"), page.url());

    await page.goto(`${STAGING_URL}/roles`, { waitUntil: "domcontentloaded" });
    record("roles page", page.url().includes("/roles"), page.url());

    await page.goto(`${STAGING_URL}/reports`, { waitUntil: "domcontentloaded" });
    record("reports page", page.url().includes("/reports"), page.url());

    await page.goto(`${STAGING_URL}/settings`, { waitUntil: "domcontentloaded" });
    record("settings/audit", page.url().includes("/settings"), page.url());

    record("reviewer login", await login(page, REVIEWER_EMAIL), page.url());

    record("user login", await login(page, USER_EMAIL), page.url());

    await page.goto(`${STAGING_URL}/home`, { waitUntil: "domcontentloaded" });
    const approveBtn = page.locator('button:has-text("Approve"), .btn:has-text("Approve")').first();
    if (await approveBtn.count()) {
      const disabled = await approveBtn.isDisabled().catch(() => true);
      record("user denied approve", disabled, "approve control disabled or absent");
    } else {
      record("user denied approve", true, "no approve button visible");
    }

    await hardLogout(page);
    record("protected route after logout", page.url().includes("/login"), page.url());
  } catch (err) {
    record("unexpected error", false, err.message);
  } finally {
    await browser.close();
  }

  const report = {
    timestamp: new Date().toISOString(),
    stagingUrl: STAGING_URL,
    passed: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    results,
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
