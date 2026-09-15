import type { EmailProvider, PasswordResetEmail } from "./EmailProvider.js";

const sent: PasswordResetEmail[] = [];

export class MockEmailProvider implements EmailProvider {
  async sendPasswordReset(input: PasswordResetEmail): Promise<void> {
    sent.push({ ...input });
  }
}

export function getSentEmails(): PasswordResetEmail[] {
  return [...sent];
}

export function clearSentEmails(): void {
  sent.length = 0;
}
