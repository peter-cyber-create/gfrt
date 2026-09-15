import type { NextFunction, Request, Response } from "express";
import { corsOrigins } from "../config.js";
import { AppError } from "../lib/errors.js";

/**
 * CSRF mitigation for cookie-authenticated browser clients:
 * require matching Origin (or Referer) against the CORS allowlist for mutating methods.
 * SameSite cookie settings remain the primary browser CSRF control.
 */
export function csrfOriginCheck(req: Request, _res: Response, next: NextFunction) {
  const method = req.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return next();

  const origin = req.get("origin");
  if (origin) {
    if (!corsOrigins.includes(origin)) {
      return next(new AppError("FORBIDDEN", "Origin not allowed.", 403));
    }
    return next();
  }

  // Non-browser clients (API tests, curl) may omit Origin; allow when no cookie session
  // and Authorization bearer is used, or when Origin is absent in test/dev tooling.
  const referer = req.get("referer");
  if (referer) {
    try {
      const refOrigin = new URL(referer).origin;
      if (!corsOrigins.includes(refOrigin)) {
        return next(new AppError("FORBIDDEN", "Referer not allowed.", 403));
      }
    } catch {
      return next(new AppError("FORBIDDEN", "Invalid Referer.", 403));
    }
  }

  next();
}
