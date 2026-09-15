/**
 * Authenticated (or public-fallback) crawler for musooka.site
 * READ-ONLY: GET navigation only. No mutations.
 */
require("dotenv").config();

const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");
const https = require("https");
const http = require("http");

const BASE_URL = (process.env.BASE_URL || "https://musooka.site").replace(/\/$/, "");
const BASE_HOST = new URL(BASE_URL).hostname;
const AUTH_PATH = path.join("playwright", ".auth", "musooka.json");
const HEADLESS = process.env.HEADLESS !== "0";
const MAX_PAGES = Number(process.env.MAX_PAGES || 80);

const SKIP_EXT = /\.(pdf|zip|rar|docx?|xlsx?|pptx?|csv|mp4|mp3|avi|mov|wmv|exe|dmg)(\?|$)/i;
const SOCIAL = /facebook\.com|twitter\.com|x\.com|linkedin\.com|instagram\.com|youtube\.com|whatsapp\.com/i;

function ensureDirs() {
  for (const d of [
    "data",
    "screenshots/desktop",
    "screenshots/mobile",
    "assets/images",
    "assets/icons",
    "assets/fonts",
    "assets/css",
    "assets/js",
    "playwright/.auth",
  ]) {
    fs.mkdirSync(d, { recursive: true });
  }
}

function normalizeUrl(href, base = BASE_URL) {
  try {
    if (!href || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:")) {
      return null;
    }
    const u = new URL(href, base);
    if (u.hostname !== BASE_HOST) return null;
    if (!["http:", "https:"].includes(u.protocol)) return null;
    if (SOCIAL.test(u.href)) return null;
    if (SKIP_EXT.test(u.pathname)) return null;
    // Drop hash; keep meaningful query for now but strip trailing slash inconsistently
    u.hash = "";
    let p = u.pathname;
    if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
    u.pathname = p;
    // Ignore logout as a crawl target
    if (u.pathname === "/logout") return null;
    return u.origin + u.pathname + u.search;
  } catch {
    return null;
  }
}

function slugFromUrl(url) {
  const u = new URL(url);
  let s = u.pathname.replace(/^\//, "").replace(/\//g, "__") || "root";
  if (u.search) s += "__" + Buffer.from(u.search).toString("base64url").slice(0, 24);
  return s.replace(/[^a-zA-Z0-9_\-]/g, "_").slice(0, 120);
}

function downloadFile(url, dest) {
  return new Promise((resolve) => {
    try {
      const proto = url.startsWith("https") ? https : http;
      const file = fs.createWriteStream(dest);
      const req = proto.get(url, { timeout: 30000 }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          file.close();
          fs.unlink(dest, () => {});
          return downloadFile(new URL(res.headers.location, url).href, dest).then(resolve);
        }
        if (res.statusCode !== 200) {
          file.close();
          fs.unlink(dest, () => {});
          return resolve(false);
        }
        res.pipe(file);
        file.on("finish", () => {
          file.close();
          resolve(true);
        });
      });
      req.on("error", () => {
        try {
          file.close();
          fs.unlink(dest, () => {});
        } catch {}
        resolve(false);
      });
    } catch {
      resolve(false);
    }
  });
}

