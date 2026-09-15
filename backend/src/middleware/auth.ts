import type { NextFunction, Request, Response } from "express";
import { randomUUID } from "node:crypto";
import { COOKIE_NAME, readSessionToken, resolveSession, type AuthUser } from "../services/authService.js";
import { AppError } from "../lib/errors.js";

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      user?: AuthUser;
    }
  }
}

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const incoming = req.header("x-request-id");
  req.requestId = incoming && incoming.length < 100 ? incoming : randomUUID();
  res.setHeader("x-request-id", req.requestId);
  next();
}

export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = readSessionToken(req);
    const user = await resolveSession(token);
    if (user) req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = readSessionToken(req);
    const user = await resolveSession(token);
    if (!user) throw new AppError("UNAUTHENTICATED", "Authentication required.", 401);
    if (user.status !== "ACTIVE") throw new AppError("ACCOUNT_INACTIVE", "This account is not active.", 403);
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

export function requirePermission(...codes: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new AppError("UNAUTHENTICATED", "Authentication required.", 401));
    const ok = codes.some((c) => req.user!.permissions.includes(c));
    if (!ok) {
      return next(
        new AppError("FORBIDDEN", "You do not have permission to perform this action.", 403, {
          required: codes,
        })
      );
    }
    next();
  };
}

export { COOKIE_NAME };
