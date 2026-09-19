#!/usr/bin/env node
/**
 * Password reset E2E: request → Mailpit → confirm → login.
 */
const fs = require("node:fs");
const path = require("node:path");

require("dotenv").config({ path: path.resolve(__dirname, "../infra/staging/.env"), quiet: true });

const STAGING_URL = process.env.STAGING_URL || "http://127.0.0.1:8088";
if (STAGING_URL.startsWith("https://") && STAGING_URL.includes("127.0.0.1")) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}
const MAILPIT = process.env.MAILPIT_URL || "http://127.0.0.1:8025";
const USER_EMAIL = process.env.STAGING_USER_EMAIL || "user@gfrt.local";
const OLD_PASSWORD = process.env.STAGING_SEED_PASSWORD || process.env.SMOKE_PASSWORD || "";

if (!OLD_PASSWORD) {
  console.error("STAGING_SEED_PASSWORD (or SMOKE_PASSWORD) must be set — load infra/staging/.env or export it.");
  process.exit(2);
}
const NEW_PASSWORD = process.env.STAGING_NEW_PASSWORD || "ResetOk!NewPass456";
const OUT = path.resolve(__dirname, "../data/staging-password-reset-e2e.json");

const results = [];
function record(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "OK  " : "FAIL"} ${name}${detail ? `: ${detail}` : ""}`);
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function pollMailpitLink() {
  for (let i = 0; i < 20; i++) {
    const res = await fetch(`${MAILPIT}/api/v1/messages`);
    const data = await res.json();
    const msg = (data.messages || []).find((m) =>
      (m.To || []).some((t) => (t.Address || t).includes("user@staging"))
    );
    if (msg) {
      const detail = await fetch(`${MAILPIT}/api/v1/message/${msg.ID}`);
      const body = await detail.json();
      const text = body.Text || body.HTML || "";
      const match = text.match(/https?:\/\/[^\s"'<>]+token=[^\s"'<>]+/);
      if (match) return match[0].replace(/&amp;/g, "&");
    }
    await sleep(1000);
  }
  return null;
}

async function login(email, password) {
  const res = await fetch(`${STAGING_URL}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return res.status;
}

async function main() {
  const req = await fetch(`${STAGING_URL}/api/v1/auth/password-reset/request`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ email: USER_EMAIL }),
  });
  record("request reset", req.ok, String(req.status));

  const link = await pollMailpitLink();
  record("mailpit link", !!link, link ? "link received (token redacted)" : "not found");

  let token = "";
  if (link) {
    const u = new URL(link);
    token = u.searchParams.get("token") || "";
  }

  const confirm = await fetch(`${STAGING_URL}/api/v1/auth/password-reset/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ token, password: NEW_PASSWORD }),
  });
  record("confirm new password", confirm.ok, String(confirm.status));

  const newLogin = await login(USER_EMAIL, NEW_PASSWORD);
  record("login new password", newLogin === 200, String(newLogin));

  const oldLogin = await login(USER_EMAIL, OLD_PASSWORD);
  record("old password fails", oldLogin === 401, String(oldLogin));

  const reuse = await fetch(`${STAGING_URL}/api/v1/auth/password-reset/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ token, password: "AnotherPass789!" }),
  });
  record("reuse token fails", reuse.status === 400, String(reuse.status));

  const report = {
    timestamp: new Date().toISOString(),
    stagingUrl: STAGING_URL,
    results,
    passed: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(`Wrote ${OUT}`);

  if (report.failed) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