async function extractPageData(page, url, status) {
  return page.evaluate(
    ({ url, status }) => {
      const text = (el) => (el ? (el.innerText || el.textContent || "").trim().replace(/\s+/g, " ") : "");
      const abs = (href) => {
        try {
          return new URL(href, location.href).href;
        } catch {
          return href;
        }
      };

      const links = [...document.querySelectorAll("a[href]")].map((a) => ({
        text: text(a).slice(0, 200),
        href: abs(a.getAttribute("href")),
      }));

      const headings = ["h1", "h2", "h3"].flatMap((tag) =>
        [...document.querySelectorAll(tag)].map((el) => ({ tag, text: text(el).slice(0, 300) }))
      );

      const forms = [...document.querySelectorAll("form")].map((f) => ({
        action: f.getAttribute("action") || "",
        method: (f.getAttribute("method") || "get").toLowerCase(),
        id: f.id || "",
        inputs: [...f.querySelectorAll("input, select, textarea")].map((inp) => ({
          tag: inp.tagName.toLowerCase(),
          type: inp.getAttribute("type") || (inp.tagName.toLowerCase() === "select" ? "select" : "text"),
          name: inp.getAttribute("name") || "",
          id: inp.id || "",
          placeholder: inp.getAttribute("placeholder") || "",
          required: inp.required || false,
        })),
      }));

      const buttons = [...document.querySelectorAll("button, input[type=submit], .btn")].map((b) => ({
        text: text(b).slice(0, 120) || b.getAttribute("value") || "",
        type: b.getAttribute("type") || "",
        classes: b.className || "",
      }));

      const images = [...document.querySelectorAll("img")].map((img) => ({
        src: abs(img.getAttribute("src") || ""),
        alt: img.getAttribute("alt") || "",
        width: img.naturalWidth || null,
        height: img.naturalHeight || null,
      }));

      const tables = [...document.querySelectorAll("table")].map((t) => ({
        headers: [...t.querySelectorAll("th")].map((th) => text(th)),
        rowCount: t.querySelectorAll("tr").length,
        classes: t.className || "",
      }));

      const css = [...document.querySelectorAll('link[rel="stylesheet"]')].map((l) => abs(l.href));
      const js = [...document.querySelectorAll("script[src]")].map((s) => abs(s.src));
      const iframes = [...document.querySelectorAll("iframe[src]")].map((i) => abs(i.src));

      const navLinks = [...document.querySelectorAll("nav a, .navbar a, .sidebar a, .nav a, #sidebar a, .main-sidebar a")]
        .map((a) => ({ text: text(a).slice(0, 200), href: abs(a.getAttribute("href")) }));

      const modals = [...document.querySelectorAll(".modal")].map((m) => ({
        id: m.id || "",
        title: text(m.querySelector(".modal-title")),
      }));

      const dropdowns = [...document.querySelectorAll(".dropdown, .dropdown-menu")].length;
      const tabs = [...document.querySelectorAll('[role="tab"], .nav-tabs .nav-link, .nav-pills .nav-link')].map((t) =>
        text(t)
      );
      const pagination = !!document.querySelector(".pagination, .page-item, nav[aria-label*=agination i]");
      const alerts = [...document.querySelectorAll(".alert")].map((a) => text(a).slice(0, 300));
      const cards = [...document.querySelectorAll(".card")].map((c) => ({
        header: text(c.querySelector(".card-header")).slice(0, 200),
        bodyPreview: text(c.querySelector(".card-body")).slice(0, 300),
      }));

      const bootstrap = {
        navbar: !!document.querySelector(".navbar"),
        sidebar: !!document.querySelector(".sidebar, .main-sidebar, #sidebar, .sidenav"),
        cards: cards.length,
        modals: modals.length,
        tables: tables.length,
        forms: forms.length,
        dropdowns,
        tabs: tabs.length,
        pagination,
        alerts: alerts.length,
      };

      const sections = [...document.querySelectorAll("header, nav, aside, main, footer, .content-wrapper, .content, #app > div")]
        .slice(0, 30)
        .map((el) => ({
          tag: el.tagName.toLowerCase(),
          id: el.id || "",
          classes: (el.className || "").toString().slice(0, 120),
        }));

      return {
        url,
        path: location.pathname + location.search,
        title: document.title || "",
        status,
        links,
        headings,
        forms,
        buttons,
        images,
        tables,
        css,
        js,
        iframes,
        navLinks,
        modals,
        tabs,
        pagination,
        alerts,
        cards,
        bootstrap,
        sections,
        visibleText: (document.body && document.body.innerText ? document.body.innerText : "").slice(0, 8000),
      };
    },
    { url, status }
  );
}

