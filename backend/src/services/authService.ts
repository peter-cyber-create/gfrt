import { createHash, randomBytes } from "node:crypto";
import * as argon2 from "argon2";
import type { Request } from "express";
import { env } from "../config.js";
import { AppError } from "../lib/errors.js";
import { prisma } from "../lib/prisma.js";
import { writeAudit } from "./auditService.js";

const COOKIE_NAME = "musooka_sid";

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function hashPassword(password: string) {
  return argon2.hash(password, { type: argon2.argon2id });
}

export async function verifyPassword(hash: string, password: string) {
  return argon2.verify(hash, password);
}

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  status: string;
  permissions: string[];
  roles: string[];
};

export async function loadAuthUser(userId: string): Promise<AuthUser | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      userRoles: {
        include: {
          role: {
            include: {
              rolePermissions: { include: { permission: true } },
            },
          },
        },
      },
    },
  });
  if (!user) return null;
  const roles = user.userRoles.map((ur) => ur.role.name);
  const permissions = [
    ...new Set(
      user.userRoles.flatMap((ur) => ur.role.rolePermissions.map((rp) => rp.permission.code))
    ),
  ];
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    status: user.status,
    roles,
    permissions,
  };
}

export async function login(
  email: string,
  password: string,
  meta: { ip?: string; userAgent?: string; requestId?: string }
) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) {
    throw new AppError("INVALID_CREDENTIALS", "These credentials do not match our records.", 401);
  }
  if (user.status !== "ACTIVE") {
    throw new AppError("ACCOUNT_INACTIVE", "This account is not active.", 403);
  }
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw new AppError("ACCOUNT_LOCKED", "Account temporarily locked due to failed login attempts.", 403);
  }

  const ok = await verifyPassword(user.passwordHash, password);
  if (!ok) {
    const failed = user.failedLogins + 1;
    const lockedUntil =
      failed >= env.LOGIN_MAX_ATTEMPTS
        ? new Date(Date.now() + env.LOGIN_LOCK_MINUTES * 60_000)
        : null;
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLogins: failed, lockedUntil },
    });
    await writeAudit({
      actorId: user.id,
      action: "auth.login_failed",
      entity: "user",
      entityId: user.id,
      requestId: meta.requestId,
      metadata: { failed },
    });
    throw new AppError("INVALID_CREDENTIALS", "These credentials do not match our records.", 401);
  }

  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + env.SESSION_DAYS * 24 * 60 * 60 * 1000);

  await prisma.$transaction([
    prisma.session.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
        ip: meta.ip,
        userAgent: meta.userAgent,
      },
    }),
    prisma.user.update({
      where: { id: user.id },
      data: { failedLogins: 0, lockedUntil: null, lastLoginAt: new Date() },
    }),
  ]);

  const authUser = await loadAuthUser(user.id);
  await writeAudit({
    actorId: user.id,
    action: "auth.login",
    entity: "session",
    entityId: user.id,
    requestId: meta.requestId,
  });

  return { token, expiresAt, user: authUser! };
}

export async function logout(token: string | undefined, requestId?: string) {
  if (!token) return;
  const session = await prisma.session.findUnique({ where: { tokenHash: hashToken(token) } });
  if (session) {
    await prisma.session.delete({ where: { id: session.id } });
    await writeAudit({
      actorId: session.userId,
      action: "auth.logout",
      entity: "session",
      entityId: session.id,
      requestId,
    });
  }
}

export async function resolveSession(token: string | undefined): Promise<AuthUser | null> {
  if (!token) return null;
  const session = await prisma.session.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!session || session.expiresAt < new Date()) {
    if (session) await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }
  return loadAuthUser(session.userId);
}

export function readSessionToken(req: Request) {
  const cookie = req.cookies?.[COOKIE_NAME];
  if (typeof cookie === "string" && cookie.length > 0) return cookie;
  const header = req.header("authorization");
  if (header?.startsWith("Bearer ")) return header.slice(7);
  return undefined;
}

export { COOKIE_NAME };
