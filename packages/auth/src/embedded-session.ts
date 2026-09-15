import {
  createPrivateKey,
  createPublicKey,
  sign as signBytes,
  verify as verifyBytes,
} from "node:crypto";

import { SafeTenantReferenceSchema } from "@oalo/contracts";

import {
  EMBEDDED_SESSION_ALGORITHM,
  SESSION_APPLICATION_ROLE_SET,
  SessionPolicyError,
  type SessionApplicationRole,
} from "./session-policy.js";

const SAFE_REFERENCE = /^[a-z][a-z0-9_-]{2,95}$/u;
const HEADER_KEYS = new Set(["alg", "kid", "typ"]);
const CLAIM_KEYS = new Set([
  "aud",
  "exp",
  "iat",
  "installationId",
  "iss",
  "locationId",
  "nbf",
  "nonce",
  "role",
  "roleVersion",
  "sessionId",
  "sub",
]);

interface EmbeddedSessionHeader {
  readonly alg: typeof EMBEDDED_SESSION_ALGORITHM;
  readonly kid: string;
  readonly typ: "JWT";
}

export interface EmbeddedSessionTokenClaims {
  readonly iss: string;
  readonly aud: string;
  readonly iat: number;
  readonly nbf: number;
  readonly exp: number;
  readonly sub: string;
  readonly sessionId: string;
  readonly nonce: string;
  readonly locationId: string;
  readonly installationId: string;
  readonly role: SessionApplicationRole;
  readonly roleVersion: number;
}

export interface EmbeddedSessionVerificationPolicy {
  readonly issuer: string;
  readonly audience: string;
  readonly publicKeysById: Readonly<Record<string, string>>;
  readonly nowEpochSeconds: number;
  readonly expectedSubject: string;
  readonly expectedSessionId: string;
  readonly expectedNonce: string;
  readonly expectedRole: EmbeddedSessionTokenClaims["role"];
  readonly currentRoleVersion: number;
  readonly expectedLocationId: string;
  readonly expectedInstallationId: string;
  readonly resourceLocationId?: string;
  readonly clockSkewSeconds?: number;
  readonly isSessionActive: (claims: EmbeddedSessionTokenClaims) => boolean;
}

function reject(): never {
  throw new SessionPolicyError();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, allowed: ReadonlySet<string>): boolean {
  return Object.keys(value).every((key) => allowed.has(key));
}

function requiredString(value: unknown): string {
  if (typeof value !== "string" || !SAFE_REFERENCE.test(value)) return reject();
  return value;
}

function requiredInteger(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value)) return reject();
  return value;
}

function decodeJsonSegment(segment: string): unknown {
  if (!/^[A-Za-z0-9_-]+$/u.test(segment)) return reject();
  try {
    return JSON.parse(Buffer.from(segment, "base64url").toString("utf8")) as unknown;
  } catch {
    return reject();
  }
}

function parseHeader(value: unknown): EmbeddedSessionHeader {
  if (!isRecord(value) || !hasOnlyKeys(value, HEADER_KEYS)) return reject();
  if (
    value["alg"] !== EMBEDDED_SESSION_ALGORITHM ||
    value["typ"] !== "JWT" ||
    typeof value["kid"] !== "string" ||
    !SAFE_REFERENCE.test(value["kid"])
  ) {
    return reject();
  }
  return { alg: EMBEDDED_SESSION_ALGORITHM, kid: value["kid"], typ: "JWT" };
}

function parseClaims(value: unknown): EmbeddedSessionTokenClaims {
  if (!isRecord(value) || !hasOnlyKeys(value, CLAIM_KEYS)) return reject();
  const role = value["role"];
  if (typeof role !== "string" || !SESSION_APPLICATION_ROLE_SET.has(role)) return reject();
  if (typeof value["iss"] !== "string" || typeof value["aud"] !== "string") return reject();

  const locationId = requiredString(value["locationId"]);
  const installationId = requiredString(value["installationId"]);
  if (
    !SafeTenantReferenceSchema.safeParse(locationId).success ||
    !SafeTenantReferenceSchema.safeParse(installationId).success
  ) {
    return reject();
  }

  return {
    iss: value["iss"],
    aud: value["aud"],
    iat: requiredInteger(value["iat"]),
    nbf: requiredInteger(value["nbf"]),
    exp: requiredInteger(value["exp"]),
    sub: requiredString(value["sub"]),
    sessionId: requiredString(value["sessionId"]),
    nonce: requiredString(value["nonce"]),
    locationId,
    installationId,
    role: role as SessionApplicationRole,
    roleVersion: requiredInteger(value["roleVersion"]),
  };
}

function encodeJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function assertIssuerAndAudience(issuer: string, audience: string): void {
  let parsed: URL;
  try {
    parsed = new URL(issuer);
  } catch {
    return reject();
  }
  if (
    parsed.protocol !== "https:" ||
    parsed.username !== "" ||
    parsed.password !== "" ||
    parsed.search !== "" ||
    parsed.hash !== "" ||
    !SAFE_REFERENCE.test(audience)
  ) {
    reject();
  }
}

