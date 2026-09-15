import { assertProductionEmailProvider, env } from "../../config.js";
import type { EmailProvider } from "./EmailProvider.js";
import { MockEmailProvider } from "./MockEmailProvider.js";
import { SmtpEmailProvider } from "./SmtpEmailProvider.js";

let provider: EmailProvider | null = null;

export function getEmailProvider(): EmailProvider {
  assertProductionEmailProvider();
  if (!provider) {
    provider = env.EMAIL_PROVIDER === "smtp" ? new SmtpEmailProvider() : new MockEmailProvider();
  }
  return provider;
}

export { getSentEmails, clearSentEmails } from "./MockEmailProvider.js";
export type { EmailProvider, PasswordResetEmail } from "./EmailProvider.js";
