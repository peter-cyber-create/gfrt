import { AppError } from "../lib/errors.js";
import { prisma } from "../lib/prisma.js";
import type { AuthUser } from "./authService.js";
import { writeAudit } from "./auditService.js";
import { hashPassword } from "./authService.js";

function requirePerm(user: AuthUser, code: string) {
  if (!user.permissions.includes(code)) {
    throw new AppError("FORBIDDEN", "You do not have permission to perform this action.", 403, {
      required: code,
    });
  }
}

export async function listUsers(actor: AuthUser) {
  requirePerm(actor, "user.view");
  return prisma.user.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      email: true,
      name: true,
      status: true,
      phone: true,
      lastLoginAt: true,
      department: { select: { id: true, name: true } },
      userRoles: { include: { role: { select: { id: true, name: true } } } },
    },
  });
}

export async function getUser(actor: AuthUser, id: string) {
  requirePerm(actor, "user.view");
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      status: true,
      phone: true,
      lastLoginAt: true,
      department: { select: { id: true, name: true } },
      userRoles: { include: { role: { select: { id: true, name: true } } } },
    },
  });
  if (!user) throw new AppError("NOT_FOUND", "User not found.", 404);
  return user;
}

export async function createUser(
  actor: AuthUser,
  input: {
    email: string;
    name: string;
    password: string;
    roleId: string;
    departmentId?: string;
    phone?: string;
  },
  requestId?: string
) {
  requirePerm(actor, "user.manage");
  const existing = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
  if (existing) throw new AppError("CONFLICT", "A user with that email already exists.", 409);

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email: input.email.toLowerCase(),
        name: input.name,
        passwordHash,
        departmentId: input.departmentId,
        phone: input.phone,
        userRoles: { create: { roleId: input.roleId } },
      },
    });
    await tx.auditLog.create({
      data: {
        actorId: actor.id,
        action: "user.create",
        entity: "user",
        entityId: created.id,
        requestId,
        metadata: { email: created.email },
      },
    });
    return created;
  });
  return getUser(actor, user.id);
}

export async function updateUserStatus(
  actor: AuthUser,
  id: string,
  status: "ACTIVE" | "INACTIVE" | "DISABLED",
  requestId?: string
) {
  requirePerm(actor, "user.manage");
  if (actor.id === id && status !== "ACTIVE") {
    throw new AppError("FORBIDDEN", "You cannot disable your own account.", 403);
  }
  const user = await prisma.user.update({ where: { id }, data: { status } });
  await writeAudit({
    actorId: actor.id,
    action: "user.status_update",
    entity: "user",
    entityId: id,
    requestId,
    metadata: { status },
  });
  return user;
}

export async function updateUser(
  actor: AuthUser,
  id: string,
  input: {
    name?: string;
    phone?: string | null;
    departmentId?: string | null;
    roleId?: string;
  },
  requestId?: string
) {
  requirePerm(actor, "user.manage");
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) throw new AppError("NOT_FOUND", "User not found.", 404);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
        ...(input.departmentId !== undefined ? { departmentId: input.departmentId } : {}),
      },
    });
    if (input.roleId) {
      await tx.userRole.deleteMany({ where: { userId: id } });
      await tx.userRole.create({ data: { userId: id, roleId: input.roleId } });
    }
    await tx.auditLog.create({
      data: {
        actorId: actor.id,
        action: "user.update",
        entity: "user",
        entityId: id,
        requestId,
        metadata: {
          name: input.name,
          departmentId: input.departmentId,
          roleId: input.roleId,
        },
      },
    });
  });
  return getUser(actor, id);
}

export async function listRoles(actor: AuthUser) {
  requirePerm(actor, "role.view");
  return prisma.role.findMany({
    include: {
      rolePermissions: { include: { permission: true } },
      _count: { select: { userRoles: true } },
    },
    orderBy: { name: "asc" },
  });
}

export async function listPermissions(actor: AuthUser) {
  requirePerm(actor, "role.view");
  return prisma.permission.findMany({ orderBy: [{ groupName: "asc" }, { code: "asc" }] });
}
