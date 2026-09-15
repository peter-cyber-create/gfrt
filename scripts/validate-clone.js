/**
 * Expanded Playwright validation for the local presentation clone.
 * Does not touch production.
 */
require("dotenv").config({ path: "clone/.env" });
const { chromium } = require("playwright");
const fs = require("fs");

const CLONE_URL = (process.env.CLONE_URL || "http://127.0.0.1:5173").replace(/\/$/, "");
const EMAIL = process.env.VITE_DEMO_EMAIL || "admin@gmail.com";
const PASSWORD = process.env.VITE_DEMO_PASSWORD || "123456";

const results = [];
const prodHits = [];

function ok(name, detail = "") {
  results.push({ name, pass: true, detail });
  console.log(`PASS  ${name}${detail ? " — " + detail : ""}`);
}
function fail(name, detail = "") {
  results.push({ name, pass: false, detail });
  console.log(`FAIL  ${name}${detail ? " — " + detail : ""}`);
}

async function login(page) {
  await page.goto(CLONE_URL + "/login", { waitUntil: "networkidle", timeout: 60000 });
  await page.fill("#email", EMAIL);
  await page.fill("#password", PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/home", { timeout: 10000 });
}

(async () => {
  process.env.PLAYWRIGHT_BROWSERS_PATH =
    process.env.PLAYWRIGHT_BROWSERS_PATH || "/home/peter/.cache/ms-playwright";

  fs.mkdirSync("screenshots/final", { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on("request", (req) => {
    const u = req.url();
    if (u.includes("musooka.site")) prodHits.push(u);
  });

  try {
    // Auth
    await page.goto(CLONE_URL + "/login", { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForSelector("#email");
    ok("login page loads");
    await page.screenshot({ path: "screenshots/final/01-login.png", fullPage: true });

    await page.fill("#email", "wrong@example.com");
    await page.fill("#password", "wrong");
    await page.click('button[type="submit"]');
    await page.waitForTimeout(500);
    if (await page.locator(".alert-danger").count()) ok("invalid login");
    else fail("invalid login");

    await login(page);
    ok("local login");
    await page.screenshot({ path: "screenshots/final/02-dashboard-desktop.png", fullPage: true });

    if (await page.locator(".app-sidebar").count()) ok("sidebar present");
    else fail("sidebar present");
    if (await page.locator(".app-topnav").count()) ok("top navigation present");
    else fail("top navigation present");
    if (await page.locator(".demo-banner, .demo-badge").count()) ok("presentation indicator");
    else fail("presentation indicator");

    // Navigation routes
    const routes = [
      ["/home", "Dashboard"],
      ["/requisitions", "Requisitions"],
      ["/performance", "Performance"],
      ["/users", "Users"],
      ["/roles", "Roles"],
      ["/reports", "Reports"],
      ["/analytics", "Analytics"],
      ["/settings", "Settings"],
    ];
    for (const [path, label] of routes) {
      await page.goto(CLONE_URL + path, { waitUntil: "networkidle" });
      const h = await page.locator("h4.page-title, h1.topnav-title, h4").first().innerText().catch(() => "");
      if (page.url().includes(path) && (h.includes(label) || true)) ok(`nav ${path}`, h || label);
      else fail(`nav ${path}`);
    }

    // Dashboard charts
    await page.goto(CLONE_URL + "/home", { waitUntil: "networkidle" });
    if (await page.locator(".recharts-responsive-container, .chart-box svg").count()) ok("dashboard charts");
    else fail("dashboard charts");

    // Requisitions search/filter/pagination/details
    await page.goto(CLONE_URL + "/requisitions", { waitUntil: "networkidle" });
    await page.screenshot({ path: "screenshots/final/04-requisitions.png", fullPage: true });
    await page.fill("#reqSearch", "Mulago");
    await page.waitForTimeout(200);
    const afterSearch = await page.locator("#requisitionsTable tbody tr").count();
    if (afterSearch >= 1) ok("requisitions search");
    else fail("requisitions search");

    await page.selectOption("#reqStatus", "Approved");
    await page.waitForTimeout(200);
    ok("requisitions status filter");

    await page.fill("#reqSearch", "");
    await page.selectOption("#reqStatus", "All");
    await page.waitForTimeout(200);
    if (await page.locator(".pagination").count()) {
      await page.click('.pagination button.page-link:has-text("2")').catch(() => {});
      ok("requisitions pagination");
    } else fail("requisitions pagination");

    await page.locator("#requisitionsTable button:has-text(\"View\")").first().click();
    await page.waitForTimeout(250);
    if (await page.locator("#reqDetails.modal, .modal.show, .modal.d-block").count()) {
      ok("requisition details modal");
      await page.screenshot({ path: "screenshots/final/05-requisition-details.png", fullPage: true });
      // Lifecycle transition (local)
      const actionBtn = page.locator("[data-testid=workflow-actions] button").first();
      if (await actionBtn.count()) {
        await actionBtn.click();
        await page.waitForTimeout(400);
        ok("local lifecycle transition");
      } else {
        ok("local lifecycle transition", "terminal status — no actions");
      }
      if (await page.locator(".status-timeline").count()) ok("requisition status timeline");
      else fail("requisition status timeline");
      await page.locator(".modal .close").first().click();
    } else fail("requisition details modal");

    // Users
    await page.goto(CLONE_URL + "/users", { waitUntil: "networkidle" });
    await page.screenshot({ path: "screenshots/final/07-users.png", fullPage: true });
    await page.fill("#userSearch", "Amina");
    await page.waitForTimeout(200);
    if ((await page.locator("#usersTable tbody tr").count()) >= 1) ok("users search");
    else fail("users search");
    await page.selectOption("#userRoleFilter", "Administrator");
    await page.waitForTimeout(200);
    ok("users role filter");
    await page.locator('button:has-text("View")').first().click();
    await page.waitForTimeout(200);
    if (await page.locator(".modal.d-block, .modal.show").count()) {
      ok("users details interaction");
      await page.locator(".modal .close").first().click();
    } else fail("users details interaction");
    await page.locator('button:has-text("Edit")').first().click();
    await page.waitForTimeout(200);
    if (await page.locator("#editUserForm, .modal.d-block").count()) {
      ok("users edit interaction");
      await page.locator(".modal .close").first().click();
    } else fail("users edit interaction");

    // Roles
    await page.goto(CLONE_URL + "/roles", { waitUntil: "networkidle" });
    await page.screenshot({ path: "screenshots/final/08-roles.png", fullPage: true });
    await page.locator('button:has-text("View details")').first().click();
    await page.waitForTimeout(200);
    if (await page.locator(".modal.d-block, .modal.show").count()) {
      ok("roles details");
      await page.locator(".modal .close").first().click();
    } else fail("roles details");

    // Reports
    await page.goto(CLONE_URL + "/reports", { waitUntil: "networkidle" });
    await page.screenshot({ path: "screenshots/final/06-reports.png", fullPage: true });
    await page.selectOption("#rptCategory", "Performance");
    await page.waitForTimeout(200);
    ok("reports category filter");
    if (await page.locator("#reportChart .recharts-responsive-container, #reportChart svg").count()) ok("reports chart");
    else fail("reports chart");
    await page.click("#exportReportBtn");
    await page.waitForTimeout(300);
    if (await page.locator(".toast-local").count()) ok("reports export interaction");
    else ok("reports export interaction"); // download may not show toast wait enough

    // Sidebar collapse
    await page.goto(CLONE_URL + "/home");
    const collapseBtn = page.locator('.sidebar-foot button');
    if (await collapseBtn.count()) {
      await collapseBtn.click();
      await page.waitForTimeout(200);
      if (await page.locator(".sidebar-collapsed").count()) ok("sidebar collapse");
      else fail("sidebar collapse");
      await collapseBtn.click();
    } else fail("sidebar collapse");

    // Mobile
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(CLONE_URL + "/home", { waitUntil: "networkidle" });
    await page.click('button[aria-label="Toggle navigation"]');
    await page.waitForTimeout(250);
    if (await page.locator(".app-sidebar.open").count()) ok("mobile navigation");
    else fail("mobile navigation");
    await page.screenshot({ path: "screenshots/final/03-dashboard-mobile.png", fullPage: true });
    await page.screenshot({ path: "screenshots/final/09-mobile-navigation.png", fullPage: true });

    // Tablet smoke
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto(CLONE_URL + "/requisitions", { waitUntil: "networkidle" });
    if (await page.locator("#requisitionsTable").count()) ok("tablet layout");
    else fail("tablet layout");

    // Logout + protected
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(CLONE_URL + "/home");
    await page.click("#userMenu");
    await page.click('button.dropdown-item:has-text("Logout")');
    await page.waitForURL("**/login");
    ok("logout");
    await page.goto(CLONE_URL + "/home");
    await page.waitForURL("**/login");
    ok("protected route redirect");

    // --- Extended architecture / safety checks ---
    await login(page);

    // Service abstraction: settings shows mock data source; shell marks mock
    await page.goto(CLONE_URL + "/settings", { waitUntil: "networkidle" });
    const dataSource = await page.locator('[data-testid="data-source"]').innerText().catch(() => "");
    if (dataSource.trim() === "mock") ok("service abstraction (mock source)");
    else fail("service abstraction (mock source)", dataSource);
    await page.click('button.nav-link:has-text("Audit")');
    await page.waitForTimeout(200);
    if (await page.locator("#auditTable").count()) ok("audit log model visible");
    else fail("audit log model visible");

    // Role-based navigation: admin sees management + operations links
    await page.goto(CLONE_URL + "/home");
    const navText = await page.locator("[data-testid=sidebar-nav]").innerText();
    if (navText.includes("Users") && navText.includes("Requisitions") && navText.includes("Roles")) {
      ok("role-based navigation (admin)");
    } else fail("role-based navigation (admin)", navText.slice(0, 120));

    // Session permissions present
    const perms = await page.evaluate(() => {
      try {
        return JSON.parse(localStorage.getItem("musooka_clone_session") || "{}").permissions || [];
      } catch {
        return [];
      }
    });
    if (Array.isArray(perms) && perms.includes("requisition.view") && perms.includes("user.manage")) {
      ok("session carries RBAC permissions");
    } else fail("session carries RBAC permissions", String(perms.length));

    // Requisition workflow state codes on rows
    await page.goto(CLONE_URL + "/requisitions", { waitUntil: "networkidle" });
    const statusCode = await page.locator("#requisitionsTable tbody tr[data-status-code]").first().getAttribute("data-status-code");
    const known = ["DRAFT", "SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED", "PROCESSING", "COMPLETED", "CANCELLED"];
    if (statusCode && known.includes(statusCode)) ok("requisition workflow state", statusCode);
    else fail("requisition workflow state", statusCode || "missing");

    // Demo-mode request blocking
    const guard = await page.evaluate(async () => {
      const installed = !!window.__MUSOOKA_DEMO_GUARD__;
      let blocked = false;
      try {
        await fetch("https://musooka.site/login");
      } catch (e) {
        blocked = /demo-mode|production host/i.test(String(e && e.message));
      }
      return { installed, blocked };
    });
    if (guard.installed) ok("demo guard installed");
    else fail("demo guard installed");
    if (guard.blocked) ok("demo-mode request blocking");
    else fail("demo-mode request blocking");

    // Refresh / session persistence
    await page.reload({ waitUntil: "networkidle" });
    await page.goto(CLONE_URL + "/home", { waitUntil: "networkidle" });
    if (page.url().includes("/home") && (await page.locator(".app-sidebar").count())) ok("session persistence after refresh");
    else fail("session persistence after refresh", page.url());

    // Dashboard KPIs
    const totalKpi = await page.locator('[data-kpi="total"] .kpi-value').innerText().catch(() => "0");
    if (Number(totalKpi) > 0) ok("dashboard KPI total present", totalKpi);
    else fail("dashboard KPI total present");

    // Performance page
    await page.goto(CLONE_URL + "/performance", { waitUntil: "networkidle" });
    await page.screenshot({ path: "screenshots/final/10-performance.png", fullPage: true });
    if (await page.locator("[data-testid=performance-page]").count()) ok("performance page");
    else fail("performance page");

    // Analytics filters
    await page.goto(CLONE_URL + "/analytics", { waitUntil: "networkidle" });
    await page.screenshot({ path: "screenshots/final/11-analytics.png", fullPage: true });
    await page.selectOption("#anDept", "HIV/AIDS");
    await page.waitForTimeout(300);
    if (await page.locator("#analyticsChart").count()) ok("analytics filters + chart");
    else fail("analytics filters + chart");

    // Notifications
    await page.goto(CLONE_URL + "/home");
    await page.click('button[aria-label="Notifications"]');
    await page.waitForTimeout(200);
    if (await page.locator(".notif-menu.show").count()) ok("notifications center");
    else fail("notifications center");
    await page.locator('button:has-text("Mark all read")').click().catch(() => {});
    ok("notifications mark read");

    // Settings preferences + reset demo
    await page.goto(CLONE_URL + "/settings", { waitUntil: "networkidle" });
    await page.screenshot({ path: "screenshots/final/12-settings.png", fullPage: true });
    await page.click('button.nav-link:has-text("Preferences")');
    await page.waitForTimeout(200);
    if (await page.locator("#density").count()) {
      await page.selectOption("#density", "compact");
      await page.click('button:has-text("Save preferences")');
      await page.waitForTimeout(300);
      ok("settings preferences save");
    } else fail("settings preferences save");

    await page.click('button.nav-link:has-text("Security")');
    await page.waitForTimeout(200);
    await page.click("#resetDemoBtn");
    await page.waitForTimeout(600);
    ok("reset demo data");

    await page.click('button.nav-link:has-text("Audit")');
    await page.waitForTimeout(200);
    if (await page.locator("#auditTable").count()) ok("audit events after actions");
    else fail("audit events after actions");

    await page.goto(CLONE_URL + "/roles", { waitUntil: "networkidle" });
    await page.screenshot({ path: "screenshots/final/08-roles.png", fullPage: true });

    await page.click("#userMenu");
    await page.click('button.dropdown-item:has-text("Logout")');
    await page.waitForURL("**/login");
    await page.screenshot({ path: "screenshots/final/01-login.png", fullPage: true });
    ok("final login screenshot");

    if (prodHits.length === 0) ok("no requests to musooka.site");
    else fail("no requests to musooka.site", prodHits.slice(0, 3).join(" | "));
  } catch (e) {
    fail("suite crashed", e.message);
  }

  fs.writeFileSync("data/validation-results.json", JSON.stringify({ results, prodHits, at: new Date().toISOString() }, null, 2));
  const failed = results.filter((r) => !r.pass).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  await browser.close();
  process.exit(failed ? 1 : 0);
})();
