import { describe, expect, it, vi } from "vitest";

import {
  InstallationLifecycleService,
  LocationAuthorizationError,
  assertResourceLocation,
  deriveServerTenantContext,
  evaluateInstallationCapability,
  processInstallationLifecycleDelivery,
} from "../../../../packages/application/src/index.js";
import {
  EMBEDDED_SESSION_ALGORITHM,
  LiveSessionVerificationDisabledError,
  SessionPolicyError,
  createLiveSessionVerifier,
  createSafeTokenDiagnostic,
  type FixtureSessionClaims,
  type FixtureSessionHeader,
  type FixtureSessionPolicy,
  redactTokenPlaintext,
  validateFixtureSessionClaims,
} from "../../../../packages/auth/src/index.js";
import {
  FixtureWriteIdempotencyLedger,
  LiveOAuthDisabledError,
  UnsafeFixtureError,
  classifyFixtureProviderResponse,
  createLiveOAuthAdapter,
  planFixtureRetry,
} from "../../../../packages/ghl/src/index.js";

const session = {
  locationId: "location_alpha",
  installationId: "installation_location_alpha",
  sessionId: "session_alpha",
  role: "location_admin",
  roleVersion: 3,
} as const;

type FixtureInput = Parameters<typeof validateFixtureSessionClaims>[0];

function fixtureClaims(
  overrides: {
    readonly header?: FixtureSessionHeader;
    readonly claims?: Partial<FixtureSessionClaims>;
    readonly policy?: Partial<FixtureSessionPolicy>;
  } = {},
): FixtureInput {
  return {
    verificationState: "fixture-verified" as const,
    header: overrides.header ?? { alg: EMBEDDED_SESSION_ALGORITHM, kid: "fixture-key-1" },
    claims: {
      iss: "https://fixture.highlevel.invalid",
      aud: "oalo-web",
      exp: 1_800,
      nbf: 900,
      sub: "user_alpha",
      sessionId: "session_alpha",
      nonce: "nonce_alpha",
      locationId: "location_alpha",
      installationId: "installation_location_alpha",
      role: "location_admin",
      roleVersion: 3,
      revoked: false,
      ...overrides.claims,
    },
    policy: {
      issuer: "https://fixture.highlevel.invalid",
      audience: "oalo-web",
      allowedKids: ["fixture-key-1"],
      nowEpochSeconds: 1_000,
      currentRoleVersion: 3,
      expectedLocationId: "location_alpha",
      expectedInstallationId: "installation_location_alpha",
      ...overrides.policy,
    },
  };
}

