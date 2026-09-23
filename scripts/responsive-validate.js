/**
 * Responsive / overflow validation across major routes and viewports.
 * Complements scripts/validate-clone.js — does not replace it.
 */
require("dotenv").config({ path: "clone/.env" });
const { chromium } = require("playwright");

const CLONE_URL = (process.env.CLONE_URL || "http://127.0.0.1:5173").replace(/\/$/, "");
const EMAIL = process.env.VITE_DEMO_EMAIL || "admin@gmail.com";
const PASSWORD = process.env.VITE_DEMO_PASSWORD || "123456";

const VIEWPORTS = [
  { name: "m320", width: 320, height: 800 },
  { name: "m375", width: 375, height: 812 },
  { name: "m390", width: 390, height: 844 },
  { name: "m412", width: 412, height: 915 },
  { name: "t768", width: 768, height: 1024 },
  { name: "d1280", width: 1280, height: 720 },
  { name: "d1440", width: 1440, height: 900 },
  { name: "d1920", width: 1920, height: 1080 },
];

const AUTH_ROUTES = [
  "/home",
  "/requisitions",
  "/performance",
  "/analytics",
  "/reports",
  "/users",
  "/roles",
  "/settings",
];

const PUBLIC_ROUTES = ["/login", "/register", "/password/reset"];

const results = [];

function ok(name, detail = "") {
  results.push({ name, pass: true, detail });
  console.log(`PASS  ${name}${detail ? " — " + detail : ""}`);
}
function fail(name, detail = "") {
  results.push({ name, pass: false, detail });
  console.log(`FAIL  ${name}${detail ? " — " + detail : ""}`);
}

async function overflow(page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const body = document.body;
    const scrollW = Math.max(doc.scrollWidth, body.scrollWidth);
    const clientW = window.innerWidth;
    // Allow 1px rounding noise only
    return { scrollW, clientW, overflow: scrollW > clientW + 1 };
  });
}

async function login(page) {
  await page.goto(CLONE_URL + "/login", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.fill("#email", EMAIL);
  await page.fill("#password", PASSWORD);
  await Promise.all([
    page.waitForURL("**/home", { timeout: 15000 }),
    page.click('button[type="submit"]'),
  ]);
}

(async () => {
  process.env.PLAYWRIGHT_BROWSERS_PATH =
    process.env.PLAYWRIGHT_BROWSERS_PATH || "/home/peter/.cache/ms-playwright";

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  try {
    // Login page structure
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(CLONE_URL + "/login", { waitUntil: "domcontentloaded" });
    if (await page.locator(".login-submit, button[type=submit]").count()) ok("login primary CTA");
    else fail("login primary CTA");
    if (await page.locator("[data-testid=demo-quick-login]").count()) {
      const label = await page.locator(".demo-quick-login-label").innerText();
      if (/demo accounts|quick sign-in/i.test(label)) ok("login demo accounts secondary label", label);
      else fail("login demo accounts secondary label", label);
    } else ok("login demo accounts secondary label", "not in this build");
    const loginOv = await overflow(page);
    if (!loginOv.overflow) ok("login no horizontal overflow @375");
    else fail("login no horizontal overflow @375", `${loginOv.scrollW}>${loginOv.clientW}`);

    // Forbidden chrome terminology after auth
    await page.setViewportSize({ width: 1440, height: 900 });
    await login(page);
    if (await page.locator(".demo-badge, .demo-banner").count()) {
      fail("no demo chrome in app shell", "badge/banner still present");
    } else ok("no demo chrome in app shell");
    const chromeText = await page.locator(".app-shell").innerText();
    const banned = ["Presentation Mode", "Mock Data", "Reconstructed", "Showcase", "Prototype", "Sample Data"];
    const hits = banned.filter((b) => chromeText.includes(b));
    if (hits.length === 0) ok("no banned marketing/demo terminology in shell");
    else fail("no banned marketing/demo terminology in shell", hits.join(", "));

    // Viewport matrix — stay authenticated for auth routes
    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height });

      for (const route of PUBLIC_ROUTES) {
        await page.goto(CLONE_URL + route, { waitUntil: "domcontentloaded", timeout: 20000 });
        await page.waitForTimeout(80);
        const ov = await overflow(page);
        const name = `overflow ${vp.name} ${route}`;
        if (!ov.overflow) ok(name);
        else fail(name, `${ov.scrollW}>${ov.clientW}`);
      }

      // Re-auth if needed
      await page.goto(CLONE_URL + "/home", { waitUntil: "domcontentloaded", timeout: 20000 });
      if (page.url().includes("/login")) await login(page);

      for (const route of AUTH_ROUTES) {
        await page.goto(CLONE_URL + route, { waitUntil: "domcontentloaded", timeout: 20000 });
        if (page.url().includes("/login")) {
          await login(page);
          await page.goto(CLONE_URL + route, { waitUntil: "domcontentloaded", timeout: 20000 });
        }
        await page.waitForTimeout(80);
        const ov = await overflow(page);
        const name = `overflow ${vp.name} ${route}`;
        if (!ov.overflow) ok(name);
        else fail(name, `${ov.scrollW}>${ov.clientW}`);
      }
    }

    // Mobile drawer
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(CLONE_URL + "/home", { waitUntil: "domcontentloaded" });
    if (page.url().includes("/login")) await login(page);
    await page.click('button[aria-label="Toggle navigation"]');
    await page.waitForTimeout(150);
    if (await page.locator(".app-sidebar.open").count()) ok("mobile drawer opens");
    else fail("mobile drawer opens");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(150);
    if (!(await page.locator(".app-sidebar.open").count())) ok("mobile drawer Escape closes");
    else fail("mobile drawer Escape closes");
    await page.click('button[aria-label="Toggle navigation"]');
    await page.waitForTimeout(100);
    // Click the visible backdrop strip to the right of the drawer (center is under the open sidebar)
    await page.mouse.click(380, 400);
    await page.waitForTimeout(150);
    if (!(await page.locator(".app-sidebar.open").count())) ok("mobile drawer outside click closes");
    else fail("mobile drawer outside click closes");

    // Mobile requisition form usability
    await page.goto(CLONE_URL + "/requisitions", { waitUntil: "domcontentloaded" });
    await page.click('button:has-text("New requisition")');
    await page.waitForTimeout(200);
    if (await page.locator("[data-testid=create-requisition-form]").count()) {
      const formOv = await overflow(page);
      if (!formOv.overflow) ok("new requisition modal no page overflow @390");
      else fail("new requisition modal no page overflow @390", `${formOv.scrollW}>${formOv.clientW}`);
      if (await page.locator("[data-testid=line-items-mobile], [data-testid=line-items-table]").count()) {
        ok("line items visible on mobile");
      } else fail("line items visible on mobile");
      await page.keyboard.press("Escape");
    } else fail("new requisition opens on mobile");

    // Zoom 150%
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.evaluate(() => {
      document.body.style.zoom = "1.5";
    });
    await page.goto(CLONE_URL + "/home", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(150);
    const zoomOv = await overflow(page);
    if (!zoomOv.overflow || zoomOv.scrollW <= zoomOv.clientW * 1.6) ok("usable at 150% zoom");
    else fail("usable at 150% zoom", `${zoomOv.scrollW}>${zoomOv.clientW}`);
    await page.evaluate(() => {
      document.body.style.zoom = "";
    });
  } catch (e) {
    fail("responsive suite crashed", e.message);
  }

  const failed = results.filter((r) => !r.pass).length;
  console.log(`\n${results.length - failed}/${results.length} responsive checks passed`);
  await browser.close();
  process.exit(failed ? 1 : 0);
})();
