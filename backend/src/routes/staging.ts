import { Router } from "express";
import { env } from "../config.js";
import { AppError } from "../lib/errors.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";
import { prisma } from "../lib/prisma.js";
import { seedPresentation, verifyPresentationConsistency } from "../staging/presentationSeed.js";

/**
 * Staging-only presentation controls.
 * Hard-gated: NODE_ENV=staging + STAGING_ALLOW_PRESENTATION_RESET=true.
 * Never available in production.
 */
export const stagingRouter = Router();

function assertStagingPresentationResetAllowed() {
  if (env.NODE_ENV === "production") {
    throw new AppError("FORBIDDEN", "Presentation reset is not available.", 403);
  }
  if (env.NODE_ENV !== "staging") {
    throw new AppError("FORBIDDEN", "Presentation reset requires staging environment.", 403);
  }
  if (env.STAGING_ALLOW_PRESENTATION_RESET !== "true") {
    throw new AppError("FORBIDDEN", "Presentation reset is disabled.", 403);
  }
}

stagingRouter.post(
  "/presentation-reset",
  requireAuth,
  requirePermission("user.manage"),
  async (req, res, next) => {
    try {
      assertStagingPresentationResetAllowed();
      const actorEmail = req.user!.email;
      const result = await seedPresentation(prisma, {
        password: process.env.STAGING_SEED_PASSWORD || "demo1234",
        requisitionCount: Number(process.env.STAGING_SEED_REQUISITIONS || 180),
      });
      // Seed recreates users — resolve actor by email for the audit row.
      const actor = await prisma.user.findUnique({ where: { email: actorEmail } });
      await prisma.auditLog.create({
        data: {
          actorId: actor?.id ?? null,
          action: "presentation.reset",
          entity: "system",
          entityId: "staging",
          requestId: req.requestId,
          metadata: result,
        },
      });
      res.json({ data: { ok: true, ...result } });
    } catch (err) {
      next(err);
    }
  }
);

stagingRouter.get(
  "/presentation-consistency",
  requireAuth,
  requirePermission("audit.view"),
  async (_req, res, next) => {
    try {
      assertStagingPresentationResetAllowed();
      const data = await verifyPresentationConsistency(prisma);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }
);
