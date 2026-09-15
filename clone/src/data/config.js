/** Presentation configuration — no production API. */

export const APP_NAME =
  import.meta.env.VITE_APP_NAME || "Global Fund Requisition Performance Tracker";

export const DEMO_MODE = String(import.meta.env.VITE_DEMO_MODE ?? "true") !== "false";

/** Service backend selector. Demo always uses mock. */
export const DATA_SOURCE = import.meta.env.VITE_DATA_SOURCE || (DEMO_MODE ? "mock" : "api");

export const DEPARTMENTS = [
  "HIV/AIDS",
  "TB/Leprosy",
  "Malaria",
  "Health Systems",
  "Laboratory",
  "Procurement",
];

export const DISTRICTS = [
  "Kampala",
  "Jinja",
  "Mbarara",
  "Gulu",
  "Kabarole",
  "Soroti",
  "Lira",
  "Arua",
  "Mbale",
  "Masaka",
];

/**
 * Proposed requisition lifecycle (NOT verified against production).
 * Display labels keep the current UI readable for the presentation.
 */
export const REQUISITION_STATUS_CODES = [
  "DRAFT",
  "SUBMITTED",
  "UNDER_REVIEW",
  "APPROVED",
  "REJECTED",
  "PROCESSING",
  "COMPLETED",
  "CANCELLED",
];

/** Map proposed codes ↔ UI display labels used by the current presentation. */
export const STATUS_CODE_TO_LABEL = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under Review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  PROCESSING: "Processing",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

/** Legacy / display label → proposed code */
export const STATUS_LABEL_TO_CODE = {
  Draft: "DRAFT",
  Submitted: "SUBMITTED",
  Pending: "PROCESSING", // legacy alias
  Processing: "PROCESSING",
  "Under Review": "UNDER_REVIEW",
  Approved: "APPROVED",
  Completed: "COMPLETED",
  Rejected: "REJECTED",
  Cancelled: "CANCELLED",
};

/** Display statuses still shown in filters (presentation-compatible). */
export const REQUISITION_STATUSES = [
  "Draft",
  "Submitted",
  "Under Review",
  "Processing",
  "Approved",
  "Completed",
  "Rejected",
];

export const PRODUCTION_HOSTS = ["musooka.site", "www.musooka.site"];
