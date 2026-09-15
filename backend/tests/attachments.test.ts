import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { storeAttachment } from "../src/services/attachmentService.js";

describe("attachmentService.storeAttachment", () => {
  let storageRoot: string;

  beforeEach(async () => {
    storageRoot = await mkdtemp(path.join(os.tmpdir(), "musooka-attach-"));
  });

  afterEach(async () => {
    await rm(storageRoot, { recursive: true, force: true });
  });

  it("stores a valid PDF under the storage root", async () => {
    const result = await storeAttachment(
      {
        originalName: "report.pdf",
        mimeType: "application/pdf",
        buffer: Buffer.from("%PDF-1.4 test"),
      },
      storageRoot
    );
    expect(result.storageKey).toMatch(/\.pdf$/);
    expect(result.sizeBytes).toBeGreaterThan(0);
    const resolved = path.resolve(storageRoot, result.storageKey);
    expect(resolved.startsWith(path.resolve(storageRoot))).toBe(true);
  });

  it("rejects oversized files", async () => {
    const big = Buffer.alloc(5 * 1024 * 1024 + 1);
    await expect(
      storeAttachment(
        { originalName: "big.pdf", mimeType: "application/pdf", buffer: big },
        storageRoot
      )
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR", status: 400 });
  });

  it("rejects bad mime types", async () => {
    await expect(
      storeAttachment(
        { originalName: "evil.exe", mimeType: "application/x-msdownload", buffer: Buffer.from("MZ") },
        storageRoot
      )
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR", status: 400 });
  });

  it("rejects .exe extension", async () => {
    await expect(
      storeAttachment(
        { originalName: "malware.exe", mimeType: "application/pdf", buffer: Buffer.from("x") },
        storageRoot
      )
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR", status: 400 });
  });

  it("rejects double extension tricks", async () => {
    await expect(
      storeAttachment(
        { originalName: "payload.exe.pdf", mimeType: "application/pdf", buffer: Buffer.from("x") },
        storageRoot
      )
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR", status: 400 });
  });

  it("rejects path traversal filenames", async () => {
    await expect(
      storeAttachment(
        {
          originalName: "../../etc/passwd.pdf",
          mimeType: "application/pdf",
          buffer: Buffer.from("x"),
        },
        storageRoot
      )
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR", status: 400 });
  });
});
