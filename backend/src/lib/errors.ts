export type ErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "ACCOUNT_LOCKED"
  | "ACCOUNT_INACTIVE"
  | "INVALID_CREDENTIALS"
  | "REQUISITION_INVALID_STATE"
  | "INTERNAL_ERROR";

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly status: number = 400,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function toClientError(err: unknown) {
  if (err instanceof AppError) {
    return {
      status: err.status,
      body: {
        error: {
          code: err.code,
          message: err.message,
          ...(err.details ? { details: err.details } : {}),
        },
      },
    };
  }
  return {
    status: 500,
    body: {
      error: {
        code: "INTERNAL_ERROR" as const,
        message: "An unexpected error occurred.",
      },
    },
  };
}
