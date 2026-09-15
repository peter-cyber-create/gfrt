import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import { toClientError } from "../lib/errors.js";
import { logger } from "../lib/logger.js";

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({
      error: { code: "VALIDATION_ERROR", message: "File too large." },
    });
  }

  if (
    err &&
    typeof err === "object" &&
    "type" in err &&
    (err as { type?: string }).type === "entity.too.large"
  ) {
    return res.status(413).json({
      error: { code: "VALIDATION_ERROR", message: "Request body too large." },
    });
  }

  const mapped = toClientError(err);
  if (mapped.status >= 500) {
    logger.error("request_error", {
      requestId: req.requestId,
      path: req.path,
      method: req.method,
      err: err instanceof Error ? err.message : String(err),
    });
  }
  res.status(mapped.status).json(mapped.body);
}
