import type { Prisma, RequisitionStatus } from "@prisma/client";
import {
  ACTION_PERMISSION,
  ACTION_TO_STATUS,
  assertTransition,
  type TransitionAction,
} from "../domain/requisitionLifecycle.js";
import { AppError } from "../lib/errors.js";
import { prisma } from "../lib/prisma.js";
import type { AuthUser } from "./authService.js";
import { writeAudit } from "./auditService.js";

function assertPermission(user: AuthUser, permission: string) {
  if (!user.permissions.includes(permission)) {
    throw new AppError("FORBIDDEN", "You do not have permission to perform this action.", 403, {
      required: permission,
    });
  }
}

/** Test-only hook: force transaction rollback after status update. */
function maybeForceTxFailure(action: TransitionAction) {
  if (
    process.env.NODE_ENV === "test" &&
    process.env.FORCE_TX_FAILURE === "approve_after_status" &&
    action === "approve"
  ) {
    throw new Error("Forced transaction failure for testing");
  }
}

export async function listRequisitions(filters: {
  query?: string;
  status?: RequisitionStatus;
  departmentId?: string;
}) {
  const where: Prisma.RequisitionWhereInput = {};
  if (filters.status) where.status = filters.status;
  if (filters.departmentId) where.departmentId = filters.departmentId;
  if (filters.query) {
    where.OR = [
      { number: { contains: filters.query, mode: "insensitive" } },
      { facility: { contains: filters.query, mode: "insensitive" } },
      { district: { contains: filters.query, mode: "insensitive" } },
      { description: { contains: filters.query, mode: "insensitive" } },
    ];
  }
  return prisma.requisition.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: {
      department: true,
      requester: { select: { id: true, name: true, email: true } },
      items: true,
    },
  });
}

export async function getRequisition(id: string) {
  const row = await prisma.requisition.findUnique({
    where: { id },
    include: {
      department: true,
      requester: { select: { id: true, name: true, email: true } },
      items: true,
      approvals: { include: { actor: { select: { id: true, name: true } } }, orderBy: { createdAt: "asc" } },
      history: { include: { actor: { select: { id: true, name: true } } }, orderBy: { createdAt: "asc" } },
      attachments: true,
    },
  });
  if (!row) throw new AppError("NOT_FOUND", "Requisition not found.", 404);
  return row;
}

export async function createRequisition(
  user: AuthUser,
  input: {
    facility: string;
    district: string;
    departmentId: string;
    description: string;
    amountValue: number;
    requiredAt?: string;
    items: Array<{ description: string; quantity: number; unit?: string; unitCost?: number }>;
  },
  requestId?: string
) {
  assertPermission(user, "requisition.create");
  const count = await prisma.requisition.count();
  const number = `REQ-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;

  const created = await prisma.$transaction(async (tx) => {
    const req = await tx.requisition.create({
      data: {
        number,
        facility: input.facility,
        district: input.district,
        departmentId: input.departmentId,
        description: input.description,
        amountValue: input.amountValue,
        requesterId: user.id,
        requiredAt: input.requiredAt ? new Date(input.requiredAt) : null,
        status: "DRAFT",
        items: {
          create: input.items.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            unitCost: item.unitCost,
          })),
        },
        history: {
          create: {
            fromStatus: null,
            toStatus: "DRAFT",
            actorId: user.id,
            note: "Created",
          },
        },
      },
      include: { items: true, department: true },
    });
    await tx.auditLog.create({
      data: {
        actorId: user.id,
        action: "requisition.create",
        entity: "requisition",
        entityId: req.id,
        requestId,
        metadata: { number: req.number },
      },
    });
    return req;
  });

  return created;
}

/**
 * Transition a requisition using optimistic concurrency: update only when status
 * still matches the value read at the start of the transaction.
 */
export async function transitionRequisition(
  user: AuthUser,
  id: string,
  action: TransitionAction,
  note: string | undefined,
  requestId?: string
) {
  const permission = ACTION_PERMISSION[action];
  assertPermission(user, permission);
  const toStatus = ACTION_TO_STATUS[action];

  return prisma.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<Array<{ id: string; status: RequisitionStatus; number: string; requester_id: string; submitted_at: Date | null }>>`
      SELECT id, status, number, requester_id, submitted_at
      FROM requisitions
      WHERE id = ${id}::uuid
      FOR UPDATE
    `;
    const current = locked[0];
    if (!current) throw new AppError("NOT_FOUND", "Requisition not found.", 404);

    assertTransition(current.status, toStatus);

    const updateResult = await tx.requisition.updateMany({
      where: { id, status: current.status },
      data: {
        status: toStatus,
        submittedAt: toStatus === "SUBMITTED" ? new Date() : current.submitted_at,
      },
    });

    if (updateResult.count === 0) {
      throw new AppError(
        "CONFLICT",
        "Requisition was modified by another request. Please refresh and retry.",
        409
      );
    }

    maybeForceTxFailure(action);

    await tx.statusHistory.create({
      data: {
        requisitionId: id,
        fromStatus: current.status,
        toStatus,
        actorId: user.id,
        note,
      },
    });

    if (action === "approve" || action === "reject") {
      await tx.approval.create({
        data: {
          requisitionId: id,
          actorId: user.id,
          decision: toStatus,
          comment: note,
        },
      });
    }

    if (current.requester_id !== user.id) {
      await tx.notification.create({
        data: {
          userId: current.requester_id,
          text: `Requisition ${current.number} is now ${toStatus}`,
        },
      });
    }

    await tx.auditLog.create({
      data: {
        actorId: user.id,
        action: `requisition.${action}`,
        entity: "requisition",
        entityId: id,
        requestId,
        metadata: { from: current.status, to: toStatus, note },
      },
    });

    const updated = await tx.requisition.findUnique({ where: { id } });
    return updated!;
  });
}

export async function getDashboardMetrics() {
  const rows = await prisma.requisition.groupBy({
    by: ["status"],
    _count: { _all: true },
  });
  const map = Object.fromEntries(rows.map((r) => [r.status, r._count._all]));
  const total = rows.reduce((s, r) => s + r._count._all, 0);
  return {
    total,
    draft: map.DRAFT || 0,
    submitted: map.SUBMITTED || 0,
    underReview: map.UNDER_REVIEW || 0,
    approved: map.APPROVED || 0,
    rejected: map.REJECTED || 0,
    processing: map.PROCESSING || 0,
    completed: map.COMPLETED || 0,
    cancelled: map.CANCELLED || 0,
  };
}
