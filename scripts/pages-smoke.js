#!/usr/bin/env node
/**
 * Smoke-test the live GitHub Pages demo (demo mode only).
 * Usage: PAGES_URL=https://peter-cyber-create.github.io/gfrt npm run pages:smoke
 */
const { chromium } = require("playwright");

const BASE = (process.env.PAGES_URL || "https://peter-cyber-create.github.io/gfrt").replace(/\/$/, "");
const EMAIL = process.env.VITE_DEMO_EMAIL || "admin@gmail.com";
const PASSWORD = process.env.VITE_DEMO_PASSWORD || "123456";

const ROUTES = [
  "/",
  "/login",
  "/register",
  "/password/reset",
  "/home",
  "/requisitions",
  "/performance",
  "/users",
  "/roles",
  "/reports",
  "/analytics",
  "/settings",
];

const results = [];
const musookaHits = [];
const badAbsoluteAssets = [];
const pageErrors = [];

function ok(name, detail = "") {
  results.push({ name, pass: true, detail });
  console.log(`PASS  ${name}${detail ? " — " + detail : ""}`);
}
function fail(name, detail = "") {
  results.push({ name, pass: false, detail });
  console.log(`FAIL  ${name}${detail ? " — " + detail : ""}`);
}

async function httpStatus(path) {
  const res = await fetch(`${BASE}${path === "/" ? "/" : path}`, { redirect: "manual" });
  return res.status;
}

(async () => {
  process.env.PLAYWRIGHT_BROWSERS_PATH =
    process.env.PLAYWRIGHT_BROWSERS_PATH || "/home/peter/.cache/ms-playwright";

  console.log(`Pages smoke against ${BASE}`);

  for (const path of ROUTES) {
    const status = await httpStatus(path);
    // Known app routes must be real 200 shells (not GitHub 404.html fallback).
    if (status === 200) ok(`http ${path}`, String(status));
    else fail(`http ${path}`, `expected 200, got ${status}`);
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on("request", (req) => {
    const u = req.url();
    if (u.includes("musooka.site")) musookaHits.push(u);
    try {
      const { pathname, origin } = new URL(u);
      if (origin.includes("github.io") && (pathname === "/app.css" || pathname.startsWith("/assets/"))) {
        badAbsoluteAssets.push(u);
      }
    } catch {
      /* ignore */
    }
  });
  page.on("pageerror", (err) => pageErrors.push(String(err)));
  page.on("console", (msg) => {
    if (msg.type() === "error") pageErrors.push(msg.text());
  });

  try {
    await page.goto(`${BASE}/login`, { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForSelector("#email");
    ok("login page renders");

    await page.fill("#email", EMAIL);
    await page.fill("#password", PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/home", { timeout: 15000 });
    ok("demo login");

    const navRoutes = [
      ["/home", "Dashboard"],
      ["/requisitions", "Requisitions"],
      ["/performance", "Performance"],
      ["/users", "Users"],
      ["/roles", "Roles"],
      ["/reports", "Reports"],
      ["/analytics", "Analytics"],
      ["/settings", "Settings"],
    ];

    for (const [path] of navRoutes) {
      await page.goto(`${BASE}${path}`, { waitUntil: "networkidle", timeout: 60000 });
      await page.reload({ waitUntil: "networkidle" });
      if (page.url().includes(path)) ok(`refresh ${path}`);
      else fail(`refresh ${path}`, page.url());
    }

    await page.goto(`${BASE}/home`, { waitUntil: "networkidle" });
    await page.goBack({ waitUntil: "networkidle" }).catch(() => null);
    await page.goForward({ waitUntil: "networkidle" }).catch(() => null);
    ok("back/forward navigation attempted");

    if (await page.locator(".app-sidebar").count()) ok("sidebar present after nav");
    else fail("sidebar present after nav");

    if (musookaHits.length === 0) ok("no musooka.site requests");
    else fail("no musooka.site requests", musookaHits.slice(0, 3).join(", "));

    if (badAbsoluteAssets.length === 0) ok("no root-absolute /app.css or /assets requests");
    else fail("no root-absolute assets", badAbsoluteAssets.slice(0, 3).join(", "));

    const severe = pageErrors.filter(
      (e) =>
        !/favicon/i.test(e) &&
        !/Failed to load resource:.*\b(401|403)\b/i.test(e) &&
        !/net::ERR_ABORTED/i.test(e)
    );
    if (severe.length === 0) ok("no severe console/page errors");
    else fail("console/page errors", severe.slice(0, 5).join(" | "));
  } catch (err) {
    fail("suite crashed", err.message || String(err));
  } finally {
    await browser.close();
  }

  const passed = results.filter((r) => r.pass).length;
  const total = results.length;
  console.log(`\n${passed}/${total} checks passed`);
  process.exit(passed === total ? 0 : 1);
})();
