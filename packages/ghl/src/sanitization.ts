const FORBIDDEN_KEY_PATTERNS = [
  /^(authorization|proxy-authorization)$/i,
  /access.?token/i,
  /refresh.?token/i,
  /id.?token/i,
  /token$/i,
  /client.?secret/i,
  /shared.?secret/i,
  /api.?key/i,
  /cookie/i,
  /^code$/i,
  /o?auth(?:orization)?[-_]?code/i,
  /email/i,
  /phone/i,
  /first.?name/i,
  /last.?name/i,
  /user.?name/i,
  /street|address|postal|zip/i,
  /lead|contact|borrower|consumer/i,
  /budget|spend|price|amount|currency|monetary/i,
] as const;

const FORBIDDEN_VALUE_PATTERNS = [
  /\bBearer\s+[A-Za-z0-9._~-]+/i,
  /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/,
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
  /(?<![A-Za-z0-9])(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}(?![A-Za-z0-9])/,
] as const;

const FORBIDDEN_LIVE_PATH_PATTERNS = [
  /\bdelete\b/i,
  /\bremove\b/i,
  /audience.*member/i,
  /integration/i,
  /reselling/i,
  /google/i,
  /linkedin/i,
] as const;

export class UnsafeFixtureError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "UnsafeFixtureError";
  }
}

function visit(value: unknown, path: string, seen: Set<object>): void {
  if (typeof value === "string") {
    if (FORBIDDEN_VALUE_PATTERNS.some((pattern) => pattern.test(value))) {
      throw new UnsafeFixtureError(`Fixture contains a forbidden value at ${path}.`);
    }
    return;
  }

  if (value === null || typeof value !== "object") {
    return;
  }

  if (seen.has(value)) {
    throw new UnsafeFixtureError(`Fixture contains a circular value at ${path}.`);
  }
  seen.add(value);

  if (Array.isArray(value)) {
    value.forEach((entry, index) => visit(entry, `${path}[${index}]`, seen));
    seen.delete(value);
    return;
  }

  for (const [key, entry] of Object.entries(value)) {
    if (FORBIDDEN_KEY_PATTERNS.some((pattern) => pattern.test(key))) {
      throw new UnsafeFixtureError(`Fixture contains forbidden field "${key}" at ${path}.`);
    }
    visit(entry, `${path}.${key}`, seen);
  }
  seen.delete(value);
}

export function assertFixtureIsSanitized(value: unknown): void {
  visit(value, "$", new Set<object>());
}

export function assertFixtureOnlyRequest(request: {
  readonly transport: string;
  readonly method: string;
  readonly path: string;
}): void {
  if (request.transport !== "fixture-replay") {
    throw new UnsafeFixtureError("Phase 0 evidence accepts fixture replay only.");
  }

  if (FORBIDDEN_LIVE_PATH_PATTERNS.some((pattern) => pattern.test(request.path))) {
    throw new UnsafeFixtureError(`Forbidden provider operation path: ${request.path}.`);
  }

  if (request.method === "DELETE" || request.method === "PATCH" || request.method === "PUT") {
    throw new UnsafeFixtureError(
      `Destructive or live mutation method is prohibited: ${request.method}.`,
    );
  }
}
