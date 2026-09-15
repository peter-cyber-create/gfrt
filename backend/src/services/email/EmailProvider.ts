export type PasswordResetEmail = {
  to: string;
  token: string;
  resetUrl: string;
};

export interface EmailProvider {
  sendPasswordReset(input: PasswordResetEmail): Promise<void>;
}
