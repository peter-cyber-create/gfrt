import { STATUS_CODE_TO_LABEL } from "../../data/config.js";
import { canTransition, labelToStatusCode } from "../../domain/requisitionLifecycle.js";
import { pushAudit, pushNotification, store } from "./store.js";

function delay(ms = 40) {
  return new Promise((r) => setTimeout(r, ms));
}

export const mockRequisitionService = {
  async list(filters = {}) {
    await delay();
    let rows = [...store.requisitions];
    const q = (filters.query || "").trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (r) =>
          r.id.toLowerCase().includes(q) ||
          r.facility.toLowerCase().includes(q) ||
          r.district.toLowerCase().includes(q) ||
          r.requester.toLowerCase().includes(q) ||
          (r.department || "").toLowerCase().includes(q)
      );
    }
    if (filters.status && filters.status !== "All") {
      if (filters.status === "Pending") {
        rows = rows.filter((r) => r.status === "Processing" || r.statusCode === "PROCESSING");
      } else {
        rows = rows.filter((r) => r.status === filters.status);
      }
    }
    if (filters.department && filters.department !== "All") {
      rows = rows.filter((r) => r.department === filters.department);
    }
    if (filters.dateFrom) {
      rows = rows.filter((r) => r.submitted >= filters.dateFrom);
    }

    const sortKey = filters.sort || "updated";
    const dir = filters.sortDir === "asc" ? 1 : -1;
    rows.sort((a, b) => {
      const av = a[sortKey] ?? "";
      const bv = b[sortKey] ?? "";
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
    return rows;
  },

  async getById(id) {
    await delay();
    const row = store.requisitions.find((r) => r.id === id) || null;
    if (row) {
      pushAudit({
        user: "viewer",
        action: "requisition.view",
        entity: "requisition",
        entityId: id,
      });
    }
    return row ? JSON.parse(JSON.stringify(row)) : null;
  },

  async transition(id, toCode, { actor = "Demo User", note = "" } = {}) {
    await delay();
    const row = store.requisitions.find((r) => r.id === id);
    if (!row) return { ok: false, message: "Not found" };
    const fromCode = row.statusCode || labelToStatusCode(row.status);
    if (!canTransition(fromCode, toCode)) {
      return { ok: false, message: `Cannot transition ${fromCode} → ${toCode}` };
    }
    row.statusCode = toCode;
    row.status = STATUS_CODE_TO_LABEL[toCode] || toCode;
    row.updated = new Date().toISOString().slice(0, 10);
    row.comments = row.comments || [];
    if (note) {
      row.comments.push({
        id: `C-${Date.now()}`,
        actor,
        at: new Date().toISOString(),
        text: note,
      });
    }
    row.history = row.history || [];
    row.history.push({
      id: `${id}-H${row.history.length + 1}`,
      requisitionId: id,
      fromStatus: fromCode,
      toStatus: toCode,
      actor,
      at: new Date().toISOString(),
      note,
    });
    if (toCode === "APPROVED" || toCode === "REJECTED") {
      row.approvals = row.approvals || [];
      row.approvals.push({
        id: `AP-${Date.now()}`,
        requisitionId: id,
        actor,
        decision: toCode,
        at: new Date().toISOString(),
        comment: note,
      });
      pushNotification(`Requisition ${id} ${toCode === "APPROVED" ? "approved" : "rejected"} by ${actor}`);
    } else if (toCode === "UNDER_REVIEW") {
      pushNotification(`Requisition ${id} requires review`);
    } else if (toCode === "SUBMITTED") {
      pushNotification(`Requisition ${id} submitted`);
    }
    pushAudit({
      user: actor,
      action: `requisition.${toCode.toLowerCase()}`,
      entity: "requisition",
      entityId: id,
      metadata: { from: fromCode, to: toCode, note },
    });
    store.activities.unshift({
      id: `ACT-${Date.now()}`,
      type: toCode.toLowerCase(),
      title: `Requisition ${STATUS_CODE_TO_LABEL[toCode] || toCode}`,
      detail: `${id} → ${STATUS_CODE_TO_LABEL[toCode]} by ${actor}`,
      time: new Date().toISOString().replace("T", " ").slice(0, 16),
      actor,
    });
    return { ok: true, requisition: JSON.parse(JSON.stringify(row)) };
  },

  async confirmLocal(id, actor = "Demo User") {
    await delay();
    pushAudit({
      user: actor,
      action: "requisition.view_confirm",
      entity: "requisition",
      entityId: id,
      metadata: { localOnly: true },
    });
    return { ok: true };
  },

  nextActions(statusCode) {
    const { ALLOWED_TRANSITIONS } = require("../../domain/requisitionLifecycle.js");
    return ALLOWED_TRANSITIONS[statusCode] || [];
  },
};
