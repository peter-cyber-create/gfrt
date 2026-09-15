/**
 * Read-only production reconnaissance orchestrator.
 * Never mutates production data. Never submits business forms.
 *
 * Steps:
 * 1. Health check
 * 2. If auth possible → save-session → crawl into data/live/
 * 3. Always write a status summary under data/live/
 */
require("dotenv").config();
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

process.env.PLAYWRIGHT_BROWSERS_PATH =
  process.env.PLAYWRIGHT_BROWSERS_PATH || "/home/peter/.cache/ms-playwright";

const ROOT = path.resolve(__dirname, "..");
const LIVE = path.join(ROOT, "data", "live");

function run(cmd, args, opts = {}) {
  console.log(`\n> ${cmd} ${args.join(" ")}`);
  const r = spawnSync(cmd, args, {
    cwd: ROOT,
    env: process.env,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...opts,
  });
  if (r.stdout) process.stdout.write(r.stdout);
  if (r.stderr) process.stderr.write(r.stderr);
  return r;
}

function copyIfExists(src, dest) {
  if (!fs.existsSync(src)) return false;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  return true;
}

function copyDirFiles(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) return 0;
  fs.mkdirSync(destDir, { recursive: true });
  let n = 0;
  for (const name of fs.readdirSync(srcDir)) {
    const s = path.join(srcDir, name);
    if (fs.statSync(s).isFile()) {
      fs.copyFileSync(s, path.join(destDir, name));
      n++;
    }
  }
  return n;
}

(async () => {
  fs.mkdirSync(LIVE, { recursive: true });
  const started = new Date().toISOString();

  const health = run("node", ["scripts/restore-check.js"]);
  copyIfExists(path.join(ROOT, "data/restore-check.json"), path.join(LIVE, "restore-check.json"));

  const healthJson = (() => {
    try {
      return JSON.parse(fs.readFileSync(path.join(ROOT, "data/restore-check.json"), "utf8"));
    } catch {
      return null;
    }
  })();

  const siteReachable = health.status === 0 && healthJson?.summary?.loginPageAvailable;
  let sessionOk = false;
  let crawlOk = false;
  let dbFailure = false;

  if (siteReachable) {
    const session = run("node", ["scripts/save-session.js"], {
      env: { ...process.env, HEADLESS: "1" },
    });
    sessionOk = session.status === 0;
    const combined = `${session.stdout || ""}\n${session.stderr || ""}`;
    dbFailure = /SQLSTATE|Connection refused/i.test(combined);

    if (sessionOk) {
      const crawl = run("node", ["scripts/crawl.js"], {
        env: { ...process.env, HEADLESS: "1" },
      });
      crawlOk = crawl.status === 0;

      for (const f of [
        "routes.json",
        "pages.json",
        "navigation.json",
        "forms.json",
        "assets.json",
        "application-map.json",
        "crawl-summary.json",
        "crawl-errors.json",
      ]) {
        copyIfExists(path.join(ROOT, "data", f), path.join(LIVE, f));
      }
      copyDirFiles(path.join(ROOT, "screenshots/desktop"), path.join(LIVE, "screenshots/desktop"));
      copyDirFiles(path.join(ROOT, "screenshots/mobile"), path.join(LIVE, "screenshots/mobile"));
    } else {
      console.log(
        dbFailure
          ? "\nAuth failed: production database appears down (SQLSTATE). Live crawl skipped."
          : "\nAuth failed: session not saved. Live crawl skipped."
      );
    }
  } else {
    console.log("\nSkipping auth/crawl — production site not reachable or login page unavailable.");
  }

  // Run reconciliation against whatever live data we have (may be stale/empty)
  run("node", ["scripts/reconcile.js"]);

  const summary = {
    at: started,
    finishedAt: new Date().toISOString(),
    siteReachable,
    sessionOk,
    crawlOk,
    databaseFailureSuspected: dbFailure,
    liveDir: "data/live/",
    note: crawlOk
      ? "Authenticated recon captured into data/live/."
      : dbFailure
        ? "Site reachable but production database refused connections during login. Presentation clone unchanged."
        : "Live snapshot not refreshed. Existing presentation clone unchanged.",
  };
  fs.writeFileSync(path.join(LIVE, "recon-summary.json"), JSON.stringify(summary, null, 2));
  console.log("\n=== production:recon complete ===");
  console.log(JSON.stringify(summary, null, 2));
  process.exit(0);
})();
