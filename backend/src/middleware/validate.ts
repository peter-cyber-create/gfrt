import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../lib/errors.js";

export function validateBody<T extends z.ZodType>(schema: T) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return next(
        new AppError("VALIDATION_ERROR", "Request body validation failed.", 400, parsed.error.flatten())
      );
    }
    req.body = parsed.data;
    next();
  };
}

export function validateQuery<T extends z.ZodType>(schema: T) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      return next(
        new AppError("VALIDATION_ERROR", "Query validation failed.", 400, parsed.error.flatten())
      );
    }
    (req as Request & { validatedQuery: z.infer<T> }).validatedQuery = parsed.data;
    next();
  };
}

export function validateParams<T extends z.ZodType>(schema: T) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.params);
    if (!parsed.success) {
      return next(
        new AppError("VALIDATION_ERROR", "Route parameter validation failed.", 400, parsed.error.flatten())
      );
    }
    req.params = parsed.data as typeof req.params;
    next();
  };
}

export const uuidParam = z.object({ id: z.string().uuid() });

export const loginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(200),
});

export const createRequisitionSchema = z.object({
  facility: z.string().min(1).max(200),
  district: z.string().min(1).max(200),
  departmentId: z.string().uuid(),
  description: z.string().min(1).max(5000),
  amountValue: z.number().int().nonnegative(),
  requiredAt: z.string().datetime().optional(),
  items: z
    .array(
      z.object({
        description: z.string().min(1).max(1000),
        quantity: z.number().int().positive(),
        unit: z.string().max(50).optional(),
        unitCost: z.number().int().nonnegative().optional(),
      })
    )
    .min(1)
    .max(100),
});

export const transitionSchema = z.object({
  note: z.string().max(2000).optional(),
});

export const listRequisitionsQuery = z.object({
  query: z.string().max(200).optional(),
  status: z
    .enum([
      "DRAFT",
      "SUBMITTED",
      "UNDER_REVIEW",
      "APPROVED",
      "REJECTED",
      "PROCESSING",
      "COMPLETED",
      "CANCELLED",
    ])
    .optional(),
  departmentId: z.string().uuid().optional(),
});

export const createUserSchema = z.object({
  email: z.string().email().max(255),
  name: z.string().min(1).max(200),
  password: z.string().min(8).max(200),
  roleId: z.string().uuid(),
  departmentId: z.string().uuid().optional(),
  phone: z.string().max(50).optional(),
});

export const updateUserStatusSchema = z.object({
  status: z.enum(["ACTIVE", "INACTIVE", "DISABLED"]),
});

export const passwordResetRequestSchema = z.object({
  email: z.string().email().max(255),
});

export const passwordResetConfirmSchema = z.object({
  token: z.string().min(20).max(200),
  password: z.string().min(8).max(200),
});
