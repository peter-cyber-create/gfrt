import nodemailer from "nodemailer";
import { env } from "../../config.js";
import { logger } from "../../lib/logger.js";
import type { EmailProvider, PasswordResetEmail } from "./EmailProvider.js";

function assertSmtpConfigured() {
  if (!env.SMTP_HOST || !env.SMTP_FROM) {
    throw new Error(
      "SMTP email provider selected but SMTP_HOST and SMTP_FROM are not configured."
    );
  }
}

/**
 * Real SMTP transport via nodemailer.
 * Never log tokens, SMTP passwords, or message bodies containing secrets.
 */
export class SmtpEmailProvider implements EmailProvider {
  private transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT || 587,
    secure: env.SMTP_PORT === 465,
    auth:
      env.SMTP_USER && env.SMTP_PASS
        ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
        : undefined,
  });

  async sendPasswordReset(input: PasswordResetEmail): Promise<void> {
    assertSmtpConfigured();
    await this.transporter.sendMail({
      from: env.SMTP_FROM,
      to: input.to,
      subject: "Musooka staging password reset",
      text: `A password reset was requested for your Musooka staging account.\n\nOpen this link to reset (expires in 1 hour, single use):\n${input.resetUrl}\n\nIf you did not request this, ignore this email.`,
      html: `<p>A password reset was requested for your Musooka staging account.</p><p><a href="${input.resetUrl}">Reset your password</a></p><p>This link expires in 1 hour and can be used once.</p>`,
    });
    logger.info("email_sent", { type: "password_reset", toDomain: input.to.split("@")[1] || "unknown" });
  }
}
