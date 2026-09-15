#!/usr/bin/env node
/**
 * Production configuration gate — validates env WITHOUT printing secret values.
 * Does not connect to or modify any database.
 *
 * Usage:
 *   NODE_ENV=production ENV_FILE=path/to/prod.env npm run production:config-check
 *   # or export vars in the environment first
 */
const fs = require("node:fs");
const path = require("node:path");

const failures = [];
const warnings = [];

function fail(msg) {
  failures.push(msg);
  console.log(`FAIL  ${msg}`);
}
function warn(msg) {
  warnings.push(msg);
  console.log(`WARN  ${msg}`);
}
function ok(msg) {
  console.log(`OK    ${msg}`);
}

function loadEnvFile(filePath) {
  if (!filePath) return;
  const abs = path.resolve(filePath);
  if (!fs.existsSync(abs)) {
    fail(`ENV_FILE not found: ${abs}`);
    return;
  }
  const text = fs.readFileSync(abs, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
  ok(`Loaded ENV_FILE (${path.basename(abs)}) — values not printed`);
}

function has(key) {
  return process.env[key] !== undefined && String(process.env[key]).length > 0;
}

function lower(key) {
  return String(process.env[key] || "").toLowerCase();
}

function main() {
  loadEnvFile(process.env.ENV_FILE);

  const nodeEnv = process.env.NODE_ENV || "";
  if (nodeEnv !== "production") {
    fail(`NODE_ENV must be "production" (got "${nodeEnv || "(empty)"}")`);
  } else {
    ok("NODE_ENV=production");
  }

  // Frontend build flags (if present in env file / CI)
  if (has("VITE_DEMO_MODE") && String(process.env.VITE_DEMO_MODE) === "true") {
    fail("VITE_DEMO_MODE=true is forbidden for production");
  } else if (has("VITE_DEMO_MODE")) {
    ok("VITE_DEMO_MODE is not true");
  }

  if (has("VITE_DATA_SOURCE") && process.env.VITE_DATA_SOURCE !== "api") {
    fail('VITE_DATA_SOURCE must be "api" for production builds when set');
  }

  if (!has("DATABASE_URL")) {
    fail("DATABASE_URL is required");
  } else {
    const db = lower("DATABASE_URL");
    if (db.includes("musooka_dev") || db.includes("musooka_test") || db.includes("musooka_dev_only")) {
      fail("DATABASE_URL points at development/test database naming");
    } else if (db.includes("127.0.0.1") || db.includes("localhost")) {
      warn("DATABASE_URL appears to use localhost — verify this is intentional for production");
    } else {
      ok("DATABASE_URL present (value redacted)");
    }
  }

  if (!has("SESSION_SECRET")) {
    fail("SESSION_SECRET is required");
  } else {
    const secret = process.env.SESSION_SECRET;
    if (secret.length < 32) fail("SESSION_SECRET must be at least 32 characters");
    const s = secret.toLowerCase();
    for (const frag of ["replace", "change-me", "local-dev", "devonly", "password", "secret123"]) {
      if (s.includes(frag)) fail(`SESSION_SECRET contains weak fragment "${frag}"`);
    }
    if (!failures.some((f) => f.includes("SESSION_SECRET"))) ok("SESSION_SECRET length/strength checks passed (value redacted)");
  }

  if (String(process.env.COOKIE_SECURE) !== "true") {
    fail('COOKIE_SECURE must be "true" in production');
  } else {
    ok("COOKIE_SECURE=true");
  }

  if (!has("CORS_ORIGIN")) {
    fail("CORS_ORIGIN is required");
  } else {
    const cors = process.env.CORS_ORIGIN;
    if (cors.includes("*")) fail("CORS_ORIGIN must not contain wildcards");
    if (/localhost|127\.0\.0\.1/i.test(cors)) fail("CORS_ORIGIN must not include localhost/127.0.0.1");
    if (!failures.some((f) => f.includes("CORS_ORIGIN"))) ok("CORS_ORIGIN allowlist shape OK (value redacted)");
  }

  if (process.env.EMAIL_PROVIDER === "mock" || !has("EMAIL_PROVIDER")) {
    fail('EMAIL_PROVIDER must be "smtp" in production');
  } else if (process.env.EMAIL_PROVIDER !== "smtp") {
    fail(`EMAIL_PROVIDER invalid: ${process.env.EMAIL_PROVIDER}`);
  } else {
    ok("EMAIL_PROVIDER=smtp");
  }

  if (!has("SMTP_HOST") || !has("SMTP_FROM")) {
    fail("SMTP_HOST and SMTP_FROM are required");
  } else {
    const host = lower("SMTP_HOST");
    if (host.includes("mailpit") || host.includes("mailhog") || host === "localhost" || host === "127.0.0.1") {
      fail("SMTP_HOST must not be Mailpit/Mailhog/localhost");
    } else {
      ok("SMTP_HOST looks non-lab (value redacted)");
    }
  }

  if (!has("PASSWORD_RESET_URL_BASE")) {
    fail("PASSWORD_RESET_URL_BASE is required");
  } else if (!/^https:\/\//i.test(process.env.PASSWORD_RESET_URL_BASE)) {
    fail("PASSWORD_RESET_URL_BASE must be https://");
  } else {
    ok("PASSWORD_RESET_URL_BASE is https (value redacted)");
  }

  if (has("FORCE_TX_FAILURE")) {
    fail("FORCE_TX_FAILURE is forbidden in production");
  } else {
    ok("FORCE_TX_FAILURE unset");
  }

  if (has("VITE_DEMO_PASSWORD") || has("VITE_DEMO_EMAIL")) {
    warn("VITE_DEMO_* present — ensure they are not baked into production frontend builds");
  }

  console.log("");
  if (failures.length) {
    console.log(`RESULT: FAIL (${failures.length} error(s), ${warnings.length} warning(s))`);
    process.exit(1);
  }
  console.log(`RESULT: PASS (${warnings.length} warning(s))`);
}

main();
