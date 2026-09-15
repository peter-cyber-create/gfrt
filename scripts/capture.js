/**
 * Re-capture screenshots for routes already in data/routes.json
 * Uses auth session when available.
 */
require("dotenv").config();
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const BASE_URL = (process.env.BASE_URL || "https://musooka.site").replace(/\/$/, "");
const AUTH_PATH = "playwright/.auth/musooka.json";

function slugFromUrl(url) {
  const u = new URL(url);
  let s = u.pathname.replace(/^\//, "").replace(/\//g, "__") || "root";
  return s.replace(/[^a-zA-Z0-9_\-]/g, "_").slice(0, 120);
}

(async () => {
  process.env.PLAYWRIGHT_BROWSERS_PATH =
    process.env.PLAYWRIGHT_BROWSERS_PATH || "/home/peter/.cache/ms-playwright";

  if (!fs.existsSync("data/routes.json")) {
    console.error("data/routes.json missing — run npm run crawl first");
    process.exit(1);
  }

  const routes = JSON.parse(fs.readFileSync("data/routes.json", "utf8"));
  const errors = [];
  fs.mkdirSync("screenshots/desktop", { recursive: true });
  fs.mkdirSync("screenshots/mobile", { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext(
    fs.existsSync(AUTH_PATH) ? { storageState: AUTH_PATH } : {}
  );
  const page = await context.newPage();

  for (const route of routes) {
    const url = route.url.startsWith("http") ? route.url : BASE_URL + route.path;
    const slug = slugFromUrl(url);
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
      await page.waitForTimeout(600);
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.screenshot({ path: `screenshots/desktop/${slug}.png`, fullPage: true });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.screenshot({ path: `screenshots/mobile/${slug}.png`, fullPage: true });
      console.log("Captured", slug);
    } catch (e) {
      errors.push({ url, error: e.message });
      console.log("FAIL", url, e.message.slice(0, 100));
    }
  }

  fs.writeFileSync(
    "data/capture-errors.json",
    JSON.stringify(errors, null, 2)
  );
  await browser.close();
})();
