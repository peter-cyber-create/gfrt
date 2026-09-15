import type { NextFunction, Request, Response } from "express";
import { logger } from "../lib/logger.js";

export function requestLogMiddleware(req: Request, res: Response, next: NextFunction) {
  const started = Date.now();
  res.on("finish", () => {
    logger.info("http_request", {
      requestId: req.requestId,
      method: req.method,
      route: req.originalUrl?.split("?")[0] || req.path,
      status: res.statusCode,
      durationMs: Date.now() - started,
    });
  });
  next();
}
