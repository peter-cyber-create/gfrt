import { prisma } from "../lib/prisma.js";

export async function writeAudit(input: {
  actorId?: string | null;
  action: string;
  entity: string;
  entityId: string;
  requestId?: string;
  metadata?: Record<string, unknown>;
}) {
  return prisma.auditLog.create({
    data: {
      actorId: input.actorId || null,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId,
      requestId: input.requestId,
      metadata: (input.metadata as object | undefined) ?? undefined,
    },
  });
}

export async function listAuditLogs(limit = 50) {
  return prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: Math.min(limit, 200),
    include: { actor: { select: { id: true, name: true, email: true } } },
  });
}
