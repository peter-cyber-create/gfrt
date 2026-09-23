import { Router } from "express";
import type { TransitionAction } from "../domain/requisitionLifecycle.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";
import {
  createRequisitionSchema,
  listRequisitionsQuery,
  transitionSchema,
  updateRequisitionSchema,
  uuidParam,
  validateBody,
  validateParams,
  validateQuery,
} from "../middleware/validate.js";
import {
  createRequisition,
  getDashboardMetrics,
  getRequisition,
  listRequisitions,
  transitionRequisition,
  updateDraftRequisition,
} from "../services/requisitionService.js";

export const requisitionsRouter = Router();

requisitionsRouter.use(requireAuth);

requisitionsRouter.get(
  "/",
  requirePermission("requisition.view"),
  validateQuery(listRequisitionsQuery),
  async (req, res, next) => {
    try {
      const q = (req as typeof req & { validatedQuery?: Record<string, unknown> }).validatedQuery || {};
      const data = await listRequisitions(
        q as {
          query?: string;
          status?: import("@prisma/client").RequisitionStatus;
          departmentId?: string;
        }
      );
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }
);

requisitionsRouter.get("/metrics/dashboard", requirePermission("report.view"), async (_req, res, next) => {
  try {
    const data = await getDashboardMetrics();
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

requisitionsRouter.get("/:id", requirePermission("requisition.view"), validateParams(uuidParam), async (req, res, next) => {
  try {
    const data = await getRequisition(String(req.params.id));
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

requisitionsRouter.post(
  "/",
  requirePermission("requisition.create"),
  validateBody(createRequisitionSchema),
  async (req, res, next) => {
    try {
      const data = await createRequisition(req.user!, req.body, req.requestId);
      res.status(201).json({ data });
    } catch (err) {
      next(err);
    }
  }
);

requisitionsRouter.patch(
  "/:id",
  requirePermission("requisition.edit"),
  validateParams(uuidParam),
  validateBody(updateRequisitionSchema),
  async (req, res, next) => {
    try {
      const data = await updateDraftRequisition(req.user!, String(req.params.id), req.body, req.requestId);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }
);

const actions: TransitionAction[] = [
  "submit",
  "review",
  "approve",
  "reject",
  "startProcessing",
  "complete",
  "cancel",
];

for (const action of actions) {
  requisitionsRouter.post(
    `/:id/${action}`,
    validateParams(uuidParam),
    validateBody(transitionSchema),
    async (req, res, next) => {
      try {
        const data = await transitionRequisition(
          req.user!,
          String(req.params.id),
          action,
          req.body.note,
          req.requestId
        );
        res.json({ data });
      } catch (err) {
        next(err);
      }
    }
  );
}
