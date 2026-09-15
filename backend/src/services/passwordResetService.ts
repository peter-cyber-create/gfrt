import { createHash, randomBytes } from "node:crypto";
import { env } from "../config.js";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../lib/errors.js";
import { hashPassword } from "./authService.js";
import { writeAudit } from "./auditService.js";
import { getEmailProvider } from "./email/index.js";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function buildResetUrl(token: string) {
  const base = env.PASSWORD_RESET_URL_BASE || "http://127.0.0.1:5173/reset-password";
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}token=${encodeURIComponent(token)}`;
}

export async function requestPasswordReset(email: string, requestId?: string) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) return { issued: false };

  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await prisma.$transaction([
    prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    }),
    prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    }),
  ]);

  const resetUrl = buildResetUrl(token);
  await getEmailProvider().sendPasswordReset({ to: user.email, token, resetUrl });

  await writeAudit({
    actorId: user.id,
    action: "auth.password_reset_requested",
    entity: "user",
    entityId: user.id,
    requestId,
  });

  return {
    issued: true,
    _devToken: env.NODE_ENV === "production" || env.NODE_ENV === "staging" ? undefined : token,
  };
}

export async function confirmPasswordReset(token: string, password: string, requestId?: string) {
  const key = hashToken(token);
  const entry = await prisma.passwordResetToken.findUnique({ where: { tokenHash: key } });
  if (!entry || entry.usedAt || entry.expiresAt < new Date()) {
    if (entry && !entry.usedAt) {
      await prisma.passwordResetToken.update({
        where: { id: entry.id },
        data: { usedAt: new Date() },
      });
    }
    throw new AppError("VALIDATION_ERROR", "Invalid or expired reset token.", 400);
  }

  const passwordHash = await hashPassword(password);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: entry.userId },
      data: { passwordHash, failedLogins: 0, lockedUntil: null },
    }),
    prisma.passwordResetToken.update({
      where: { id: entry.id },
      data: { usedAt: new Date() },
    }),
    prisma.session.deleteMany({ where: { userId: entry.userId } }),
  ]);

  await writeAudit({
    actorId: entry.userId,
    action: "auth.password_reset_completed",
    entity: "user",
    entityId: entry.userId,
    requestId,
  });
}
