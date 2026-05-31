// Represents an error that maps directly to an HTTP response status.
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
  }
}

// Represents invalid client input.
export class BadRequestError extends HttpError {
  constructor(message: string) {
    super(400, message);
  }
}

// Represents a missing HTTP resource.
export class NotFoundError extends HttpError {
  constructor(message: string) {
    super(404, message);
  }
}

// Represents failures returned by or caused by the GitHub API.
export class GitHubApiError extends HttpError {
  constructor(message: string) {
    super(502, message);
  }
}
