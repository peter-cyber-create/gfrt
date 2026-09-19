import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { corsOrigins, env } from "./config.js";
import { requestIdMiddleware } from "./middleware/auth.js";
import { csrfOriginCheck } from "./middleware/csrf.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { requestLogMiddleware } from "./middleware/requestLog.js";
import { authRouter } from "./routes/auth.js";
import { requisitionsRouter } from "./routes/requisitions.js";
import {
  auditRouter,
  departmentsRouter,
  notificationsRouter,
  permissionsRouter,
  reportsRouter,
  rolesRouter,
  usersRouter,
} from "./routes/admin.js";
import { attachmentsRouter } from "./routes/attachments.js";
import { stagingRouter } from "./routes/staging.js";
import { prisma } from "./lib/prisma.js";
import { logger } from "./lib/logger.js";
import { openApiDocument } from "./openapi.js";

export function createApp() {
  const app = express();

  // Staging/production sit behind Nginx; needed for express-rate-limit client IP.
  if (env.NODE_ENV === "production" || env.NODE_ENV === "staging") {
    app.set("trust proxy", 1);
  }

  app.disable("x-powered-by");
  app.use(requestIdMiddleware);
  app.use(requestLogMiddleware);
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    })
  );
  app.use(
    cors({
      origin(origin, cb) {
        if (!origin) return cb(null, true);
        if (corsOrigins.includes(origin)) return cb(null, true);
        // Do not throw — csrfOriginCheck returns 403 for disallowed browser origins.
        return cb(null, false);
      },
      credentials: true,
    })
  );
  app.use(express.json({ limit: "256kb" }));
  app.use(express.urlencoded({ extended: false, limit: "256kb" }));
  app.use(cookieParser());
  app.use(csrfOriginCheck);

  const globalLimiter = rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
  });
  const authLimiter = rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.AUTH_RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use(globalLimiter);

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "musooka-api" });
  });

  app.get("/ready", async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ status: "ready", database: true });
    } catch (err) {
      logger.error("ready_check_failed", { err: err instanceof Error ? err.message : String(err) });
      res.status(503).json({ status: "not_ready", database: false });
    }
  });

  app.get("/api/v1/openapi.json", (_req, res) => {
    res.json(openApiDocument);
  });

  app.use("/api/v1/auth", authLimiter, authRouter);
  app.use("/api/v1/requisitions", requisitionsRouter);
  app.use("/api/v1", attachmentsRouter);
  app.use("/api/v1/users", usersRouter);
  app.use("/api/v1/roles", rolesRouter);
  app.use("/api/v1/permissions", permissionsRouter);
  app.use("/api/v1/notifications", notificationsRouter);
  app.use("/api/v1/reports", reportsRouter);
  app.use("/api/v1/audit-logs", auditRouter);
  app.use("/api/v1/departments", departmentsRouter);
  app.use("/api/v1/staging", stagingRouter);

  app.use((_req, res) => {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Route not found." } });
  });

  app.use(errorHandler);
  return app;
}
