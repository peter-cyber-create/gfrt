import "dotenv/config";
import { z } from "zod";

const FORBIDDEN_SECRET_FRAGMENTS = ["replace", "change-me", "local-dev"] as const;

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "staging", "production"]).default("development"),
    PORT: z.coerce.number().default(4000),
    DATABASE_URL: z.string().min(1),
    SESSION_SECRET: z.string().min(16),
    COOKIE_SECURE: z
      .string()
      .optional()
      .transform((v) => v === "true"),
    COOKIE_SAMESITE: z.enum(["lax", "strict", "none"]).default("lax"),
    CORS_ORIGIN: z.string().default("http://127.0.0.1:5173"),
    LOGIN_MAX_ATTEMPTS: z.coerce.number().default(5),
    LOGIN_LOCK_MINUTES: z.coerce.number().default(15),
    SESSION_DAYS: z.coerce.number().default(7),
    RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900_000),
    RATE_LIMIT_MAX: z.coerce.number().default(200),
    AUTH_RATE_LIMIT_MAX: z.coerce.number().default(20),
    EMAIL_PROVIDER: z.enum(["mock", "smtp"]).default("mock"),
    STORAGE_ROOT: z.string().default("./data/uploads"),
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().optional(),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    SMTP_FROM: z.string().optional(),
    /** Test-only: inject failure after status update in transitionRequisition */
    FORCE_TX_FAILURE: z.string().optional(),
    PASSWORD_RESET_URL_BASE: z.string().optional(),
    /** Staging-only: allow POST /api/v1/staging/presentation-reset */
    STAGING_ALLOW_PRESENTATION_RESET: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const isProdLike = data.NODE_ENV === "production" || data.NODE_ENV === "staging";
    const isProduction = data.NODE_ENV === "production";

    if (isProduction && data.STAGING_ALLOW_PRESENTATION_RESET === "true") {
      ctx.addIssue({
        code: "custom",
        path: ["STAGING_ALLOW_PRESENTATION_RESET"],
        message: "STAGING_ALLOW_PRESENTATION_RESET is forbidden in production.",
      });
    }

    if (isProdLike) {
      if (data.SESSION_SECRET.length < 32) {
        ctx.addIssue({
          code: "custom",
          path: ["SESSION_SECRET"],
          message: "SESSION_SECRET must be at least 32 characters in production/staging.",
        });
      }
      const lower = data.SESSION_SECRET.toLowerCase();
      for (const frag of FORBIDDEN_SECRET_FRAGMENTS) {
        if (lower.includes(frag)) {
          ctx.addIssue({
            code: "custom",
            path: ["SESSION_SECRET"],
            message: `SESSION_SECRET must not contain "${frag}" in production/staging.`,
          });
          break;
        }
      }
      if (!data.DATABASE_URL) {
        ctx.addIssue({
          code: "custom",
          path: ["DATABASE_URL"],
          message: "DATABASE_URL is required in production/staging.",
        });
      }
      if (data.CORS_ORIGIN.includes("*")) {
        ctx.addIssue({
          code: "custom",
          path: ["CORS_ORIGIN"],
          message: "CORS_ORIGIN must not contain wildcards in production/staging.",
        });
      }
      if (data.EMAIL_PROVIDER === "mock") {
        ctx.addIssue({
          code: "custom",
          path: ["EMAIL_PROVIDER"],
          message: "EMAIL_PROVIDER=mock is not allowed in production/staging.",
        });
      }
      if (!data.SMTP_HOST || !data.SMTP_FROM) {
        ctx.addIssue({
          code: "custom",
          path: ["SMTP_HOST"],
          message: "SMTP_HOST and SMTP_FROM are required when EMAIL_PROVIDER=smtp in production/staging.",
        });
      }
      if (!data.PASSWORD_RESET_URL_BASE) {
        ctx.addIssue({
          code: "custom",
          path: ["PASSWORD_RESET_URL_BASE"],
          message: "PASSWORD_RESET_URL_BASE is required in production/staging.",
        });
      }
    }

    if (isProduction) {
      if (!data.COOKIE_SECURE) {
        ctx.addIssue({
          code: "custom",
          path: ["COOKIE_SECURE"],
          message: "COOKIE_SECURE must be true in production.",
        });
      }
      const smtpHost = (data.SMTP_HOST || "").toLowerCase();
      if (smtpHost.includes("mailpit") || smtpHost.includes("mailhog") || smtpHost === "localhost" || smtpHost === "127.0.0.1") {
        ctx.addIssue({
          code: "custom",
          path: ["SMTP_HOST"],
          message: "Production must not use Mailpit/Mailhog/localhost SMTP.",
        });
      }
      const dbUrl = data.DATABASE_URL.toLowerCase();
      if (dbUrl.includes("musooka_dev") || dbUrl.includes("musooka_test") || dbUrl.includes("musooka_dev_only")) {
        ctx.addIssue({
          code: "custom",
          path: ["DATABASE_URL"],
          message: "Production DATABASE_URL must not point at development/test databases.",
        });
      }
      if (data.FORCE_TX_FAILURE) {
        ctx.addIssue({
          code: "custom",
          path: ["FORCE_TX_FAILURE"],
          message: "FORCE_TX_FAILURE is forbidden in production.",
        });
      }
      if (data.CORS_ORIGIN.includes("127.0.0.1") || data.CORS_ORIGIN.includes("localhost")) {
        ctx.addIssue({
          code: "custom",
          path: ["CORS_ORIGIN"],
          message: "Production CORS_ORIGIN must not include localhost/127.0.0.1.",
        });
      }
    }
  });

const parsed = envSchema.parse(process.env);

export const env = parsed;
export const corsOrigins = env.CORS_ORIGIN.split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export function assertProductionEmailProvider() {
  if (
    (env.NODE_ENV === "production" || env.NODE_ENV === "staging") &&
    env.EMAIL_PROVIDER === "mock"
  ) {
    throw new Error("EMAIL_PROVIDER=mock is forbidden in production/staging.");
  }
}
