import { GitHubProviderError } from "../github/errors.js";

export async function withTimeout<T>(
  work: Promise<T>,
  timeoutMs: number,
  operation: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          reject(
            new GitHubProviderError({
              code: "timeout",
              operation,
              message: `${operation} timed out after ${timeoutMs}ms`,
            }),
          );
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

export function requireString(args: Record<string, unknown>, key: string, operation: string): string {
  const value = args[key];
  if (typeof value !== "string" || value.trim() === "") {
    throw new GitHubProviderError({
      code: "invalid_argument",
      operation,
      message: `${key} must be a non-empty string`,
      retryable: false,
    });
  }
  return value.trim();
}

export function requirePositiveInt(
  args: Record<string, unknown>,
  key: string,
  operation: string,
): number {
  const value = args[key];
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(n) || n <= 0) {
    throw new GitHubProviderError({
      code: "invalid_argument",
      operation,
      message: `${key} must be a positive integer`,
      retryable: false,
    });
  }
  return n;
}