function assertIssueInput(input: IssueEmbeddedSessionTokenInput): void {
  if (
    !SAFE_REFERENCE.test(input.keyId) ||
    !SAFE_REFERENCE.test(input.subject) ||
    !SAFE_REFERENCE.test(input.sessionId) ||
    !SAFE_REFERENCE.test(input.nonce) ||
    !SESSION_APPLICATION_ROLE_SET.has(input.role) ||
    !Number.isSafeInteger(input.roleVersion) ||
    input.roleVersion < 1 ||
    !Number.isSafeInteger(input.nowEpochSeconds)
  ) {
    reject();
  }
  assertIssuerAndAudience(input.issuer, input.audience);
  if (
    !SafeTenantReferenceSchema.safeParse(input.locationId).success ||
    !SafeTenantReferenceSchema.safeParse(input.installationId).success
  ) {
    reject();
  }
}

export interface IssueEmbeddedSessionTokenInput {
  readonly privateKeyPem: string;
  readonly keyId: string;
  readonly issuer: string;
  readonly audience: string;
  readonly subject: string;
  readonly sessionId: string;
  readonly nonce: string;
  readonly locationId: string;
  readonly installationId: string;
  readonly role: EmbeddedSessionTokenClaims["role"];
  readonly roleVersion: number;
  readonly nowEpochSeconds: number;
}

export function issueEmbeddedSessionToken(input: IssueEmbeddedSessionTokenInput): string {
  assertIssueInput(input);
  const header: EmbeddedSessionHeader = {
    alg: EMBEDDED_SESSION_ALGORITHM,
    kid: input.keyId,
    typ: "JWT",
  };
  const claims: EmbeddedSessionTokenClaims = {
    iss: input.issuer,
    aud: input.audience,
    iat: input.nowEpochSeconds,
    nbf: input.nowEpochSeconds,
    exp: input.nowEpochSeconds + 300,
    sub: input.subject,
    sessionId: input.sessionId,
    nonce: input.nonce,
    locationId: input.locationId,
    installationId: input.installationId,
    role: input.role,
    roleVersion: input.roleVersion,
  };
  const signingInput = `${encodeJson(header)}.${encodeJson(claims)}`;
  const signature = signBytes(
    null,
    Buffer.from(signingInput),
    createPrivateKey(input.privateKeyPem),
  );
  return `${signingInput}.${signature.toString("base64url")}`;
}

export function readSignedEmbeddedSessionToken(input: {
  readonly token: string;
  readonly publicKeysById: Readonly<Record<string, string>>;
}): Readonly<EmbeddedSessionTokenClaims> {
  const segments = input.token.split(".");
  if (segments.length !== 3) return reject();
  const [encodedHeader, encodedClaims, encodedSignature] = segments;
  if (
    encodedHeader === undefined ||
    encodedClaims === undefined ||
    encodedSignature === undefined ||
    !/^[A-Za-z0-9_-]+$/u.test(encodedSignature)
  ) {
    return reject();
  }
  const header = parseHeader(decodeJsonSegment(encodedHeader));
  const publicKeyPem = input.publicKeysById[header.kid];
  if (publicKeyPem === undefined) return reject();

  let signatureValid = false;
  try {
    signatureValid = verifyBytes(
      null,
      Buffer.from(`${encodedHeader}.${encodedClaims}`),
      createPublicKey(publicKeyPem),
      Buffer.from(encodedSignature, "base64url"),
    );
  } catch {
    return reject();
  }
  if (!signatureValid) return reject();
  return parseClaims(decodeJsonSegment(encodedClaims));
}

export function assertEmbeddedSessionLifetime(
  claims: EmbeddedSessionTokenClaims,
  policy: Readonly<{
    issuer: string;
    audience: string;
    nowEpochSeconds: number;
    clockSkewSeconds?: number;
  }>,
): void {
  const skew = policy.clockSkewSeconds ?? 0;
  assertIssuerAndAudience(policy.issuer, policy.audience);
  if (
    !Number.isSafeInteger(skew) ||
    skew < 0 ||
    skew > 60 ||
    claims.iss !== policy.issuer ||
    claims.aud !== policy.audience ||
    claims.iat > policy.nowEpochSeconds + skew ||
    claims.nbf > policy.nowEpochSeconds + skew ||
    claims.exp <= policy.nowEpochSeconds - skew ||
    claims.exp - claims.iat !== 300
  ) {
    reject();
  }
}

export function verifyEmbeddedSessionToken(input: {
  readonly token: string;
  readonly policy: EmbeddedSessionVerificationPolicy;
}): Readonly<EmbeddedSessionTokenClaims> {
  const claims = readSignedEmbeddedSessionToken({
    token: input.token,
    publicKeysById: input.policy.publicKeysById,
  });
  assertEmbeddedSessionLifetime(claims, input.policy);
  if (
    claims.sub !== input.policy.expectedSubject ||
    claims.sessionId !== input.policy.expectedSessionId ||
    claims.nonce !== input.policy.expectedNonce ||
    claims.role !== input.policy.expectedRole ||
    claims.roleVersion !== input.policy.currentRoleVersion ||
    claims.locationId !== input.policy.expectedLocationId ||
    claims.installationId !== input.policy.expectedInstallationId ||
    (input.policy.resourceLocationId !== undefined &&
      claims.locationId !== input.policy.resourceLocationId) ||
    !input.policy.isSessionActive(claims)
  ) {
    return reject();
  }

  return Object.freeze({ ...claims });
}
