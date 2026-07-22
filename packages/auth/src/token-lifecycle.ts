import { SafeTenantReferenceSchema } from "@oalo/contracts";

export class TokenLifecyclePolicyError extends Error {
  public constructor() {
    super("The token lifecycle operation is not authorized.");
    this.name = "TokenLifecyclePolicyError";
  }
}

function reject(): never {
  throw new TokenLifecyclePolicyError();
}

function assertEpoch(value: number): void {
  if (!Number.isSafeInteger(value) || value < 0) reject();
}

function assertTenantReference(value: string): void {
  if (!SafeTenantReferenceSchema.safeParse(value).success) reject();
}

export interface TokenEnvelopeMetadata {
  readonly envelopeVersion: number;
  readonly encryptedEnvelopeRef: string;
  readonly accessExpiresAtEpochSeconds: number;
  readonly refreshExpiresAtEpochSeconds?: number;
  readonly grantedScopes: readonly string[];
}

export interface TokenEnvelopeRotationPort {
  replaceAtomically(input: {
    readonly locationId: string;
    readonly installationId: string;
    readonly expectedEnvelopeVersion: number;
    readonly next: TokenEnvelopeMetadata;
  }): Promise<boolean>;
}

export interface UninstallAuthorityPort {
  revokeAtomically(input: {
    readonly locationId: string;
    readonly installationId: string;
    readonly revokedAtEpochSeconds: number;
  }): Promise<{
    readonly installationStatus: "UNINSTALLED";
    readonly tokenState: "UNUSABLE";
    readonly queuedWritesState: "BLOCKED";
    readonly revokedSessionCount: number;
  }>;
}

export function shouldRefreshToken(input: {
  readonly accessExpiresAtEpochSeconds: number;
  readonly nowEpochSeconds: number;
  readonly refreshLeadSeconds: number;
}): boolean {
  assertEpoch(input.accessExpiresAtEpochSeconds);
  assertEpoch(input.nowEpochSeconds);
  if (
    !Number.isSafeInteger(input.refreshLeadSeconds) ||
    input.refreshLeadSeconds < 30 ||
    input.refreshLeadSeconds > 1_800
  ) {
    reject();
  }
  return input.nowEpochSeconds >= input.accessExpiresAtEpochSeconds - input.refreshLeadSeconds;
}

function assertEnvelopeMetadata(value: TokenEnvelopeMetadata): void {
  if (
    !Number.isSafeInteger(value.envelopeVersion) ||
    value.envelopeVersion < 1 ||
    !/^envelope_[a-z0-9_-]{8,95}$/u.test(value.encryptedEnvelopeRef) ||
    value.grantedScopes.length > 64 ||
    value.grantedScopes.some((scope) => !/^[A-Za-z0-9./:_-]+$/u.test(scope))
  ) {
    reject();
  }
  assertEpoch(value.accessExpiresAtEpochSeconds);
  if (value.refreshExpiresAtEpochSeconds !== undefined) {
    assertEpoch(value.refreshExpiresAtEpochSeconds);
    if (value.refreshExpiresAtEpochSeconds <= value.accessExpiresAtEpochSeconds) reject();
  }
}

export async function replaceTokenEnvelopeAtomically(input: {
  readonly port: TokenEnvelopeRotationPort;
  readonly locationId: string;
  readonly installationId: string;
  readonly expectedEnvelopeVersion: number;
  readonly next: TokenEnvelopeMetadata;
}): Promise<TokenEnvelopeMetadata> {
  assertTenantReference(input.locationId);
  assertTenantReference(input.installationId);
  assertEnvelopeMetadata(input.next);
  if (
    !Number.isSafeInteger(input.expectedEnvelopeVersion) ||
    input.expectedEnvelopeVersion < 1 ||
    input.next.envelopeVersion !== input.expectedEnvelopeVersion + 1 ||
    !(await input.port.replaceAtomically({
      locationId: input.locationId,
      installationId: input.installationId,
      expectedEnvelopeVersion: input.expectedEnvelopeVersion,
      next: input.next,
    }))
  ) {
    return reject();
  }
  return Object.freeze({
    ...input.next,
    grantedScopes: Object.freeze([...input.next.grantedScopes]),
  });
}

export class LocationRefreshCoordinator {
  readonly #locks = new Map<string, Promise<void>>();

  public async run<T>(locationId: string, operation: () => Promise<T>): Promise<T> {
    assertTenantReference(locationId);
    while (this.#locks.has(locationId)) {
      await this.#locks.get(locationId);
    }
    let release: (() => void) | undefined;
    const lock = new Promise<void>((resolve) => {
      release = resolve;
    });
    this.#locks.set(locationId, lock);
    try {
      return await operation();
    } finally {
      if (this.#locks.get(locationId) === lock) this.#locks.delete(locationId);
      release?.();
    }
  }
}

export async function executeWithOneAuthenticationRetry<T>(input: {
  readonly request: () => Promise<T>;
  readonly refresh: () => Promise<void>;
  readonly isConfirmedAuthenticationFailure: (error: unknown) => boolean;
}): Promise<T> {
  try {
    return await input.request();
  } catch (error) {
    if (!input.isConfirmedAuthenticationFailure(error)) throw error;
  }
  await input.refresh();
  return input.request();
}

export function reconnectRequiredTokenState(): Readonly<{
  state: "RECONNECT_REQUIRED";
  externalCommandsAllowed: false;
  reconnectAction: "REAUTHORIZE_HIGHLEVEL";
}> {
  return Object.freeze({
    state: "RECONNECT_REQUIRED",
    externalCommandsAllowed: false,
    reconnectAction: "REAUTHORIZE_HIGHLEVEL",
  });
}

export async function revokeInstallationAuthorityOnUninstall(input: {
  readonly port: UninstallAuthorityPort;
  readonly locationId: string;
  readonly installationId: string;
  readonly revokedAtEpochSeconds: number;
}): Promise<
  Readonly<{
    installationStatus: "UNINSTALLED";
    tokenState: "UNUSABLE";
    queuedWritesState: "BLOCKED";
    revokedSessionCount: number;
  }>
> {
  assertTenantReference(input.locationId);
  assertTenantReference(input.installationId);
  assertEpoch(input.revokedAtEpochSeconds);
  const result = await input.port.revokeAtomically({
    locationId: input.locationId,
    installationId: input.installationId,
    revokedAtEpochSeconds: input.revokedAtEpochSeconds,
  });
  if (
    result.installationStatus !== "UNINSTALLED" ||
    result.tokenState !== "UNUSABLE" ||
    result.queuedWritesState !== "BLOCKED" ||
    !Number.isSafeInteger(result.revokedSessionCount) ||
    result.revokedSessionCount < 0
  ) {
    return reject();
  }
  return Object.freeze({ ...result });
}
