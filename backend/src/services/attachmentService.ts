/**
 * Secure attachment storage foundation.
 * Uploads must never land under the web/static root.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { AppError } from "../lib/errors.js";

const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

const ALLOWED_EXT = [".pdf", ".jpg", ".jpeg", ".png", ".xlsx"];

const MAX_BYTES = 5 * 1024 * 1024;

export type UploadInput = {
  originalName: string;
  mimeType: string;
  buffer: Buffer;
};

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
}

function validateFilename(originalName: string) {
  if (
    originalName.includes("..") ||
    originalName.includes("/") ||
    originalName.includes("\\")
  ) {
    throw new AppError("VALIDATION_ERROR", "Invalid filename.", 400);
  }

  const base = path.basename(originalName);
  const lower = base.toLowerCase();

  if (/\.exe$/i.test(lower) || /\.exe\./i.test(lower)) {
    throw new AppError("VALIDATION_ERROR", "Executable files are not allowed.", 400);
  }

  const dotParts = base.split(".");
  if (dotParts.length > 2) {
    throw new AppError("VALIDATION_ERROR", "Multiple file extensions are not allowed.", 400);
  }

  const ext = path.extname(base).toLowerCase();
  if (!ALLOWED_EXT.includes(ext)) {
    throw new AppError("VALIDATION_ERROR", "Unsupported file extension.", 400);
  }
}

export async function storeAttachment(input: UploadInput, storageRoot: string) {
  validateFilename(input.originalName);

  if (!ALLOWED_MIME.has(input.mimeType)) {
    throw new AppError("VALIDATION_ERROR", "Unsupported file type.", 400);
  }
  if (input.buffer.length > MAX_BYTES) {
    throw new AppError("VALIDATION_ERROR", "File exceeds size limit.", 400);
  }

  const key = `${randomUUID()}-${sanitizeFilename(path.basename(input.originalName))}`;
  const dir = path.resolve(storageRoot);
  await mkdir(dir, { recursive: true });
  const full = path.join(dir, key);
  const resolved = path.resolve(full);
  if (!resolved.startsWith(dir + path.sep) && resolved !== dir) {
    throw new AppError("VALIDATION_ERROR", "Invalid storage path.", 400);
  }
  await writeFile(resolved, input.buffer);
  return {
    storageKey: key,
    filename: sanitizeFilename(path.basename(input.originalName)),
    mimeType: input.mimeType,
    sizeBytes: input.buffer.length,
  };
}