describe("tenant and installation fixture contracts", () => {
  it("derives a non-null tenant solely from the validated session and rejects request overrides", () => {
    const context = deriveServerTenantContext({ validatedSession: session });
    expect(context.locationId).toBe("location_alpha");
    expect(() =>
      deriveServerTenantContext({
        validatedSession: session,
        body: { locationId: "location_beta" },
      }),
    ).toThrow(LocationAuthorizationError);
    expect(() =>
      deriveServerTenantContext({
        validatedSession: session,
        query: { location_id: "location_beta" },
      }),
    ).toThrow(LocationAuthorizationError);
    expect(() => assertResourceLocation(context, "location_beta")).toThrow(
      LocationAuthorizationError,
    );
  });

  it("converges direct and bulk installation idempotently, then stops authority on uninstall", () => {
    const service = new InstallationLifecycleService();
    const direct = service.activate({
      locationId: "location_alpha",
      installationMode: "DIRECT",
      grantedScopes: ["locations.read"],
      scopeProfiles: ["PROFILE_A_READ"],
    });
    const bulk = service.activate({
      locationId: "location_alpha",
      installationMode: "AGENCY_BULK",
      grantedScopes: ["locations.read", "installations.manage", "ads.publish"],
      scopeProfiles: ["PROFILE_A_READ", "PROFILE_B_INSTALL", "PROFILE_C_ADS_PUBLISH"],
    });

    expect(bulk.installationId).toBe(direct.installationId);
    expect(bulk.installationSources).toEqual(["AGENCY_BULK", "DIRECT"]);
    expect(evaluateInstallationCapability(bulk, "ADS_PUBLISH")).toBe(true);
    expect(
      evaluateInstallationCapability(
        { ...bulk, scopeProfiles: ["PROFILE_A_READ"], grantedScopes: ["locations.read"] },
        "ADS_PUBLISH",
      ),
    ).toBe(false);
    expect(
      evaluateInstallationCapability({ ...bulk, grantedScopes: ["locations.read"] }, "ADS_PUBLISH"),
    ).toBe(false);

    service.uninstall("location_alpha");
    expect(() =>
      service.assertMayStartWork(deriveServerTenantContext({ validatedSession: session })),
    ).toThrow(LocationAuthorizationError);
  });

  it("keeps lifecycle state idempotent and denies missing, invalid, or mismatched tenant authority", () => {
    const service = new InstallationLifecycleService();
    const initial = service.activate({
      locationId: "location_alpha",
      installationMode: "DIRECT",
      grantedScopes: ["locations.read"],
      scopeProfiles: ["PROFILE_A_READ"],
    });
    const context = deriveServerTenantContext({ validatedSession: session });

    expect(service.get("location_alpha")).toEqual(initial);
    expect(service.assertMayStartWork(context)).toEqual(initial);
    expect(
      deriveServerTenantContext({ validatedSession: session, body: {}, query: {} }),
    ).toMatchObject({ locationId: "location_alpha" });
    expect(() => assertResourceLocation(context, "location_alpha")).not.toThrow();
    expect(() => service.uninstall("location_missing")).toThrow(LocationAuthorizationError);
    expect(() =>
      deriveServerTenantContext({
        validatedSession: { ...session, locationId: "" },
      }),
    ).toThrow(LocationAuthorizationError);
    expect(() =>
      deriveServerTenantContext({
        validatedSession: { ...session, installationId: "" },
      }),
    ).toThrow(LocationAuthorizationError);
    expect(() =>
      service.assertMayStartWork({ ...context, installationId: "installation_other" }),
    ).toThrow(LocationAuthorizationError);

    const uninstalled = service.uninstall("location_alpha");
    expect(service.uninstall("location_alpha")).toEqual(uninstalled);
    expect(evaluateInstallationCapability(uninstalled, "LOCATION_READ")).toBe(false);
    const reinstalled = service.activate({
      locationId: "location_alpha",
      installationMode: "DIRECT",
      grantedScopes: ["locations.read"],
      scopeProfiles: ["PROFILE_A_READ"],
    });
    expect(reinstalled.lifecycleVersion).toBe(3);
    expect(() => new InstallationLifecycleService().assertMayStartWork(context)).toThrow(
      LocationAuthorizationError,
    );
  });

  it("schedules retention-policy deletion once when an installation is removed", async () => {
    const service = new InstallationLifecycleService();
    service.activate({
      locationId: "location_alpha",
      installationMode: "DIRECT",
      grantedScopes: ["locations.read"],
      scopeProfiles: ["PROFILE_A_READ"],
    });
    const schedule = vi.fn(async () => undefined);
    const policy = { policyVersion: "retention-v1", retentionDays: 30 };
    const first = await service.uninstallAndScheduleDeletion(
      "location_alpha",
      policy,
      new Date("2026-07-21T20:00:00.000Z"),
      { schedule },
    );
    const duplicate = await service.uninstallAndScheduleDeletion(
      "location_alpha",
      policy,
      new Date("2026-07-22T20:00:00.000Z"),
      { schedule },
    );
    expect(first.schedule).toEqual({
      locationId: "location_alpha",
      installationId: "installation_location_alpha",
      policyVersion: "retention-v1",
      deleteAt: "2026-08-20T20:00:00.000Z",
      reason: "tenant-uninstalled",
    });
    expect(duplicate.schedule).toEqual(first.schedule);
    expect(schedule).toHaveBeenCalledOnce();
    for (const invalid of [
      { policyVersion: "retention-v1", retentionDays: -1 },
      { policyVersion: "retention-v1", retentionDays: 3_651 },
      { policyVersion: "retention-v1", retentionDays: 1.5 },
      { policyVersion: " ", retentionDays: 30 },
    ]) {
      await expect(
        service.uninstallAndScheduleDeletion("location_alpha", invalid, new Date(), { schedule }),
      ).rejects.toThrow(LocationAuthorizationError);
    }
  });

  it("acknowledges duplicate lifecycle webhook deliveries without applying them twice", async () => {
    let claimed = false;
    const guard = {
      claim: vi.fn(async () => {
        if (claimed) return false;
        claimed = true;
        return true;
      }),
      complete: vi.fn(async () => undefined),
      release: vi.fn(async () => undefined),
    };
    const apply = vi.fn(async () => "installed" as const);
    const delivery = {
      schemaVersion: 1,
      deliveryKind: "webhook",
      deliveryRef: "webhook_01Install",
      businessOutcomeKey: "a".repeat(64),
      locationRef: "location_01Alpha",
      correlationId: "correlation_01Install",
    };
    await expect(processInstallationLifecycleDelivery(delivery, guard, apply)).resolves.toEqual({
      kind: "processed",
      value: "installed",
    });
    await expect(processInstallationLifecycleDelivery(delivery, guard, apply)).resolves.toEqual({
      kind: "duplicate",
    });
    expect(apply).toHaveBeenCalledOnce();
    expect(guard.complete).toHaveBeenCalledOnce();

    const invalidGuard = {
      claim: vi.fn(async () => true),
      complete: vi.fn(async () => undefined),
      release: vi.fn(async () => undefined),
    };
    await expect(
      processInstallationLifecycleDelivery(
        { ...delivery, deliveryKind: "command", deliveryRef: "command_01Install" },
        invalidGuard,
        apply,
      ),
    ).rejects.toThrow(LocationAuthorizationError);
    expect(invalidGuard.release).toHaveBeenCalledOnce();
  });

  it("fails session claims closed for every pinned identity and lifecycle check", () => {
    expect(validateFixtureSessionClaims(fixtureClaims())).toMatchObject({
      locationId: "location_alpha",
    });

    const rejected = [
      fixtureClaims({ header: { alg: "HS256", kid: "fixture-key-1" } }),
      fixtureClaims({ header: { alg: EMBEDDED_SESSION_ALGORITHM, kid: "unknown-key" } }),
      fixtureClaims({ claims: { iss: "https://attacker.invalid" } }),
      fixtureClaims({ claims: { aud: "other-audience" } }),
      fixtureClaims({ claims: { exp: 900 } }),
      fixtureClaims({ claims: { nbf: 1_001 } }),
      fixtureClaims({ claims: { roleVersion: 2 } }),
      fixtureClaims({ claims: { revoked: true } }),
      fixtureClaims({ claims: { installationId: "installation_location_beta" } }),
      fixtureClaims({ policy: { resourceLocationId: "location_beta" } }),
    ];

    for (const candidate of rejected) {
      expect(() => validateFixtureSessionClaims(candidate)).toThrow(SessionPolicyError);
    }
  });

  it("redacts token plaintext and keeps live authentication operations disabled", async () => {
    const secret = "never-log-this-token";
    expect(redactTokenPlaintext(secret)).toBe("[REDACTED]");
    expect(
      JSON.stringify(
        createSafeTokenDiagnostic({
          installationId: "installation_alpha",
          state: "HEALTHY",
          tokenPresent: true,
        }),
      ),
    ).not.toContain(secret);
    await expect(createLiveSessionVerifier().verify()).rejects.toThrow(
      LiveSessionVerificationDisabledError,
    );
    const liveOAuth = createLiveOAuthAdapter();
    await expect(liveOAuth.bootstrapSignedContext()).rejects.toThrow(LiveOAuthDisabledError);
    await expect(liveOAuth.exchangeAuthorizationCode()).rejects.toThrow(LiveOAuthDisabledError);
    await expect(liveOAuth.refreshLocationToken()).rejects.toThrow(LiveOAuthDisabledError);
  });

  it("models fixture-only provider resilience, per-location serialization, and idempotent writes", () => {
    const rateLimited = classifyFixtureProviderResponse({
      locationId: "location_alpha",
      request: { transport: "fixture-replay", method: "GET", path: "/opportunities" },
      httpStatus: 429,
      rateLimitHeaders: { "retry-after": "4", "x-ratelimit-remaining": "0" },
    });
    expect(rateLimited).toMatchObject({
      concurrencyKey: "ghl:location_alpha",
      maxConcurrentRequests: 1,
      classification: "RATE_LIMITED",
      retryAfterMilliseconds: 4_000,
      returnedRateLimitHeaders: { "retry-after": "4", "x-ratelimit-remaining": "0" },
    });
    expect(
      planFixtureRetry({
        decision: rateLimited,
        attempt: 3,
        baseDelayMilliseconds: 1_000,
        maximumDelayMilliseconds: 30_000,
        jitterUnit: 0,
      }),
    ).toEqual({
      retry: true,
      attempt: 3,
      delayMilliseconds: 4_000,
      reason: "rate-limit",
    });
    const transient = classifyFixtureProviderResponse({
      locationId: "location_alpha",
      request: { transport: "fixture-replay", method: "GET", path: "/opportunities" },
      httpStatus: 503,
    });
    expect(
      planFixtureRetry({
        decision: transient,
        attempt: 2,
        baseDelayMilliseconds: 1_000,
        maximumDelayMilliseconds: 30_000,
        jitterUnit: 1,
      }),
    ).toEqual({
      retry: true,
      attempt: 2,
      delayMilliseconds: 2_000,
      reason: "transient-provider",
    });
    const uncertain = classifyFixtureProviderResponse({
      locationId: "location_alpha",
      request: { transport: "fixture-replay", method: "POST", path: "/opportunities" },
      httpStatus: 503,
      writeMayHaveReachedProvider: true,
    });
    expect(
      planFixtureRetry({
        decision: uncertain,
        attempt: 1,
        baseDelayMilliseconds: 1_000,
        maximumDelayMilliseconds: 30_000,
        jitterUnit: 0.5,
      }),
    ).toEqual({
      retry: false,
      attempt: 1,
      delayMilliseconds: undefined,
      reason: "terminal-or-reconcile",
    });
    for (const invalid of [
      { attempt: 0 },
      { attempt: 13 },
      { attempt: 1.5 },
      { baseDelayMilliseconds: 99 },
      { maximumDelayMilliseconds: 500 },
      { jitterUnit: -0.1 },
      { jitterUnit: 1.1 },
      { jitterUnit: Number.NaN },
    ]) {
      expect(() =>
        planFixtureRetry({
          decision: transient,
          attempt: 1,
          baseDelayMilliseconds: 1_000,
          maximumDelayMilliseconds: 30_000,
          jitterUnit: 0.5,
          ...invalid,
        }),
      ).toThrow(RangeError);
    }

    const ledger = new FixtureWriteIdempotencyLedger();
    const request = {
      transport: "fixture-replay",
      method: "POST",
      path: "/synthetic-write",
    } as const;
    expect(
      ledger.accept({
        locationId: "location_alpha",
        idempotencyKey: "idem_alpha",
        request,
        body: { fixture: 1 },
      }).duplicate,
    ).toBe(false);
    expect(
      ledger.accept({
        locationId: "location_alpha",
        idempotencyKey: "idem_alpha",
        request,
        body: { fixture: 1 },
      }).duplicate,
    ).toBe(true);
    expect(() =>
      ledger.accept({
        locationId: "location_alpha",
        idempotencyKey: "idem_alpha",
        request,
        body: { fixture: 2 },
      }),
    ).toThrow(UnsafeFixtureError);
    expect(() =>
      classifyFixtureProviderResponse({
        locationId: "location_alpha",
        request: { transport: "live", method: "GET", path: "/locations" },
        httpStatus: 200,
      }),
    ).toThrow(UnsafeFixtureError);
  });
});
