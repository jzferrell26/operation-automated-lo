import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import { SafeTenantReferenceSchema } from "@oalo/contracts";

export class BrowserSessionPolicyError extends Error {
  public constructor() {
    super("The browser session request is not authorized.");
    this.name = "BrowserSessionPolicyError";
  }
}

export const FIRST_PARTY_SESSION_COOKIE = "__Host-oalo_session" as const;
export const PARTITIONED_SESSION_COOKIE = "__Host-oalo_partitioned" as const;

export interface FirstPartyHandoffRecord {
  readonly codeHash: string;
  readonly sessionId: string;
  readonly userId: string;
  readonly locationId: string;
  readonly installationId: string;
  readonly roleVersion: number;
  readonly expiresAtEpochSeconds: number;
}

export interface FirstPartyHandoffStore {
  create(record: FirstPartyHandoffRecord): Promise<void>;
  consume(codeHash: string, nowEpochSeconds: number): Promise<FirstPartyHandoffRecord | undefined>;
}

function reject(): never {
  throw new BrowserSessionPolicyError();
}

function assertSecret(secret: Uint8Array): void {
  if (secret.byteLength < 32) reject();
}

function safeReference(value: string): string {
  if (!SafeTenantReferenceSchema.safeParse(value).success) reject();
  return value;
}

function exactOrigin(value: string): string {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return reject();
  }
  if (
    parsed.protocol !== "https:" ||
    parsed.username !== "" ||
    parsed.password !== "" ||
    parsed.pathname !== "/" ||
    parsed.search !== "" ||
    parsed.hash !== "" ||
    parsed.origin !== value
  ) {
    reject();
  }
  return parsed.origin;
}

function hashHandoffCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

function assertCookieValue(value: string): void {
  if (!/^[A-Za-z0-9_-]{32,256}$/u.test(value)) reject();
}

export function serializeFirstPartySessionCookie(input: {
  readonly sessionSecret: string;
  readonly maxAgeSeconds: number;
}): string {
  assertCookieValue(input.sessionSecret);
  if (
    !Number.isSafeInteger(input.maxAgeSeconds) ||
    input.maxAgeSeconds < 1 ||
    input.maxAgeSeconds > 2_592_000
  ) {
    reject();
  }
  return `${FIRST_PARTY_SESSION_COOKIE}=${input.sessionSecret}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${input.maxAgeSeconds}`;
}

export function serializePartitionedSessionCookie(input: {
  readonly sessionSecret: string;
  readonly maxAgeSeconds: number;
}): string {
  assertCookieValue(input.sessionSecret);
  if (
    !Number.isSafeInteger(input.maxAgeSeconds) ||
    input.maxAgeSeconds < 1 ||
    input.maxAgeSeconds > 300
  ) {
    reject();
  }
  return `${PARTITIONED_SESSION_COOKIE}=${input.sessionSecret}; Path=/; HttpOnly; Secure; SameSite=None; Partitioned; Max-Age=${input.maxAgeSeconds}`;
}

export async function issueFirstPartyHandoff(input: {
  readonly store: FirstPartyHandoffStore;
  readonly firstPartyOrigin: string;
  readonly handoffPath: `/${string}`;
  readonly sessionId: string;
  readonly userId: string;
  readonly locationId: string;
  readonly installationId: string;
  readonly roleVersion: number;
  readonly nowEpochSeconds: number;
}): Promise<Readonly<{ code: string; fragmentUrl: string; expiresAtEpochSeconds: number }>> {
  const origin = exactOrigin(input.firstPartyOrigin);
  if (
    !input.handoffPath.startsWith("/") ||
    input.handoffPath.includes("?") ||
    input.handoffPath.includes("#") ||
    !Number.isSafeInteger(input.roleVersion) ||
    input.roleVersion < 1 ||
    !Number.isSafeInteger(input.nowEpochSeconds)
  ) {
    reject();
  }
  const code = randomBytes(32).toString("base64url");
  const expiresAtEpochSeconds = input.nowEpochSeconds + 300;
  await input.store.create({
    codeHash: hashHandoffCode(code),
    sessionId: safeReference(input.sessionId),
    userId: safeReference(input.userId),
    locationId: safeReference(input.locationId),
    installationId: safeReference(input.installationId),
    roleVersion: input.roleVersion,
    expiresAtEpochSeconds,
  });
  return Object.freeze({
    code,
    fragmentUrl: `${origin}${input.handoffPath}#handoff=${encodeURIComponent(code)}`,
    expiresAtEpochSeconds,
  });
}

