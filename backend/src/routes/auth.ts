import { Router } from "express";
import { env } from "../config.js";
import {
  COOKIE_NAME,
  login,
  logout,
  readSessionToken,
  type AuthUser,
} from "../services/authService.js";
import { requestPasswordReset, confirmPasswordReset } from "../services/passwordResetService.js";
import { requireAuth } from "../middleware/auth.js";
import {
  loginSchema,
  passwordResetConfirmSchema,
  passwordResetRequestSchema,
  validateBody,
} from "../middleware/validate.js";

export const authRouter = Router();

function setSessionCookie(res: import("express").Response, token: string, expiresAt: Date) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAMESITE,
    expires: expiresAt,
    path: "/",
  });
}

function clearSessionCookie(res: import("express").Response) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
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
    setSessionCookie(res, result.token, result.expiresAt);
    res.json({ data: { user: publicUser(result.user), expiresAt: result.expiresAt } });
  } catch (err) {
    next(err);
  }
});

authRouter.post("/logout", async (req, res, next) => {
  try {
    await logout(readSessionToken(req), req.requestId);
    clearSessionCookie(res);
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
    // Always succeed to avoid email enumeration
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
