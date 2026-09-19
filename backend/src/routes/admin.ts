import { Router } from "express";
import { requireAuth, requirePermission } from "../middleware/auth.js";
import {
  createUserSchema,
  updateUserSchema,
  updateUserStatusSchema,
  uuidParam,
  validateBody,
  validateParams,
} from "../middleware/validate.js";
import {
  createUser,
  getUser,
  listPermissions,
  listRoles,
  listUsers,
  updateUser,
  updateUserStatus,
} from "../services/userService.js";
import { listAuditLogs } from "../services/auditService.js";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../lib/errors.js";

export const usersRouter = Router();
export const rolesRouter = Router();
export const permissionsRouter = Router();
export const notificationsRouter = Router();
export const reportsRouter = Router();
export const auditRouter = Router();
export const departmentsRouter = Router();

usersRouter.use(requireAuth);
rolesRouter.use(requireAuth);
permissionsRouter.use(requireAuth);
notificationsRouter.use(requireAuth);
reportsRouter.use(requireAuth);
auditRouter.use(requireAuth);
departmentsRouter.use(requireAuth);

usersRouter.get("/", requirePermission("user.view"), async (req, res, next) => {
  try {
    res.json({ data: await listUsers(req.user!) });
  } catch (err) {
    next(err);
  }
});

usersRouter.get("/:id", requirePermission("user.view"), validateParams(uuidParam), async (req, res, next) => {
  try {
    res.json({ data: await getUser(req.user!, String(req.params.id)) });
  } catch (err) {
    next(err);
  }
});

usersRouter.post("/", requirePermission("user.manage"), validateBody(createUserSchema), async (req, res, next) => {
  try {
    const data = await createUser(req.user!, req.body, req.requestId);
    res.status(201).json({ data });
  } catch (err) {
    next(err);
  }
});

usersRouter.patch(
  "/:id",
  requirePermission("user.manage"),
  validateParams(uuidParam),
  validateBody(updateUserSchema),
  async (req, res, next) => {
    try {
      const data = await updateUser(req.user!, String(req.params.id), req.body, req.requestId);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }
);

usersRouter.patch(
  "/:id/status",
  requirePermission("user.manage"),
  validateParams(uuidParam),
  validateBody(updateUserStatusSchema),
  async (req, res, next) => {
    try {
      const data = await updateUserStatus(req.user!, String(req.params.id), req.body.status, req.requestId);
      res.json({ data: { id: data.id, status: data.status } });
    } catch (err) {
      next(err);
    }
  }
);

rolesRouter.get("/", requirePermission("role.view"), async (req, res, next) => {
  try {
    res.json({ data: await listRoles(req.user!) });
  } catch (err) {
    next(err);
  }
});

permissionsRouter.get("/", requirePermission("role.view"), async (req, res, next) => {
  try {
    res.json({ data: await listPermissions(req.user!) });
  } catch (err) {
    next(err);
  }
});

notificationsRouter.get("/", async (req, res, next) => {
  try {
    const data = await prisma.notification.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

notificationsRouter.post("/:id/read", validateParams(uuidParam), async (req, res, next) => {
  try {
    const row = await prisma.notification.findFirst({
      where: { id: String(req.params.id), userId: req.user!.id },
    });
    if (!row) throw new AppError("NOT_FOUND", "Notification not found.", 404);
    const data = await prisma.notification.update({
      where: { id: row.id },
      data: { unread: false },
    });
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

reportsRouter.get("/catalog", requirePermission("report.view"), async (_req, res) => {
  res.json({
    data: [
      {
        id: "req-status",
        title: "Requisitions by status",
        name: "Requisitions by status",
        category: "Operations",
        description: "Status distribution across all requisitions",
        updated: new Date().toISOString().slice(0, 10),
        proposed: true,
      },
      {
        id: "req-department",
        title: "Requisitions by department",
        name: "Requisitions by department",
        category: "Performance",
        description: "Department performance rates from live staging data",
        updated: new Date().toISOString().slice(0, 10),
        proposed: true,
      },
      {
        id: "audit-recent",
        title: "Recent audit events",
        name: "Recent audit events",
        category: "Administration",
        description: "Latest audit log entries",
        updated: new Date().toISOString().slice(0, 10),
        proposed: true,
      },
    ],
  });
});

reportsRouter.get("/dashboard", requirePermission("report.view"), async (_req, res, next) => {
  try {
    const { getDashboardMetrics } = await import("../services/requisitionService.js");
    res.json({ data: await getDashboardMetrics() });
  } catch (err) {
    next(err);
  }
});

auditRouter.get("/", requirePermission("audit.view"), async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    res.json({ data: await listAuditLogs(limit) });
  } catch (err) {
    next(err);
  }
});

departmentsRouter.get("/", requirePermission("requisition.view"), async (_req, res, next) => {
  try {
    const data = await prisma.department.findMany({ orderBy: { name: "asc" } });
    res.json({ data });
  } catch (err) {
    next(err);
  }
});
