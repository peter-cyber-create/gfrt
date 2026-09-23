import { Router } from "express";
import { env } from "../config.js";
import {
  COOKIE_NAME,
  changePassword,
  login,
  logout,
  readSessionToken,
  type AuthUser,
} from "../services/authService.js";
import { requestPasswordReset, confirmPasswordReset } from "../services/passwordResetService.js";
import { requireAuth } from "../middleware/auth.js";
import {
  changePasswordSchema,
  loginSchema,
  passwordResetConfirmSchema,
  passwordResetRequestSchema,
  validateBody,
} from "../middleware/validate.js";

export const authRouter = Router();

function cookieSecure(req: import("express").Request) {
  if (env.COOKIE_SECURE) return true;
  const xf = String(req.get("x-forwarded-proto") || "").split(",")[0].trim().toLowerCase();
  return req.secure || xf === "https";
}

function setSessionCookie(req: import("express").Request, res: import("express").Response, token: string, expiresAt: Date) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: cookieSecure(req),
    sameSite: env.COOKIE_SAMESITE,
    expires: expiresAt,
    path: "/",
  });
}

function clearSessionCookie(req: import("express").Request, res: import("express").Response) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: cookieSecure(req),
    sameSite: env.COOKIE_SAMESITE,
    path: "/",
  });
}

function publicUser(user: AuthUser) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    status: user.status,
    roles: user.roles,
    role: user.roles[0] || null,
    permissions: user.permissions,
  };
}

authRouter.post("/login", validateBody(loginSchema), async (req, res, next) => {
  try {
    const result = await login(req.body.email, req.body.password, {
      ip: req.ip,
      userAgent: req.get("user-agent") || undefined,
      requestId: req.requestId,
    });
    setSessionCookie(req, res, result.token, result.expiresAt);
    res.json({ data: { user: publicUser(result.user), expiresAt: result.expiresAt } });
  } catch (err) {
    next(err);
  }
});

authRouter.post("/logout", async (req, res, next) => {
  try {
    await logout(readSessionToken(req), req.requestId);
    clearSessionCookie(req, res);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

authRouter.get("/me", requireAuth, async (req, res) => {
  res.json({ data: { user: publicUser(req.user!) } });
});

authRouter.post("/password-reset/request", validateBody(passwordResetRequestSchema), async (req, res, next) => {
  try {
    await requestPasswordReset(req.body.email, req.requestId);
    res.json({ data: { ok: true } });
  } catch (err) {
    next(err);
  }
});

authRouter.post("/password-reset/confirm", validateBody(passwordResetConfirmSchema), async (req, res, next) => {
  try {
    await confirmPasswordReset(req.body.token, req.body.password, req.requestId);
    res.json({ data: { ok: true } });
  } catch (err) {
    next(err);
  }
});

authRouter.post("/change-password", requireAuth, validateBody(changePasswordSchema), async (req, res, next) => {
  try {
    await changePassword(req.user!.id, req.body.currentPassword, req.body.newPassword, req.requestId);
    clearSessionCookie(req, res);
    res.json({ data: { ok: true, message: "Password updated. Please sign in again.", requiresReLogin: true } });
  } catch (err) {
    next(err);
  }
});
