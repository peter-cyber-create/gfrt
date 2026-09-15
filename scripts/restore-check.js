/**
 * Non-mutating production health check.
 * Never logs in. Never submits forms. Never hangs indefinitely.
 */
require("dotenv").config();
const dns = require("dns").promises;
const net = require("net");
const tls = require("tls");
const https = require("https");
const fs = require("fs");
const { URL } = require("url");

const BASE = (process.env.BASE_URL || "https://musooka.site").replace(/\/$/, "");
const TIMEOUT_MS = Number(process.env.HEALTH_TIMEOUT_MS || 12000);

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)),
  ]);
}

async function checkDns(hostname) {
  try {
    const addresses = await withTimeout(dns.lookup(hostname, { all: true }), TIMEOUT_MS, "DNS");
    return { ok: true, addresses: addresses.map((a) => a.address) };
  } catch (e) {
    return { ok: false, error: e.message, classification: "network_failure" };
  }
}

function checkTcp(hostname, port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const timer = setTimeout(() => {
      socket.destroy();
      resolve({ ok: false, error: "TCP timeout", classification: "network_failure" });
    }, TIMEOUT_MS);
    socket.connect(port, hostname, () => {
      clearTimeout(timer);
      socket.end();
      resolve({ ok: true });
    });
    socket.on("error", (e) => {
      clearTimeout(timer);
      resolve({ ok: false, error: e.message, classification: "network_failure" });
    });
  });
}

function checkTls(hostname, port) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      resolve({ ok: false, error: "TLS timeout", classification: "tls_failure" });
    }, TIMEOUT_MS);
    const socket = tls.connect({ host: hostname, port, servername: hostname, rejectUnauthorized: false }, () => {
      clearTimeout(timer);
      const cert = socket.getPeerCertificate();
      const authorized = socket.authorized;
      socket.end();
      resolve({
        ok: true,
        authorized,
        subject: cert?.subject?.CN || null,
        valid_to: cert?.valid_to || null,
      });
    });
    socket.on("error", (e) => {
      clearTimeout(timer);
      resolve({ ok: false, error: e.message, classification: "tls_failure" });
    });
  });
}

function fetchHttp(url) {
  return new Promise((resolve) => {
    const req = https.get(
      url,
      { timeout: TIMEOUT_MS, headers: { "User-Agent": "musooka-recon-health/1.0" }, rejectUnauthorized: true },
      (res) => {
        let body = "";
        res.on("data", (c) => {
          if (body.length < 8000) body += c.toString();
        });
        res.on("end", () => {
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 500,
            status: res.statusCode,
            headers: {
              server: res.headers.server || null,
              "x-powered-by": res.headers["x-powered-by"] || null,
            },
            bodyPreview: body.slice(0, 1500),
          });
        });
      }
    );
    req.on("timeout", () => {
      req.destroy();
      resolve({ ok: false, error: "HTTP timeout", classification: "web_server_failure" });
    });
    req.on("error", (e) => {
      resolve({ ok: false, error: e.message, classification: "web_server_failure" });
    });
  });
}

function classifyLaravel(loginResult) {
  const body = loginResult.bodyPreview || "";
  const titleMatch = body.match(/<title>([^<]*)<\/title>/i);
  const title = titleMatch ? titleMatch[1] : "";
  if (body.includes("SQLSTATE") || title.includes("SQLSTATE")) {
    return { laravelOk: true, databaseOk: false, classification: "database_failure", title };
  }
  if (loginResult.status === 200 && (body.includes('id="email"') || body.includes("Login"))) {
    return { laravelOk: true, databaseOk: null, classification: "ok_login_available", title };
  }
  if (loginResult.status >= 500) {
    return { laravelOk: false, databaseOk: null, classification: "laravel_failure", title };
  }
  if (!loginResult.ok) {
    return { laravelOk: false, databaseOk: null, classification: loginResult.classification || "web_server_failure", title };
  }
  return { laravelOk: true, databaseOk: null, classification: "unknown", title };
}

(async () => {
  const url = new URL(BASE);
  const hostname = url.hostname;
  const port = Number(url.port || 443);

  const report = {
    at: new Date().toISOString(),
    baseUrl: BASE,
    checks: {},
    summary: {},
  };

  report.checks.dns = await checkDns(hostname);
  report.checks.tcp443 = report.checks.dns.ok ? await checkTcp(hostname, port) : { ok: false, skipped: true };
  report.checks.tls = report.checks.tcp443.ok ? await checkTls(hostname, port) : { ok: false, skipped: true };
  report.checks.httpRoot = report.checks.tls.ok || report.checks.tcp443.ok ? await fetchHttp(BASE + "/") : { ok: false, skipped: true };
  report.checks.httpLogin = report.checks.tcp443.ok ? await fetchHttp(BASE + "/login") : { ok: false, skipped: true };

  const laravel = classifyLaravel(report.checks.httpLogin);
  report.summary = {
    dns: !!report.checks.dns.ok,
    tcp443: !!report.checks.tcp443.ok,
    tls: !!report.checks.tls.ok,
    http: !!report.checks.httpRoot.ok || !!report.checks.httpLogin.ok,
    laravel: laravel.laravelOk,
    loginPageAvailable:
      laravel.classification === "ok_login_available" ||
      (laravel.laravelOk && report.checks.httpLogin.status === 200),
    database: laravel.databaseOk,
    classification: laravel.classification,
    title: laravel.title,
    // GET-only check cannot prove DB auth works — save-session verifies that.
    readyForAuthCrawl: false,
    note:
      "restore:check does not log in. Login page availability ≠ database health. Run npm run save-session to verify authentication.",
  };

  fs.mkdirSync("data", { recursive: true });
  fs.writeFileSync("data/restore-check.json", JSON.stringify(report, null, 2));

  const siteUp = report.summary.dns && report.summary.tcp443 && report.summary.loginPageAvailable;
  console.log("=== Production health check (read-only, no login) ===");
  console.log(JSON.stringify(report.summary, null, 2));
  console.log(
    siteUp
      ? "SITE REACHABLE — login page available. Auth/DB not verified (no login performed)."
      : "SITE NOT READY — network/TLS/HTTP/login page issue."
  );
  process.exit(siteUp ? 0 : 2);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
