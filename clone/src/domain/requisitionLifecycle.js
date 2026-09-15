import { STATUS_LABEL_TO_CODE } from "../data/config.js";

/**
 * Proposed lifecycle transitions (presentation / future app).
 * Not claimed to match production until verified.
 */
export const ALLOWED_TRANSITIONS = {
  DRAFT: ["SUBMITTED", "CANCELLED"],
  SUBMITTED: ["UNDER_REVIEW", "CANCELLED"],
  UNDER_REVIEW: ["APPROVED", "REJECTED", "PROCESSING"],
  PROCESSING: ["APPROVED", "REJECTED", "UNDER_REVIEW"],
  APPROVED: ["COMPLETED", "PROCESSING"],
  REJECTED: ["DRAFT", "SUBMITTED"],
  COMPLETED: [],
  CANCELLED: [],
};

export function labelToStatusCode(label) {
  return STATUS_LABEL_TO_CODE[label] || "SUBMITTED";
}

export function canTransition(fromCode, toCode) {
  const allowed = ALLOWED_TRANSITIONS[fromCode] || [];
  return allowed.includes(toCode);
}
