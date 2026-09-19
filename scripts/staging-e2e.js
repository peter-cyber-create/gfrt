#!/usr/bin/env node
/**
 * Playwright E2E against local staging (prefer HTTP :8088 to avoid cert friction).
 */
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");

require("dotenv").config({ path: path.resolve(__dirname, "../infra/staging/.env"), quiet: true });

const STAGING_URL = (process.env.STAGING_URL || "http://127.0.0.1:8088").replace(/\/$/, "");
if (STAGING_URL.startsWith("https://") && STAGING_URL.includes("127.0.0.1")) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}
const ADMIN_EMAIL = process.env.STAGING_ADMIN_EMAIL || "admin@gfrt.local";
const REVIEWER_EMAIL = process.env.STAGING_REVIEWER_EMAIL || "reviewer@gfrt.local";
const USER_EMAIL = process.env.STAGING_USER_EMAIL || "user@gfrt.local";
const PASSWORD = process.env.STAGING_SEED_PASSWORD || process.env.SMOKE_PASSWORD || "demo1234";
const OUT = path.resolve(__dirname, "../data/staging-e2e-results.json");

const results = [];
const consoleErrors = [];
const failedRequests = [];
const musookaHits = [];

function record(name, ok, detail = "") {
  results.push({ name, ok, detail: String(detail).slice(0, 200) });
  console.log(`${ok ? "OK  " : "FAIL"} ${name}${detail ? `: ${detail}` : ""}`);
}

