#!/usr/bin/env node
/**
 * Dry-run legacy migration scanner — reads data/legacy-export/ or sample fixtures.
 */
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const LEGACY_DIR = path.join(ROOT, "data", "legacy-export");
const SAMPLE = path.join(ROOT, "data", "fixtures", "legacy-sample.json");

function loadRecords() {
  if (fs.existsSync(LEGACY_DIR)) {
    const files = fs.readdirSync(LEGACY_DIR).filter((f) => f.endsWith(".json"));
    const rows = [];
    for (const f of files) {
      const raw = JSON.parse(fs.readFileSync(path.join(LEGACY_DIR, f), "utf8"));
      if (Array.isArray(raw)) rows.push(...raw);
      else if (raw && typeof raw === "object") rows.push(raw);
    }
    return { source: "legacy-export", files: files.length, rows };
  }
  if (fs.existsSync(SAMPLE)) {
    const raw = JSON.parse(fs.readFileSync(SAMPLE, "utf8"));
    const rows = Array.isArray(raw) ? raw : [raw];
    return { source: "fixtures/legacy-sample.json", files: 1, rows };
  }
  return { source: "none", files: 0, rows: [] };
}

function scan(rows) {
  const stats = {
    total: rows.length,
    byType: {},
    missingEmail: 0,
    missingStatus: 0,
    unknownFields: new Set(),
  };
  for (const row of rows) {
    const type = row._type || row.type || "unknown";
    stats.byType[type] = (stats.byType[type] || 0) + 1;
    if (!row.email && type === "user") stats.missingEmail++;
    if (!row.status && (type === "user" || type === "requisition")) stats.missingStatus++;
    for (const key of Object.keys(row)) {
      if (key.startsWith("_legacy_")) stats.unknownFields.add(key);
    }
  }
  stats.unknownFields = [...stats.unknownFields];
  return stats;
}

function main() {
  const loaded = loadRecords();
  const stats = scan(loaded.rows);
  const report = {
    timestamp: new Date().toISOString(),
    source: loaded.source,
    filesScanned: loaded.files,
    stats,
    note: loaded.rows.length === 0 ? "No legacy data found; create data/fixtures/legacy-sample.json" : undefined,
  };
  console.log(JSON.stringify(report, null, 2));
}

main();
