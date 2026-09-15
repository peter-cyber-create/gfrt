/**
 * Compare data/live (if present) with the local presentation clone assumptions.
 * Does NOT overwrite the clone — report differences only.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const LIVE = path.join(ROOT, "data", "live");
const LOCAL_ROUTES = [
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
const LOCAL_NAV = [
  "/home",
  "/requisitions",
  "/performance",
  "/users",
  "/roles",
  "/reports",
  "/analytics",
  "/settings",
];

function readJson(p) {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

function uniq(arr) {
  return [...new Set(arr)];
}

(function main() {
  const liveRoutes = readJson(path.join(LIVE, "routes.json"));
  const liveNav = readJson(path.join(LIVE, "navigation.json"));
  const livePages = readJson(path.join(LIVE, "pages.json"));
  const liveMap = readJson(path.join(LIVE, "application-map.json"));
  const liveSummary = readJson(path.join(LIVE, "recon-summary.json"));
  const restore = readJson(path.join(LIVE, "restore-check.json")) || readJson(path.join(ROOT, "data/restore-check.json"));

  const livePaths = liveRoutes
    ? uniq(liveRoutes.map((r) => (r.path || "").split("?")[0] || "/"))
    : [];

  const onlyLocal = LOCAL_ROUTES.filter((p) => !livePaths.includes(p));
  const onlyLive = livePaths.filter((p) => !LOCAL_ROUTES.includes(p) && p !== "/");
  const shared = LOCAL_ROUTES.filter((p) => livePaths.includes(p));

  const liveTitles = {};
  if (livePages) {
    for (const p of livePages) {
      liveTitles[p.path?.split("?")[0] || p.url] = p.title;
    }
  }

  const formDiffs = [];
  if (livePages) {
    for (const page of livePages) {
      const pathKey = (page.path || "").split("?")[0];
      if (!LOCAL_ROUTES.includes(pathKey) && pathKey !== "/") continue;
      formDiffs.push({
        path: pathKey,
        liveFormCount: (page.forms || []).length,
        liveButtons: (page.buttons || []).slice(0, 20),
        liveHeadings: (page.headings || []).slice(0, 20),
        liveTables: (page.tables || []).length,
      });
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    productionStatus: restore?.summary || null,
    liveDataPresent: !!liveRoutes,
    liveRecon: liveSummary,
    routes: {
      localCount: LOCAL_ROUTES.length,
      liveCount: livePaths.length,
      shared,
      onlyInLocalClone: onlyLocal,
      onlyInLive: onlyLive,
    },
    navigation: {
      local: LOCAL_NAV,
      liveTop: liveNav?.top || [],
      liveSidebar: liveNav?.sidebar || [],
      note: liveNav
        ? "Compare live sidebar/top with local navSections in clone/src/data/mock.js"
        : "No live navigation captured yet",
    },
    pages: {
      liveTitles,
      formAndSectionDiffs: formDiffs,
    },
    applicationMapLive: liveMap
      ? {
          authenticatedCrawl: liveMap.authenticatedCrawl,
          knownAuthGatedRoutes: liveMap.knownAuthGatedRoutes,
        }
      : null,
    recommendations: [
      liveRoutes
        ? "Review onlyInLive routes and add presentation pages if they are core modules."
        : "Run npm run production:recon when the production database is healthy.",
      "Do not auto-overwrite local clone; update pages intentionally after review.",
      "Treat proposed RBAC/status codes as provisional until live UI confirms them.",
    ],
  };

  fs.mkdirSync(path.join(ROOT, "data"), { recursive: true });
  fs.writeFileSync(path.join(ROOT, "data/reconciliation-report.json"), JSON.stringify(report, null, 2));

  const md = `# Reconciliation Report

Generated: ${report.generatedAt}

## Production status

\`\`\`
${JSON.stringify(report.productionStatus, null, 2)}
\`\`\`

## Live data present

${report.liveDataPresent ? "Yes — data/live/routes.json found" : "No — authenticated live crawl has not succeeded yet"}

## Routes

| Set | Count |
|-----|------:|
| Local clone | ${report.routes.localCount} |
| Live captured | ${report.routes.liveCount} |

### Shared
${report.routes.shared.map((p) => `- \`${p}\``).join("\n") || "_none_"}

### Only in local clone (presentation extensions / reconstructions)
${report.routes.onlyInLocalClone.map((p) => `- \`${p}\``).join("\n") || "_none_"}

### Only in live
${report.routes.onlyInLive.map((p) => `- \`${p}\``).join("\n") || "_none_"}

## Navigation

Local nav paths: ${LOCAL_NAV.map((p) => `\`${p}\``).join(", ")}

Live sidebar entries: ${report.navigation.liveSidebar.length}
Live top entries: ${report.navigation.liveTop.length}

## Recommendations

${report.recommendations.map((r) => `- ${r}`).join("\n")}

## Notes

- This report does **not** mutate the local presentation clone.
- Proposed lifecycle statuses and RBAC permissions remain provisional until verified against live UI.
`;

  fs.writeFileSync(path.join(ROOT, "data/reconciliation-report.md"), md);
  console.log("Wrote data/reconciliation-report.json and data/reconciliation-report.md");
})();
