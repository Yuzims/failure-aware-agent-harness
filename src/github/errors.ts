export type GitHubErrorCode =
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "rate_limited"
  | "server_error"
  | "network_error"
  | "timeout"
  | "malformed_response"
  | "invalid_snapshot"
  | "invalid_argument";

export class GitHubProviderError extends Error {
  readonly code: GitHubErrorCode;
  readonly operation: string;
  readonly status?: number;
  readonly retryable: boolean;

  constructor(input: {
    code: GitHubErrorCode;
    operation: string;
    message: string;
    status?: number;
    retryable?: boolean;
  }) {
    super(input.message);
    this.name = "GitHubProviderError";
    this.code = input.code;
    this.operation = input.operation;
    this.status = input.status;
    this.retryable = input.retryable ?? isRetryable(input.code);
  }
}

export function isRetryable(code: GitHubErrorCode): boolean {
  return (
    code === "rate_limited" ||
    code === "server_error" ||
    code === "network_error" ||
    code === "timeout"
  );
}

export function codeFromStatus(status: number, body = ""): GitHubErrorCode {
  if (status === 401) {
    return "unauthorized";
  }
  if (status === 404) {
    return "not_found";
  }
  if (status === 429) {
    return "rate_limited";
  }
  if (status === 403) {
    if (/rate limit|secondary rate/i.test(body)) {
      return "rate_limited";
    }
    return "forbidden";
  }
  if (status >= 500) {
    return "server_error";
  }
  if (status >= 400) {
    return "forbidden";
  }
  return "server_error";
}
