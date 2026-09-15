import type { RequisitionStatus } from "@prisma/client";
import { AppError } from "../lib/errors.js";

/**
 * Proposed requisition lifecycle — NOT verified against production Musooka.
 */
export const ALLOWED_TRANSITIONS: Record<RequisitionStatus, RequisitionStatus[]> = {
  DRAFT: ["SUBMITTED", "CANCELLED"],
  SUBMITTED: ["UNDER_REVIEW", "CANCELLED"],
  UNDER_REVIEW: ["APPROVED", "REJECTED", "PROCESSING"],
  PROCESSING: ["APPROVED", "REJECTED", "UNDER_REVIEW"],
  APPROVED: ["COMPLETED", "PROCESSING"],
  REJECTED: ["DRAFT", "SUBMITTED"],
  COMPLETED: [],
  CANCELLED: [],
};

export type TransitionAction =
  | "submit"
  | "review"
  | "approve"
  | "reject"
  | "startProcessing"
  | "complete"
  | "cancel";

export const ACTION_TO_STATUS: Record<TransitionAction, RequisitionStatus> = {
  submit: "SUBMITTED",
  review: "UNDER_REVIEW",
  approve: "APPROVED",
  reject: "REJECTED",
  startProcessing: "PROCESSING",
  complete: "COMPLETED",
  cancel: "CANCELLED",
};

export const ACTION_PERMISSION: Record<TransitionAction, string> = {
  submit: "requisition.submit",
  review: "requisition.view",
  approve: "requisition.approve",
  reject: "requisition.reject",
  startProcessing: "requisition.edit",
  complete: "requisition.edit",
  cancel: "requisition.edit",
};

export function assertTransition(from: RequisitionStatus, to: RequisitionStatus) {
  const allowed = ALLOWED_TRANSITIONS[from] || [];
  if (!allowed.includes(to)) {
    throw new AppError(
      "REQUISITION_INVALID_STATE",
      `This requisition cannot move from ${from} to ${to}.`,
      422,
      { from, to, allowed }
    );
  }
}
