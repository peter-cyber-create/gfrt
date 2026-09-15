/**
 * Authenticate against Musooka and save Playwright storageState.
 * Credentials come from .env — never hard-coded.
 */
require("dotenv").config();

const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const BASE_URL = process.env.BASE_URL;
const EMAIL = process.env.MUSOOKA_EMAIL;
const PASSWORD = process.env.MUSOOKA_PASSWORD;
const AUTH_PATH = path.join("playwright", ".auth", "musooka.json");
const HEADLESS = process.env.HEADLESS !== "0";

if (!BASE_URL || !EMAIL || !PASSWORD) {
  throw new Error("Missing BASE_URL, MUSOOKA_EMAIL or MUSOOKA_PASSWORD in .env");
}

(async () => {
  fs.mkdirSync(path.dirname(AUTH_PATH), { recursive: true });
  fs.mkdirSync("screenshots", { recursive: true });

  const browser = await chromium.launch({ headless: HEADLESS });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  console.log(`Opening ${BASE_URL}`);
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 90000 });

  await page.waitForSelector("#email", { state: "visible", timeout: 30000 });
  console.log("Login form detected.");

  await page.locator("#email").fill(EMAIL);
  await page.locator("#password").fill(PASSWORD);
  await page.locator('button[type="submit"]').click({ timeout: 30000 });

  // Wait for navigation away from login or for dashboard markers
  try {
    await page.waitForURL((url) => !url.pathname.includes("/login") && url.href !== BASE_URL.replace(/\/$/, "") + "/", {
      timeout: 20000,
    });
  } catch {
    // May redirect to /home or stay; check for login form absence
  }

  await page.waitForTimeout(3000);

  const url = page.url();
  const title = await page.title();
  console.log("Post-login URL:", url);
  console.log("Post-login title:", title);

  await page.screenshot({
    path: "screenshots/02-after-login.png",
    fullPage: true,
  });

  const stillLogin =
    (await page.locator("#email").count()) > 0 &&
    (await page.locator('form[action*="login"]').count()) > 0;

  if (stillLogin || url.includes("/login")) {
    console.error("Login appears to have failed (login form still present).");
    await browser.close();
    process.exit(1);
  }

  await context.storageState({ path: AUTH_PATH });
  console.log("Session saved to", AUTH_PATH);

  await browser.close();
  process.exit(0);
})().catch((err) => {
  console.error("save-session failed:", err.message);
  process.exit(1);
});
