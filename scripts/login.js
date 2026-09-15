require("dotenv").config();

const { chromium } = require("playwright");
const fs = require("fs");

const BASE_URL = process.env.BASE_URL;
const EMAIL = process.env.MUSOOKA_EMAIL;
const PASSWORD = process.env.MUSOOKA_PASSWORD;

if (!BASE_URL || !EMAIL || !PASSWORD) {
  throw new Error(
    "Missing BASE_URL, MUSOOKA_EMAIL or MUSOOKA_PASSWORD in .env"
  );
}

(async () => {
  const browser = await chromium.launch({
    headless: false,
  });

  const context = await browser.newContext({
    viewport: {
      width: 1440,
      height: 900,
    },
  });

  const page = await context.newPage();

  // Helpful diagnostics.
  page.on("console", (msg) => {
    console.log(`[browser:${msg.type()}] ${msg.text()}`);
  });

  page.on("requestfailed", (request) => {
    console.log(
      `[request failed] ${request.method()} ${request.url()}`
    );
  });

  page.on("response", (response) => {
    if (response.status() >= 400) {
      console.log(
        `[HTTP ${response.status()}] ${response.request().method()} ${response.url()}`
      );
    }
  });

  console.log(`Opening ${BASE_URL}`);

  await page.goto(BASE_URL, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });

  await page.waitForSelector("#email", {
    state: "visible",
    timeout: 30000,
  });

  console.log("Login page detected.");

  await page.locator("#email").fill(EMAIL);
  await page.locator("#password").fill(PASSWORD);

  console.log("Credentials entered.");

  await page.screenshot({
    path: "screenshots/01-filled-login.png",
    fullPage: true,
  });

  // Click without waiting for Playwright navigation.
  await page.locator('button[type="submit"]').click({
    timeout: 30000,
  });

  console.log("Login button clicked.");

  // Give Laravel time to process the POST and redirect.
  await page.waitForTimeout(5000);

  console.log("\n========== LOGIN RESULT ==========");
  console.log("URL:", page.url());
  console.log("Title:", await page.title());

  await page.screenshot({
    path: "screenshots/02-after-login.png",
    fullPage: true,
  });

  console.log("Post-login screenshot saved.");

  // Inspect page text.
  const bodyText = await page.locator("body").innerText();

  console.log("\n========== PAGE TEXT PREVIEW ==========");
  console.log(bodyText.substring(0, 3000));

  // Check whether login form still exists.
  const loginForm = await page.locator(
    'form[action$="/login"]'
  ).count();

  if (loginForm > 0) {
    console.log("\n❌ Login form is still present.");

    const errors = await page.locator(
      ".alert, .invalid-feedback, .alert-danger, .alert-success"
    ).allTextContents();

    if (errors.length > 0) {
      console.log("\nApplication messages:");
      console.log(errors.join("\n"));
    }

    await browser.close();
    process.exit(1);
  }

  console.log("\n✅ Login form is no longer present.");
  console.log("Authentication may have succeeded.");

  // Save authenticated session.
  fs.mkdirSync("playwright/.auth", {
    recursive: true,
  });

  await context.storageState({
    path: "playwright/.auth/musooka.json",
  });

  console.log(
    "\nAuthenticated session saved:"
  );
  console.log(
    "playwright/.auth/musooka.json"
  );

  // Extract all links currently available.
  const links = await page.locator("a").evaluateAll((anchors) =>
    anchors.map((a) => ({
      text: a.innerText.trim().replace(/\s+/g, " "),
      href: a.href,
    }))
  );

  const baseHost = new URL(BASE_URL).hostname;

  const internalLinks = links.filter((link) => {
    try {
      const url = new URL(link.href);

      return (
        url.hostname === baseHost &&
        ["http:", "https:"].includes(url.protocol)
      );
    } catch {
      return false;
    }
  });

  fs.mkdirSync("data", {
    recursive: true,
  });

  fs.writeFileSync(
    "data/authenticated-links.json",
    JSON.stringify(internalLinks, null, 2)
  );

  console.log(
    `Saved ${internalLinks.length} internal links.`
  );

  console.log(
    "\n========== INTERNAL LINKS =========="
  );

  for (const link of internalLinks) {
    console.log(
      `${link.text || "(no text)"} → ${link.href}`
    );
  }

  console.log(
    "\nBrowser will remain open for 30 seconds."
  );

  await page.waitForTimeout(30000);

  await browser.close();
})();
