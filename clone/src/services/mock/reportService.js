import {
  buildDepartmentPerformance,
  buildStatusDistribution,
  computeMetricsFromRequisitions,
  pushAudit,
  pushNotification,
  resetDemoData,
  store,
} from "./store.js";

function delay(ms = 40) {
  return new Promise((r) => setTimeout(r, ms));
}

export const mockReportService = {
  async listCatalog(category = "All") {
    await delay();
    if (category === "All") return [...store.reports];
    return store.reports.filter((r) => r.category === category);
  },

  async getDashboard() {
    await delay();
    const metrics = computeMetricsFromRequisitions();
    const byStatus = buildStatusDistribution();
    const byDepartment = buildDepartmentPerformance();
    return {
      metrics,
      charts: {
        ...store.chartSeries,
        byStatus,
        byDepartment,
      },
      activities: store.activities,
      recentRequisitions: store.requisitions.slice(0, 5),
    };
  },

  async getPerformance() {
    await delay();
    const metrics = computeMetricsFromRequisitions();
    return {
      metrics,
      processingTime: store.chartSeries.processingTime,
      byDepartment: buildDepartmentPerformance(),
      overTime: store.chartSeries.overTime,
    };
  },

  async getAnalytics({ department = "All", status = "All", period, dateFrom, dateTo } = {}) {
    await delay();
    void period;
    let rows = [...store.requisitions];
    if (department !== "All") rows = rows.filter((r) => r.department === department);
    if (status !== "All") rows = rows.filter((r) => r.status === status || r.statusCode === status);
    if (dateFrom) rows = rows.filter((r) => (r.submitted || r.updated || "") >= dateFrom);
    if (dateTo) rows = rows.filter((r) => (r.submitted || r.updated || "").slice(0, 10) <= dateTo);
    return {
      metrics: computeMetricsFromRequisitions(rows),
      byStatus: buildStatusDistribution(rows),
      byDepartment: buildDepartmentPerformance(rows),
      overTime: store.chartSeries.overTime,
      rows,
      departments: [...new Set(store.requisitions.map((r) => r.department).filter(Boolean))],
    };
  },

  async exportCsv(actorOrFilters = "Demo User") {
    await delay();
    const actor = typeof actorOrFilters === "string" ? actorOrFilters : "Demo User";
    const header = "id,facility,district,department,status,statusCode,amount,submitted,requiredDate\n";
    const lines = store.requisitions
      .map((r) =>
        [r.id, r.facility, r.district, r.department, r.status, r.statusCode, r.amountValue, r.submitted, r.requiredDate || ""].join(",")
      )
      .join("\n");
    const blob = new Blob([header + lines], { type: "text/csv;charset=utf-8" });
    pushAudit({
      user: actor,
      action: "report.export",
      entity: "report",
      entityId: "csv",
      metadata: { rows: store.requisitions.length },
    });
    pushNotification("Report generated (demo CSV)");
    return blob;
  },

  async resetDemo(actor = "Demo Admin") {
    await delay();
    resetDemoData();
    pushAudit({
      user: actor,
      action: "demo.reset",
      entity: "store",
      entityId: "local",
    });
    return { ok: true };
  },

  async getPreferences() {
    await delay();
    return { ...store.preferences };
  },

  async savePreferences(prefs, actor = "Demo User") {
    await delay();
    store.preferences = { ...store.preferences, ...prefs };
    pushAudit({
      user: actor,
      action: "settings.update",
      entity: "preferences",
      entityId: "local",
      metadata: prefs,
    });
    return store.preferences;
  },
};