async function tryLogin(page, context) {
  const email = process.env.MUSOOKA_EMAIL;
  const password = process.env.MUSOOKA_PASSWORD;
  if (!email || !password) return false;

  console.log("Attempting login...");
  await page.goto(BASE_URL + "/login", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector("#email", { timeout: 20000 });
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(4000);

  const title = await page.title();
  const url = page.url();
  const stillLogin = url.includes("/login") || title.includes("SQLSTATE") || (await page.locator("#email").count()) > 0;

  if (stillLogin) {
    console.log("Login failed or DB unavailable. Title:", title.slice(0, 120));
    // Capture Ignition diagnostics (no secrets) if present
    try {
      const ignition = await page.evaluate(() => {
        const body = document.body ? document.body.innerText : "";
        return {
          title: document.title,
          url: location.href,
          preview: body.slice(0, 2000),
          hasIgnition: body.includes("SQLSTATE") || !!document.querySelector(". Ignition, [data-iframe], .tabs"),
        };
      });
      fs.writeFileSync("data/login-failure.json", JSON.stringify(ignition, null, 2));
    } catch {}
    return false;
  }

  await context.storageState({ path: AUTH_PATH });
  console.log("Authenticated session saved.");
  return true;
}

(async () => {
  ensureDirs();
  process.env.PLAYWRIGHT_BROWSERS_PATH =
    process.env.PLAYWRIGHT_BROWSERS_PATH || "/home/peter/.cache/ms-playwright";

  const browser = await chromium.launch({ headless: HEADLESS });
  const hasAuth = fs.existsSync(AUTH_PATH);
  let context;

  if (hasAuth) {
    console.log("Using existing storageState:", AUTH_PATH);
    context = await browser.newContext({
      storageState: AUTH_PATH,
      viewport: { width: 1440, height: 900 },
    });
  } else {
    context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  }

  const page = await context.newPage();
  page.setDefaultTimeout(45000);

  let authenticated = false;
  if (hasAuth) {
    await page.goto(BASE_URL + "/home", { waitUntil: "domcontentloaded", timeout: 60000 }).catch(() => {});
    authenticated = !page.url().includes("/login") && !(await page.title()).includes("SQLSTATE");
    if (!authenticated) {
      console.log("Saved session invalid; will try fresh login.");
    }
  }
  if (!authenticated) {
    authenticated = await tryLogin(page, context);
  }

  const seed = authenticated
    ? [BASE_URL + "/home", BASE_URL + "/", BASE_URL + "/users", BASE_URL + "/roles"]
    : [BASE_URL + "/", BASE_URL + "/login", BASE_URL + "/register", BASE_URL + "/password/reset"];

  const queue = [];
  const seen = new Set();
  for (const s of seed) {
    const n = normalizeUrl(s);
    if (n && !seen.has(n)) {
      seen.add(n);
      queue.push(n);
    }
  }

  const routes = [];
  const pagesData = [];
  const crawlErrors = [];
  const allAssets = new Set();
  const navAgg = { top: [], sidebar: [], footer: [] };
  const formsAgg = [];

  console.log(`Starting crawl (authenticated=${authenticated}), seeds=${queue.length}`);

  while (queue.length && routes.length < MAX_PAGES) {
    const url = queue.shift();
    const slug = slugFromUrl(url);
    console.log(`Crawl [${routes.length + 1}] ${url}`);

    let status = 0;
    try {
      const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
      status = res ? res.status() : 0;
      await page.waitForTimeout(800);
      try {
        await page.waitForLoadState("networkidle", { timeout: 8000 });
      } catch {}

      const data = await extractPageData(page, url, status);
      routes.push({
        url: data.url,
        path: data.path,
        title: data.title,
        status: data.status,
        links: data.links.map((l) => l.href),
        headings: data.headings,
        forms: data.forms,
        buttons: data.buttons.map((b) => b.text),
        images: data.images,
      });
      pagesData.push(data);
      formsAgg.push(...data.forms.map((f) => ({ page: data.path, ...f })));

      for (const href of [...data.css, ...data.js, ...data.images.map((i) => i.src)]) {
        if (href && href.includes(BASE_HOST)) allAssets.add(href);
      }

      if (data.bootstrap.navbar) {
        navAgg.top.push(...data.navLinks);
      }
      if (data.bootstrap.sidebar) {
        navAgg.sidebar.push(...data.navLinks);
      }

      // Desktop screenshot
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.screenshot({
        path: path.join("screenshots/desktop", `${slug}.png`),
        fullPage: true,
      });

      // Mobile screenshot
      await page.setViewportSize({ width: 390, height: 844 });
      await page.screenshot({
        path: path.join("screenshots/mobile", `${slug}.png`),
        fullPage: true,
      });
      await page.setViewportSize({ width: 1440, height: 900 });

      // Enqueue internal links discovered on this page
      for (const link of data.links) {
        const n = normalizeUrl(link.href, url);
        if (n && !seen.has(n)) {
          seen.add(n);
          queue.push(n);
        }
      }
    } catch (err) {
      console.log("  ERROR:", err.message.slice(0, 160));
      crawlErrors.push({ url, error: err.message, at: new Date().toISOString() });
    }
  }

  // Dedupe navigation
  const dedupeNav = (arr) => {
    const m = new Map();
    for (const item of arr) {
      const n = normalizeUrl(item.href);
      if (!n) continue;
      if (!m.has(n)) m.set(n, { text: item.text, href: n });
    }
    return [...m.values()];
  };

  const navigation = {
    authenticated,
    top: dedupeNav(navAgg.top),
    sidebar: dedupeNav(navAgg.sidebar),
    allInternal: [...seen],
  };

  // Download first-party assets
  const assetManifest = [];
  for (const assetUrl of allAssets) {
    try {
      const u = new URL(assetUrl);
      if (u.hostname !== BASE_HOST) continue;
      const ext = path.extname(u.pathname).toLowerCase();
      let folder = "images";
      if ([".css"].includes(ext)) folder = "css";
      else if ([".js"].includes(ext)) folder = "js";
      else if ([".woff", ".woff2", ".ttf", ".otf", ".eot"].includes(ext)) folder = "fonts";
      else if ([".svg", ".ico"].includes(ext)) folder = "icons";
      else if ([".png", ".jpg", ".jpeg", ".gif", ".webp"].includes(ext)) folder = "images";
      else continue;

      const fname = path.basename(u.pathname) || "asset";
      const dest = path.join("assets", folder, fname);
      if (!fs.existsSync(dest)) {
        const ok = await downloadFile(assetUrl, dest);
        assetManifest.push({ url: assetUrl, local: dest, ok });
        console.log(ok ? `Asset OK ${fname}` : `Asset FAIL ${assetUrl}`);
      } else {
        assetManifest.push({ url: assetUrl, local: dest, ok: true, cached: true });
      }
    } catch (e) {
      assetManifest.push({ url: assetUrl, ok: false, error: e.message });
    }
  }

  // Also ensure logo + favicon
  for (const extra of ["/img/coa2.png", "/favicon.ico"]) {
    const destFolder = extra.endsWith(".ico") ? "icons" : "images";
    const dest = path.join("assets", destFolder, path.basename(extra));
    if (!fs.existsSync(dest)) {
      await downloadFile(BASE_URL + extra, dest);
    }
  }

  const applicationMap = {
    observedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    authenticatedCrawl: authenticated,
    note: authenticated
      ? "Authenticated crawl completed."
      : "Production database connection refused during login; crawl limited to publicly reachable pages and known auth-gated route redirects observed earlier (/home, /users, /roles, /api/user).",
    authentication: {
      loginUrl: BASE_URL + "/login",
      loginPage: BASE_URL + "/",
      fields: ["email", "password", "remember"],
      csrf: true,
      sessionBased: true,
      registerUrl: BASE_URL + "/register",
      passwordResetUrl: BASE_URL + "/password/reset",
      logout: "POST /logout",
    },
    serverHints: {
      documentRoot: "/var/www/psdashboard/",
      framework: "Laravel",
      softDeletesOnUsers: true,
    },
    knownAuthGatedRoutes: authenticated
      ? []
      : [
          { path: "/home", evidence: "GET redirects to /login" },
          { path: "/users", evidence: "GET redirects to /login" },
          { path: "/roles", evidence: "GET redirects to /login" },
          { path: "/api/user", evidence: "GET redirects to /login" },
        ],
    dashboard: authenticated ? { path: "/home", observed: true } : { path: "/home", observed: false, reason: "auth unavailable" },
    sidebar: { observed: navigation.sidebar.length > 0, links: navigation.sidebar },
    topNavigation: { observed: navigation.top.length > 0, links: navigation.top },
    modules: routes.map((r) => ({ path: r.path, title: r.title, status: r.status })),
    pages: routes.map((r) => r.path),
    forms: formsAgg.map((f) => ({ page: f.page, action: f.action, method: f.method, inputs: f.inputs.map((i) => i.name).filter(Boolean) })),
    reports: [],
    tables: pagesData.flatMap((p) => p.tables.map((t) => ({ page: p.path, headers: t.headers }))),
    settings: [],
    userManagement: { path: "/users", observedUi: authenticated },
    roleRelatedUi: { path: "/roles", observedUi: authenticated },
    otherAccessibleModules: routes.filter((r) => !["/login", "/", "/register", "/password/reset"].includes(r.path.replace(/\/$/, "") || "/")),
  };

  fs.writeFileSync("data/routes.json", JSON.stringify(routes, null, 2));
  fs.writeFileSync("data/pages.json", JSON.stringify(pagesData, null, 2));
  fs.writeFileSync("data/navigation.json", JSON.stringify(navigation, null, 2));
  fs.writeFileSync("data/assets.json", JSON.stringify(assetManifest, null, 2));
  fs.writeFileSync("data/forms.json", JSON.stringify(formsAgg, null, 2));
  fs.writeFileSync("data/crawl-errors.json", JSON.stringify(crawlErrors, null, 2));
  fs.writeFileSync("data/application-map.json", JSON.stringify(applicationMap, null, 2));
  fs.writeFileSync(
    "data/crawl-summary.json",
    JSON.stringify(
      {
        authenticated,
        routeCount: routes.length,
        pageCount: pagesData.length,
        assetCount: assetManifest.filter((a) => a.ok).length,
        errorCount: crawlErrors.length,
        at: new Date().toISOString(),
      },
      null,
      2
    )
  );

  console.log("\n=== CRAWL COMPLETE ===");
  console.log("Authenticated:", authenticated);
  console.log("Routes:", routes.length);
  console.log("Errors:", crawlErrors.length);
  console.log("Assets downloaded:", assetManifest.filter((a) => a.ok).length);

  await browser.close();
})().catch((err) => {
  console.error("Crawl failed:", err);
  process.exit(1);
});
