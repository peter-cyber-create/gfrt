import { describe, expect, it, beforeEach } from "vitest";
import { createHash } from "node:crypto";
import { clearSentEmails, getSentEmails } from "../src/services/email/index.js";
import { requestPasswordReset, confirmPasswordReset } from "../src/services/passwordResetService.js";
import { prisma } from "./helpers.js";

describe("password reset", () => {
  beforeEach(() => {
    clearSentEmails();
  });

  it("stores hashed token and sends email via mock provider", async () => {
    const result = await requestPasswordReset("admin@musooka.local");
    expect(result.issued).toBe(true);
    expect(result._devToken).toBeTruthy();

    const emails = getSentEmails();
    expect(emails).toHaveLength(1);
    expect(emails[0].to).toBe("admin@musooka.local");

    const hash = createHash("sha256").update(result._devToken!).digest("hex");
    const row = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hash } });
    expect(row).toBeTruthy();
    expect(row?.usedAt).toBeNull();
  });

  it("confirm reset invalidates sessions", async () => {
    const result = await requestPasswordReset("user@musooka.local");
    const token = result._devToken!;

    const user = await prisma.user.findUnique({ where: { email: "user@musooka.local" } });
    await prisma.session.create({
      data: {
        userId: user!.id,
        tokenHash: createHash("sha256").update("existing-session").digest("hex"),
        expiresAt: new Date(Date.now() + 3600_000),
      },
    });
    expect(await prisma.session.count()).toBeGreaterThan(0);

    await confirmPasswordReset(token, "NewPassword123!");
    expect(await prisma.session.count()).toBe(0);

    const hash = createHash("sha256").update(token).digest("hex");
    const row = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hash } });
    expect(row?.usedAt).toBeTruthy();
  });
});
