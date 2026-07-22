import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import { SafeTenantReferenceSchema } from "@oalo/contracts";

export class OAuthStateError extends Error {
  public constructor() {
    super("The OAuth authorization state is invalid or has already been used.");
    this.name = "OAuthStateError";
  }
}

export interface OAuthStateRecord {
  readonly nonceHash: string;
  readonly installationId: string;
  readonly locationId: string;
  readonly redirectUri: string;
  readonly expiresAtEpochSeconds: number;
}

export interface OAuthStateStore {
  create(record: OAuthStateRecord): Promise<void>;
  consume(nonceHash: string, nowEpochSeconds: number): Promise<boolean>;
}

interface OAuthStatePayload {
  readonly v: 1;
  readonly aud: "highlevel-oauth-callback";
  readonly installationId: string;
  readonly locationId: string;
  readonly redirectUri: string;
  readonly nonce: string;
  readonly iat: number;
  readonly exp: number;
}

const PAYLOAD_KEYS = new Set([
  "aud",
  "exp",
  "iat",
  "installationId",
  "locationId",
  "nonce",
  "redirectUri",
  "v",
]);

function reject(): never {
  throw new OAuthStateError();
}

function assertSigningSecret(secret: Uint8Array): void {
  if (secret.byteLength < 32) reject();
}

function assertTenantReference(value: string): void {
  if (!SafeTenantReferenceSchema.safeParse(value).success) reject();
}

function assertExactHttpsCallback(value: string): void {
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
    parsed.hash !== ""
  ) {
    reject();
  }
}

function stateSignature(encodedPayload: string, signingSecret: Uint8Array): Buffer {
  return createHmac("sha256", signingSecret).update(encodedPayload).digest();
}

function hashNonce(nonce: string): string {
  return createHash("sha256").update(nonce).digest("hex");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parsePayload(segment: string): OAuthStatePayload {
  if (!/^[A-Za-z0-9_-]+$/u.test(segment)) return reject();
  let decoded: unknown;
  try {
    decoded = JSON.parse(Buffer.from(segment, "base64url").toString("utf8")) as unknown;
  } catch {
    return reject();
  }
  if (
    !isRecord(decoded) ||
    !Object.keys(decoded).every((key) => PAYLOAD_KEYS.has(key)) ||
    decoded["v"] !== 1 ||
    decoded["aud"] !== "highlevel-oauth-callback" ||
    typeof decoded["installationId"] !== "string" ||
    typeof decoded["locationId"] !== "string" ||
    typeof decoded["redirectUri"] !== "string" ||
    typeof decoded["nonce"] !== "string" ||
    !/^[A-Za-z0-9_-]{43}$/u.test(decoded["nonce"]) ||
    typeof decoded["iat"] !== "number" ||
    !Number.isSafeInteger(decoded["iat"]) ||
    typeof decoded["exp"] !== "number" ||
    !Number.isSafeInteger(decoded["exp"])
  ) {
    return reject();
  }
  assertTenantReference(decoded["installationId"]);
  assertTenantReference(decoded["locationId"]);
  assertExactHttpsCallback(decoded["redirectUri"]);
  return decoded as unknown as OAuthStatePayload;
}

export async function issueOAuthState(input: {
  readonly signingSecret: Uint8Array;
  readonly store: OAuthStateStore;
  readonly installationId: string;
  readonly locationId: string;
  readonly redirectUri: string;
  readonly nowEpochSeconds: number;
}): Promise<string> {
  assertSigningSecret(input.signingSecret);
  assertTenantReference(input.installationId);
  assertTenantReference(input.locationId);
  assertExactHttpsCallback(input.redirectUri);
  if (!Number.isSafeInteger(input.nowEpochSeconds)) reject();

  const nonce = randomBytes(32).toString("base64url");
  const payload: OAuthStatePayload = {
    v: 1,
    aud: "highlevel-oauth-callback",
    installationId: input.installationId,
    locationId: input.locationId,
    redirectUri: input.redirectUri,
    nonce,
    iat: input.nowEpochSeconds,
    exp: input.nowEpochSeconds + 300,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  await input.store.create({
    nonceHash: hashNonce(nonce),
    installationId: input.installationId,
    locationId: input.locationId,
    redirectUri: input.redirectUri,
    expiresAtEpochSeconds: payload.exp,
  });
  return `${encodedPayload}.${stateSignature(encodedPayload, input.signingSecret).toString("base64url")}`;
}

export async function consumeOAuthState(input: {
  readonly state: string;
  readonly signingSecret: Uint8Array;
  readonly store: OAuthStateStore;
  readonly expectedInstallationId: string;
  readonly expectedLocationId: string;
  readonly exactRedirectUri: string;
  readonly nowEpochSeconds: number;
}): Promise<Readonly<Omit<OAuthStatePayload, "nonce">>> {
  assertSigningSecret(input.signingSecret);
  assertTenantReference(input.expectedInstallationId);
  assertTenantReference(input.expectedLocationId);
  assertExactHttpsCallback(input.exactRedirectUri);
  const segments = input.state.split(".");
  if (segments.length !== 2) return reject();
  const [encodedPayload, encodedSignature] = segments;
  if (
    encodedPayload === undefined ||
    encodedSignature === undefined ||
    !/^[A-Za-z0-9_-]+$/u.test(encodedSignature)
  ) {
    return reject();
  }
  const expectedSignature = stateSignature(encodedPayload, input.signingSecret);
  const receivedSignature = Buffer.from(encodedSignature, "base64url");
  if (
    expectedSignature.byteLength !== receivedSignature.byteLength ||
    !timingSafeEqual(expectedSignature, receivedSignature)
  ) {
    return reject();
  }

  const payload = parsePayload(encodedPayload);
  if (
    payload.installationId !== input.expectedInstallationId ||
    payload.locationId !== input.expectedLocationId ||
    payload.redirectUri !== input.exactRedirectUri ||
    payload.iat > input.nowEpochSeconds ||
    payload.exp <= input.nowEpochSeconds ||
    payload.exp - payload.iat !== 300 ||
    !(await input.store.consume(hashNonce(payload.nonce), input.nowEpochSeconds))
  ) {
    return reject();
  }

  return Object.freeze({
    v: payload.v,
    aud: payload.aud,
    installationId: payload.installationId,
    locationId: payload.locationId,
    redirectUri: payload.redirectUri,
    iat: payload.iat,
    exp: payload.exp,
  });
}
