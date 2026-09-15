import { Router } from "express";
import multer from "multer";
import { createReadStream } from "node:fs";
import { access } from "node:fs/promises";
import path from "node:path";
import { env } from "../config.js";
import { AppError } from "../lib/errors.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";
import { uuidParam, validateParams } from "../middleware/validate.js";
import { storeAttachment } from "../services/attachmentService.js";
import { writeAudit } from "../services/auditService.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
});

export const attachmentsRouter = Router();
attachmentsRouter.use(requireAuth);

attachmentsRouter.post(
  "/requisitions/:id/attachments",
  requirePermission("requisition.edit"),
  validateParams(uuidParam),
  upload.single("file"),
  async (req, res, next) => {
    try {
      const requisitionId = String(req.params.id);
      const reqRow = await prisma.requisition.findUnique({ where: { id: requisitionId } });
      if (!reqRow) throw new AppError("NOT_FOUND", "Requisition not found.", 404);
      if (!req.file) throw new AppError("VALIDATION_ERROR", "File is required.", 400);

      const stored = await storeAttachment(
        {
          originalName: req.file.originalname,
          mimeType: req.file.mimetype,
          buffer: req.file.buffer,
        },
        env.STORAGE_ROOT
      );

      const row = await prisma.attachment.create({
        data: {
          requisitionId,
          filename: stored.filename,
          mimeType: stored.mimeType,
          sizeBytes: stored.sizeBytes,
          storageKey: stored.storageKey,
        },
      });

      await writeAudit({
        actorId: req.user!.id,
        action: "attachment.upload",
        entity: "attachment",
        entityId: row.id,
        requestId: req.requestId,
        metadata: { requisitionId, filename: stored.filename, sizeBytes: stored.sizeBytes },
      });

      res.status(201).json({ data: row });
    } catch (err) {
      next(err);
    }
  }
);

attachmentsRouter.get(
  "/attachments/:id",
  requirePermission("requisition.view"),
  validateParams(uuidParam),
  async (req, res, next) => {
    try {
      const id = String(req.params.id);
      const row = await prisma.attachment.findUnique({
        where: { id },
        include: { requisition: { select: { id: true, requesterId: true } } },
      });
      if (!row) throw new AppError("NOT_FOUND", "Attachment not found.", 404);

      // Authorization: must have requisition.view (already) — IDOR hardening: only
      // requester or users with requisition.approve / user.manage can download others'.
      const canBroad =
        req.user!.permissions.includes("requisition.approve") ||
        req.user!.permissions.includes("user.manage");
      if (!canBroad && row.requisition.requesterId !== req.user!.id) {
        throw new AppError("FORBIDDEN", "You cannot access this attachment.", 403);
      }

      const full = path.resolve(env.STORAGE_ROOT, row.storageKey);
      const root = path.resolve(env.STORAGE_ROOT);
      if (!full.startsWith(root + path.sep)) {
        throw new AppError("NOT_FOUND", "Attachment not found.", 404);
      }
      await access(full);

      res.setHeader("Content-Type", row.mimeType);
      res.setHeader("Content-Disposition", `attachment; filename="${row.filename}"`);
      createReadStream(full).pipe(res);
    } catch (err) {
      next(err);
    }
  }
);