export async function consumeFirstPartyHandoff(input: {
  readonly store: FirstPartyHandoffStore;
  readonly code: string;
  readonly nowEpochSeconds: number;
}): Promise<Readonly<Omit<FirstPartyHandoffRecord, "codeHash">>> {
  if (!/^[A-Za-z0-9_-]{43}$/u.test(input.code) || !Number.isSafeInteger(input.nowEpochSeconds)) {
    return reject();
  }
  const record = await input.store.consume(hashHandoffCode(input.code), input.nowEpochSeconds);
  if (record === undefined || record.expiresAtEpochSeconds <= input.nowEpochSeconds)
    return reject();
  return Object.freeze({
    sessionId: record.sessionId,
    userId: record.userId,
    locationId: record.locationId,
    installationId: record.installationId,
    roleVersion: record.roleVersion,
    expiresAtEpochSeconds: record.expiresAtEpochSeconds,
  });
}

export function createSessionBoundCsrfToken(input: {
  readonly serverSecret: Uint8Array;
  readonly sessionId: string;
}): string {
  assertSecret(input.serverSecret);
  safeReference(input.sessionId);
  return createHmac("sha256", input.serverSecret)
    .update(`csrf\0${input.sessionId}`)
    .digest("base64url");
}

function csrfMatches(expected: string, received: string | undefined): boolean {
  if (received === undefined || !/^[A-Za-z0-9_-]{43}$/u.test(received)) return false;
  const expectedBytes = Buffer.from(expected);
  const receivedBytes = Buffer.from(received);
  return (
    expectedBytes.byteLength === receivedBytes.byteLength &&
    timingSafeEqual(expectedBytes, receivedBytes)
  );
}

export function assertBrowserMutationRequest(input: {
  readonly authenticationMode: "cookie" | "embedded-bearer";
  readonly origin: string | null;
  readonly host: string;
  readonly expectedHost: string;
  readonly allowedBrowserOrigins: readonly string[];
  readonly sessionId: string;
  readonly csrfServerSecret: Uint8Array;
  readonly csrfToken?: string;
}): void {
  if (
    input.host !== input.expectedHost ||
    input.expectedHost.length === 0 ||
    input.origin === null ||
    input.allowedBrowserOrigins.length === 0 ||
    input.allowedBrowserOrigins.some((origin) => origin === "*" || exactOrigin(origin) !== origin)
  ) {
    reject();
  }
  const allowed = new Set(input.allowedBrowserOrigins);
  if (!allowed.has(input.origin)) reject();
  if (input.authenticationMode === "cookie") {
    if (new URL(input.origin).host !== input.host) reject();
    const expectedCsrf = createSessionBoundCsrfToken({
      serverSecret: input.csrfServerSecret,
      sessionId: input.sessionId,
    });
    if (!csrfMatches(expectedCsrf, input.csrfToken)) reject();
  }
}

export function authSurfaceSecurityHeaders(input: {
  readonly surface: "embedded" | "first-party" | "handoff";
  readonly embeddedFrameAncestors?: readonly string[];
}): Readonly<Record<string, string>> {
  const ancestors = input.embeddedFrameAncestors ?? [];
  if (
    input.surface === "embedded" &&
    (ancestors.length === 0 || ancestors.some((origin) => exactOrigin(origin) !== origin))
  ) {
    reject();
  }
  const frameAncestors =
    input.surface === "embedded" ? ["'self'", ...ancestors].join(" ") : "'none'";
  const headers: Record<string, string> = {
    "Cache-Control": "no-store",
    "Content-Security-Policy": `default-src 'self'; frame-ancestors ${frameAncestors}`,
    "Referrer-Policy":
      input.surface === "handoff" ? "no-referrer" : "strict-origin-when-cross-origin",
  };
  if (input.surface !== "embedded") headers["X-Frame-Options"] = "DENY";
  return Object.freeze(headers);
}