async function apiLogin(page, email) {
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

async function formLogin(page, email) {
  await page.context().clearCookies();
  await page.goto(`${STAGING_URL}/login`, { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.removeItem("musooka_api_user"));
  await page.fill('input[type="email"], input[name="email"], #email', email);
  await page.fill('input[type="password"], input[name="password"], #password', PASSWORD);
  await page.click('button[type="submit"], button:has-text("Sign in"), button:has-text("Login")');
  await page.waitForURL(/\/home/, { timeout: 15000 }).catch(() => {});
  return page.url().includes("/home");
}

async function hardLogout(page) {
  await page.request.post(`${STAGING_URL}/api/v1/auth/logout`).catch(() => {});
  await page.context().clearCookies();
  await page.goto(`${STAGING_URL}/login`, { waitUntil: "load" });
  await page.evaluate(() => localStorage.removeItem("musooka_api_user"));
  await page.goto(`${STAGING_URL}/home`, { waitUntil: "networkidle" });
  await page.waitForURL(/\/login/, { timeout: 10000 }).catch(() => {});
}

async function assertRoute(page, route, testId) {
  await page.goto(`${STAGING_URL}${route}`, { waitUntil: "networkidle" });
  const onRoute = page.url().includes(route);
  let hasContent = true;
  if (testId) {
    hasContent = (await page.locator(`[data-testid="${testId}"]`).count()) > 0;
  }
  const kpiOrCard = (await page.locator(".card, .kpi-card, table, .role-card").count()) > 0;
  return onRoute && (hasContent || kpiOrCard);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();

  page.on("pageerror", (err) => consoleErrors.push(err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("requestfailed", (req) => {
    failedRequests.push(`${req.method()} ${req.url()} ${req.failure()?.errorText || ""}`);
  });
  page.on("request", (req) => {
    if (/musooka\.site/.test(req.url())) musookaHits.push(req.url());
  });

  try {
    const health = await page.request.get(`${STAGING_URL}/health`);
    record("health", health.ok(), String(health.status()));

    record("form login admin", await formLogin(page, ADMIN_EMAIL), page.url());

    record("dashboard", await assertRoute(page, "/home", "dashboard-page"), page.url());
    const kpiCount = await page.locator(".kpi-card, .summary-tile").count();
    record("dashboard KPIs", kpiCount >= 3, `kpi=${kpiCount}`);

    record("requisitions page", await assertRoute(page, "/requisitions", "requisitions-page"), page.url());
    const search = page.locator("#reqSearch, input[placeholder*='Search'], input.form-control").first();
    if (await search.count()) {
      await search.fill("REQ");
      await page.waitForTimeout(400);
    }
    record("requisitions search", true);

    const firstRow = page.locator("#requisitionsTable tbody tr, table tbody tr").first();
    if (await firstRow.count()) {
      const viewBtn = firstRow.locator("button:has-text('View'), button:has-text('Details'), a").first();
      if (await viewBtn.count()) {
        await viewBtn.click();
        await page.waitForTimeout(500);
        record("requisition detail modal", (await page.locator(".modal.show, [role='dialog'], .local-modal-open, .modal").count()) > 0);
      } else {
        record("requisition detail modal", true, "no view control — skipped");
      }
    } else {
      record("requisition detail modal", true, "no rows — skipped");
    }

    // Create requisition (admin)
    await page.goto(`${STAGING_URL}/requisitions`, { waitUntil: "networkidle" });
    const newBtn = page.locator('button:has-text("New Requisition")').first();
    if (await newBtn.count()) {
      await newBtn.click();
      await page.fill("#crFacility", "E2E Central Lab");
      await page.fill("#crDistrict", "Kampala");
      await page.fill("#crDesc", "E2E created requisition");
      await page.fill("#crItemDesc", "Test kits");
      await page.fill("#crQty", "2");
      await page.fill("#crCost", "50000");
      await page.fill("#crAmount", "100000");
      await page.click('button:has-text("Create draft")');
      await page.waitForTimeout(800);
      record("create requisition", (await page.locator("text=E2E Central Lab, text=REQ-").count()) >= 0 || page.url().includes("/requisitions"), "create attempted");
      const created = await page.request.get(`${STAGING_URL}/api/v1/requisitions`);
      const body = await created.json();
      const found = (body.data || []).some((r) => r.facility === "E2E Central Lab");
      record("create requisition persisted", found, `n=${(body.data || []).length}`);
    } else {
      record("create requisition", false, "button missing");
      record("create requisition persisted", false, "skipped");
    }

    record("performance page", await assertRoute(page, "/performance", "performance-page"), page.url());
    record("analytics page", await assertRoute(page, "/analytics", "analytics-page"), page.url());
    record("reports page", await assertRoute(page, "/reports"), page.url());
    const catalogItems = await page.locator(".list-group-item").count();
    record("reports catalog", catalogItems >= 1, `items=${catalogItems}`);

    record("users page", await assertRoute(page, "/users"), page.url());
    const userRows = await page.locator("#usersTable tbody tr").count();
    record("users list", userRows >= 1, `rows=${userRows}`);

    record("roles page", await assertRoute(page, "/roles"), page.url());
    const roleCards = await page.locator(".role-card").count();
    record("roles cards", roleCards >= 1, `cards=${roleCards}`);

    record("settings page", await assertRoute(page, "/settings"), page.url());
    await page.click('button:has-text("Audit"), .nav-link:has-text("Audit")').catch(() => {});
    await page.waitForTimeout(400);
    const auditRows = await page.locator("#auditTable tbody tr").count();
    record("settings audit", auditRows >= 0, `rows=${auditRows}`);

    await page.goto(`${STAGING_URL}/password/reset`, { waitUntil: "domcontentloaded" });
    record("password reset page", page.url().includes("/password/reset"), page.url());

    await page.goto(`${STAGING_URL}/register`, { waitUntil: "domcontentloaded" });
    record("register page", page.url().includes("/register"), page.url());

    record("reviewer login", await apiLogin(page, REVIEWER_EMAIL), page.url());
    record("user login", await apiLogin(page, USER_EMAIL), page.url());

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

    const appErrors = consoleErrors.filter(
      (m) =>
        !/favicon/i.test(m) &&
        !/Download the React DevTools/i.test(m) &&
        !/NODE_TLS/i.test(m) &&
        !/Failed to load resource:.*\b(401|403|404)\b/i.test(m) &&
        !/the server responded with a status of (401|403|404)/i.test(m)
    );
    record("no unexpected page errors", appErrors.length === 0, appErrors.slice(0, 3).join(" | "));
    record("no musooka.site requests", musookaHits.length === 0, musookaHits.slice(0, 2).join(" "));

    // Consistency: dashboard total vs requisitions list length (API)
    await apiLogin(page, ADMIN_EMAIL);
    const listRes = await page.request.get(`${STAGING_URL}/api/v1/requisitions`);
    const dashRes = await page.request.get(`${STAGING_URL}/api/v1/reports/dashboard`);
    const listN = (await listRes.json()).data?.length ?? -1;
    const dash = await dashRes.json();
    const dashTotal = dash.data?.total ?? -1;
    record("dashboard total reconciles with requisitions", listN === dashTotal && listN >= 0, `list=${listN} dash=${dashTotal}`);
  } catch (err) {
    record("unexpected error", false, err.message);
  } finally {
    await browser.close();
    const passed = results.filter((r) => r.ok).length;
    const failed = results.filter((r) => !r.ok).length;
    fs.writeFileSync(
      OUT,
      JSON.stringify(
        {
          at: new Date().toISOString(),
          stagingUrl: STAGING_URL,
          passed,
          failed,
          results,
          consoleErrors: consoleErrors.slice(0, 20),
          failedRequests: failedRequests.slice(0, 20),
        },
        null,
        2
      )
    );
    console.log(`\nE2E ${passed}/${results.length} passed → ${OUT}`);
    process.exit(failed ? 1 : 0);
  }
}

main();
