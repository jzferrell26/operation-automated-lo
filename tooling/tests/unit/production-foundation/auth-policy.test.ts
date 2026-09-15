import { generateKeyPairSync } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

import {
  BrowserSessionPolicyError,
  FIRST_PARTY_SESSION_COOKIE,
  LocationRefreshCoordinator,
  OAuthStateError,
  SessionPolicyError,
  TokenLifecyclePolicyError,
  assertBrowserMutationRequest,
  authSurfaceSecurityHeaders,
  authenticateInboundEmbeddedSession,
  authenticateInboundFirstPartySession,
  consumeFirstPartyHandoff,
  consumeOAuthState,
  createSessionBoundCsrfToken,
  executeWithOneAuthenticationRetry,
  issueEmbeddedSessionToken,
  issueFirstPartyHandoff,
  issueOAuthState,
  reconnectRequiredTokenState,
  replaceTokenEnvelopeAtomically,
  revokeInstallationAuthorityOnUninstall,
  serializeFirstPartySessionCookie,
  serializePartitionedSessionCookie,
  shouldRefreshToken,
  verifyEmbeddedSessionToken,
  type EstablishedFirstPartySession,
  type FirstPartyHandoffRecord,
  type FirstPartyHandoffStore,
  type FirstPartySessionLookup,
  type OAuthStateRecord,
  type OAuthStateStore,
} from "../../../../packages/auth/src/index.js";

class MemoryOAuthStateStore implements OAuthStateStore {
  readonly records = new Map<string, OAuthStateRecord>();

  public async create(record: OAuthStateRecord): Promise<void> {
    if (this.records.has(record.nonceHash)) throw new Error("duplicate state");
    this.records.set(record.nonceHash, record);
  }

  public async consume(nonceHash: string, nowEpochSeconds: number): Promise<boolean> {
    const record = this.records.get(nonceHash);
    if (record === undefined || record.expiresAtEpochSeconds <= nowEpochSeconds) return false;
    this.records.delete(nonceHash);
    return true;
  }
}

class MemoryHandoffStore implements FirstPartyHandoffStore {
  readonly records = new Map<string, FirstPartyHandoffRecord>();

  public async create(record: FirstPartyHandoffRecord): Promise<void> {
    if (this.records.has(record.codeHash)) throw new Error("duplicate handoff");
    this.records.set(record.codeHash, record);
  }

  public async consume(
    codeHash: string,
    nowEpochSeconds: number,
  ): Promise<FirstPartyHandoffRecord | undefined> {
    const record = this.records.get(codeHash);
    if (record === undefined || record.expiresAtEpochSeconds <= nowEpochSeconds) return undefined;
    this.records.delete(codeHash);
    return record;
  }
}

const signingSecret = Buffer.alloc(32, 7);
const csrfSecret = Buffer.alloc(32, 9);

describe("production auth policies", () => {
  it("issues and cryptographically verifies only five-minute Ed25519 embedded sessions", () => {
    const { privateKey, publicKey } = generateKeyPairSync("ed25519");
    const privateKeyPem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
    const publicKeyPem = publicKey.export({ type: "spki", format: "pem" }).toString();
    const base = {
      privateKeyPem,
      keyId: "key_primary",
      issuer: "https://auth.operation-automated-lo.test",
      audience: "oalo-web",
      subject: "user_alpha",
      sessionId: "session_alpha",
      nonce: "nonce_alpha",
      locationId: "location_alpha",
      installationId: "installation_alpha",
      role: "location_admin" as const,
      roleVersion: 3,
      nowEpochSeconds: 1_000,
    };
    const policy = {
      issuer: base.issuer,
      audience: base.audience,
      publicKeysById: { key_primary: publicKeyPem },
      nowEpochSeconds: 1_001,
      expectedSubject: base.subject,
      expectedSessionId: base.sessionId,
      expectedNonce: base.nonce,
      expectedRole: base.role,
      currentRoleVersion: 3,
      expectedLocationId: base.locationId,
      expectedInstallationId: base.installationId,
      resourceLocationId: base.locationId,
      isSessionActive: () => true,
    };
    const token = issueEmbeddedSessionToken(base);
    expect(verifyEmbeddedSessionToken({ token, policy })).toMatchObject({
      exp: 1_300,
      locationId: "location_alpha",
      installationId: "installation_alpha",
      role: "location_admin",
    });

    const [header, claims, signature] = token.split(".");
    const algorithmConfusionHeader = Buffer.from(
      JSON.stringify({ alg: "HS256", kid: "key_primary", typ: "JWT" }),
    ).toString("base64url");
    const differentSignature = `${signature?.startsWith("A") === true ? "B" : "A"}${signature?.slice(1)}`;
    const rejected = [
      `${algorithmConfusionHeader}.${claims}.${signature}`,
      `${header}.${claims}.${differentSignature}`,
      issueEmbeddedSessionToken({ ...base, keyId: "key_unknown" }),
      issueEmbeddedSessionToken({ ...base, issuer: "https://attacker.invalid" }),
      issueEmbeddedSessionToken({ ...base, audience: "wrong-audience" }),
      issueEmbeddedSessionToken({ ...base, subject: "user_beta" }),
      issueEmbeddedSessionToken({ ...base, nonce: "nonce_beta" }),
      issueEmbeddedSessionToken({ ...base, locationId: "location_beta" }),
      issueEmbeddedSessionToken({ ...base, installationId: "installation_beta" }),
    ];
    for (const candidate of rejected) {
      expect(() => verifyEmbeddedSessionToken({ token: candidate, policy })).toThrow(
        SessionPolicyError,
      );
    }
    expect(() =>
      verifyEmbeddedSessionToken({
        token,
        policy: { ...policy, currentRoleVersion: 4 },
      }),
    ).toThrow(SessionPolicyError);
    expect(() =>
      verifyEmbeddedSessionToken({
        token,
        policy: { ...policy, nowEpochSeconds: 1_300 },
      }),
    ).toThrow(SessionPolicyError);
    expect(() =>
      verifyEmbeddedSessionToken({
        token,
        policy: { ...policy, isSessionActive: () => false },
      }),
    ).toThrow(SessionPolicyError);
  });

  it("binds OAuth state to one install, tenant, exact HTTPS callback, expiry, and single use", async () => {
    const store = new MemoryOAuthStateStore();
    const redirectUri = "https://app.operation-automated-lo.test/api/v1/oauth/ghl/callback";
    const state = await issueOAuthState({
      signingSecret,
      store,
      installationId: "installation_alpha",
      locationId: "location_alpha",
      redirectUri,
      nowEpochSeconds: 1_000,
    });
    expect(store.records.size).toBe(1);
    expect(JSON.stringify([...store.records.values()])).not.toContain(state);
    await expect(
      consumeOAuthState({
        state,
        signingSecret,
        store,
        expectedInstallationId: "installation_alpha",
        expectedLocationId: "location_alpha",
        exactRedirectUri: redirectUri,
        nowEpochSeconds: 1_001,
      }),
    ).resolves.toMatchObject({ locationId: "location_alpha", exp: 1_300 });
    await expect(
      consumeOAuthState({
        state,
        signingSecret,
        store,
        expectedInstallationId: "installation_alpha",
        expectedLocationId: "location_alpha",
        exactRedirectUri: redirectUri,
        nowEpochSeconds: 1_002,
      }),
    ).rejects.toThrow(OAuthStateError);

    const mismatchStore = new MemoryOAuthStateStore();
    const mismatch = await issueOAuthState({
      signingSecret,
      store: mismatchStore,
      installationId: "installation_alpha",
      locationId: "location_alpha",
      redirectUri,
      nowEpochSeconds: 1_000,
    });
    await expect(
      consumeOAuthState({
        state: mismatch,
        signingSecret,
        store: mismatchStore,
        expectedInstallationId: "installation_beta",
        expectedLocationId: "location_alpha",
        exactRedirectUri: redirectUri,
        nowEpochSeconds: 1_001,
      }),
    ).rejects.toThrow(OAuthStateError);
    await expect(
      issueOAuthState({
        signingSecret,
        store: new MemoryOAuthStateStore(),
        installationId: "installation_alpha",
        locationId: "location_alpha",
        redirectUri: "http://app.operation-automated-lo.test/callback",
        nowEpochSeconds: 1_000,
      }),
    ).rejects.toThrow(OAuthStateError);

    const expiredStore = new MemoryOAuthStateStore();
    const expired = await issueOAuthState({
      signingSecret,
      store: expiredStore,
      installationId: "installation_alpha",
      locationId: "location_alpha",
      redirectUri,
      nowEpochSeconds: 1_000,
    });
    await expect(
      consumeOAuthState({
        state: expired,
        signingSecret,
        store: expiredStore,
        expectedInstallationId: "installation_alpha",
        expectedLocationId: "location_alpha",
        exactRedirectUri: redirectUri,
        nowEpochSeconds: 1_300,
      }),
    ).rejects.toThrow(OAuthStateError);

    const tamperedStore = new MemoryOAuthStateStore();
    const tampered = await issueOAuthState({
      signingSecret,
      store: tamperedStore,
      installationId: "installation_alpha",
      locationId: "location_alpha",
      redirectUri,
      nowEpochSeconds: 1_000,
    });
    const [payload, stateSignature] = tampered.split(".");
    await expect(
      consumeOAuthState({
        state: `${payload}.${stateSignature?.startsWith("A") === true ? "B" : "A"}${stateSignature?.slice(1)}`,
        signingSecret,
        store: tamperedStore,
        expectedInstallationId: "installation_alpha",
        expectedLocationId: "location_alpha",
        exactRedirectUri: redirectUri,
        nowEpochSeconds: 1_001,
      }),
    ).rejects.toThrow(OAuthStateError);
  });

  it("uses a one-time fragment handoff and hardened host-only cookies", async () => {
    const store = new MemoryHandoffStore();
    const handoff = await issueFirstPartyHandoff({
      store,
      firstPartyOrigin: "https://app.operation-automated-lo.test",
      handoffPath: "/auth/handoff",
      sessionId: "session_alpha",
      userId: "user_alpha",
      locationId: "location_alpha",
      installationId: "installation_alpha",
      roleVersion: 3,
      nowEpochSeconds: 1_000,
    });
    const handoffUrl = new URL(handoff.fragmentUrl);
    expect(handoffUrl.search).toBe("");
    expect(handoffUrl.hash).toBe(`#handoff=${handoff.code}`);
    expect(JSON.stringify([...store.records.values()])).not.toContain(handoff.code);
    await expect(
      consumeFirstPartyHandoff({ store, code: handoff.code, nowEpochSeconds: 1_001 }),
    ).resolves.toMatchObject({
      sessionId: "session_alpha",
      locationId: "location_alpha",
      installationId: "installation_alpha",
    });
    await expect(
      consumeFirstPartyHandoff({ store, code: handoff.code, nowEpochSeconds: 1_002 }),
    ).rejects.toThrow(BrowserSessionPolicyError);

    const sessionSecret = "a".repeat(43);
    expect(serializeFirstPartySessionCookie({ sessionSecret, maxAgeSeconds: 3_600 })).toBe(
      `${FIRST_PARTY_SESSION_COOKIE}=${sessionSecret}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=3600`,
    );
    expect(serializePartitionedSessionCookie({ sessionSecret, maxAgeSeconds: 300 })).toContain(
      "SameSite=None; Partitioned",
    );
  });

  it("fails cookie and bearer mutations closed on CSRF, null origin, host, and origin mismatch", () => {
    const allowedBrowserOrigins = [
      "https://app.operation-automated-lo.test",
      "https://app.gohighlevel.com",
    ];
    const csrfToken = createSessionBoundCsrfToken({
      serverSecret: csrfSecret,
      sessionId: "session_alpha",
    });
    const cookieRequest = {
      authenticationMode: "cookie" as const,
      origin: allowedBrowserOrigins[0] ?? null,
      host: "app.operation-automated-lo.test",
      expectedHost: "app.operation-automated-lo.test",
      allowedBrowserOrigins,
      sessionId: "session_alpha",
      csrfServerSecret: csrfSecret,
      csrfToken,
    };
    expect(() => assertBrowserMutationRequest(cookieRequest)).not.toThrow();
    expect(() =>
      assertBrowserMutationRequest({ ...cookieRequest, origin: allowedBrowserOrigins[1] ?? null }),
    ).toThrow(BrowserSessionPolicyError);
    expect(() =>
      assertBrowserMutationRequest({ ...cookieRequest, csrfToken: "b".repeat(43) }),
    ).toThrow(BrowserSessionPolicyError);
    expect(() => assertBrowserMutationRequest({ ...cookieRequest, origin: null })).toThrow(
      BrowserSessionPolicyError,
    );
    expect(() =>
      assertBrowserMutationRequest({ ...cookieRequest, origin: "https://attacker.invalid" }),
    ).toThrow(BrowserSessionPolicyError);
    expect(() =>
      assertBrowserMutationRequest({ ...cookieRequest, host: "attacker.invalid" }),
    ).toThrow(BrowserSessionPolicyError);
    expect(() =>
      assertBrowserMutationRequest({ ...cookieRequest, allowedBrowserOrigins: ["*"] }),
    ).toThrow(BrowserSessionPolicyError);

    const bearerRequest = {
      authenticationMode: "embedded-bearer" as const,
      origin: "https://app.gohighlevel.com",
      host: cookieRequest.host,
      expectedHost: cookieRequest.expectedHost,
      allowedBrowserOrigins,
      sessionId: cookieRequest.sessionId,
      csrfServerSecret: csrfSecret,
    };
    expect(() => assertBrowserMutationRequest(bearerRequest)).not.toThrow();
    expect(() =>
      assertBrowserMutationRequest({
        ...bearerRequest,
        origin: null,
      }),
    ).toThrow(BrowserSessionPolicyError);

    const embeddedHeaders = authSurfaceSecurityHeaders({
      surface: "embedded",
      embeddedFrameAncestors: ["https://app.gohighlevel.com"],
    });
    expect(embeddedHeaders["Content-Security-Policy"]).toContain(
      "frame-ancestors 'self' https://app.gohighlevel.com",
    );
    expect(embeddedHeaders["X-Frame-Options"]).toBeUndefined();
    const handoffHeaders = authSurfaceSecurityHeaders({ surface: "handoff" });
    expect(handoffHeaders).toMatchObject({
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
      "X-Frame-Options": "DENY",
    });
  });

  it("serializes refresh by location, rotates encrypted metadata atomically, and retries once", async () => {
    expect(
      shouldRefreshToken({
        accessExpiresAtEpochSeconds: 1_300,
        nowEpochSeconds: 1_241,
        refreshLeadSeconds: 60,
      }),
    ).toBe(true);
    expect(
      shouldRefreshToken({
        accessExpiresAtEpochSeconds: 1_300,
        nowEpochSeconds: 1_200,
        refreshLeadSeconds: 60,
      }),
    ).toBe(false);

    const coordinator = new LocationRefreshCoordinator();
    let active = 0;
    let maximumActive = 0;
    const run = async (): Promise<void> => {
      await coordinator.run("location_alpha", async () => {
        active += 1;
        maximumActive = Math.max(maximumActive, active);
        await Promise.resolve();
        active -= 1;
      });
    };
    await Promise.all([run(), run(), run()]);
    expect(maximumActive).toBe(1);

    const replaceAtomically = vi.fn(async () => true);
    await expect(
      replaceTokenEnvelopeAtomically({
        port: { replaceAtomically },
        locationId: "location_alpha",
        installationId: "installation_alpha",
        expectedEnvelopeVersion: 4,
        next: {
          envelopeVersion: 5,
          encryptedEnvelopeRef: "envelope_version_005",
          accessExpiresAtEpochSeconds: 2_000,
          refreshExpiresAtEpochSeconds: 3_000,
          grantedScopes: ["locations.read"],
        },
      }),
    ).resolves.toMatchObject({ envelopeVersion: 5 });
    expect(replaceAtomically).toHaveBeenCalledOnce();

    const authFailure = new Error("confirmed auth failure");
    const request = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(authFailure)
      .mockResolvedValueOnce("ok");
    const refresh = vi.fn(async () => undefined);
    await expect(
      executeWithOneAuthenticationRetry({
        request,
        refresh,
        isConfirmedAuthenticationFailure: (error) => error === authFailure,
      }),
    ).resolves.toBe("ok");
    expect(request).toHaveBeenCalledTimes(2);
    expect(refresh).toHaveBeenCalledOnce();
    expect(reconnectRequiredTokenState()).toEqual({
      state: "RECONNECT_REQUIRED",
      externalCommandsAllowed: false,
      reconnectAction: "REAUTHORIZE_HIGHLEVEL",
    });
  });

  it("requires uninstall revocation to atomically disable tokens, sessions, and queued writes", async () => {
    const revokeAtomically = vi.fn(async () => ({
      installationStatus: "UNINSTALLED" as const,
      tokenState: "UNUSABLE" as const,
      queuedWritesState: "BLOCKED" as const,
      revokedSessionCount: 2,
    }));
    await expect(
      revokeInstallationAuthorityOnUninstall({
        port: { revokeAtomically },
        locationId: "location_alpha",
        installationId: "installation_alpha",
        revokedAtEpochSeconds: 1_000,
      }),
    ).resolves.toEqual({
      installationStatus: "UNINSTALLED",
      tokenState: "UNUSABLE",
      queuedWritesState: "BLOCKED",
      revokedSessionCount: 2,
    });

    await expect(
      revokeInstallationAuthorityOnUninstall({
        port: {
          revokeAtomically: async () => ({
            installationStatus: "UNINSTALLED",
            tokenState: "UNUSABLE",
            queuedWritesState: "ALLOWED" as never,
            revokedSessionCount: 0,
          }),
        },
        locationId: "location_alpha",
        installationId: "installation_alpha",
        revokedAtEpochSeconds: 1_000,
      }),
    ).rejects.toThrow(TokenLifecyclePolicyError);
  });
});

describe("inbound session authentication", () => {
  it("authenticates embedded tokens without an expected subject and fails closed on stale role versions", async () => {
    const { privateKey, publicKey } = generateKeyPairSync("ed25519");
    const privateKeyPem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
    const publicKeyPem = publicKey.export({ type: "spki", format: "pem" }).toString();
    const token = issueEmbeddedSessionToken({
      privateKeyPem,
      keyId: "key_primary",
      issuer: "https://auth.operation-automated-lo.test",
      audience: "oalo-web",
      subject: "user_alpha",
      sessionId: "session_alpha",
      nonce: "nonce_alpha",
      locationId: "location_alpha",
      installationId: "installation_alpha",
      role: "campaign_creator",
      roleVersion: 3,
      nowEpochSeconds: 1_000,
    });
    const policy = {
      issuer: "https://auth.operation-automated-lo.test",
      audience: "oalo-web",
      publicKeysById: { key_primary: publicKeyPem },
      nowEpochSeconds: 1_001,
      isSessionActive: () => true,
      currentRoleVersion: () => 3,
    };
    await expect(authenticateInboundEmbeddedSession({ token, policy })).resolves.toMatchObject({
      sub: "user_alpha",
      locationId: "location_alpha",
      role: "campaign_creator",
      roleVersion: 3,
    });
    await expect(
      authenticateInboundEmbeddedSession({
        token,
        policy: { ...policy, currentRoleVersion: () => 4 },
      }),
    ).rejects.toThrow(SessionPolicyError);
    await expect(
      authenticateInboundEmbeddedSession({
        token,
        policy: { ...policy, isSessionActive: () => false },
      }),
    ).rejects.toThrow(SessionPolicyError);
    await expect(
      authenticateInboundEmbeddedSession({
        token,
        policy: { ...policy, nowEpochSeconds: 1_300 },
      }),
    ).rejects.toThrow(SessionPolicyError);
    await expect(
      authenticateInboundEmbeddedSession({
        token,
        policy: { ...policy, currentRoleVersion: () => 3.5 },
      }),
    ).rejects.toThrow(SessionPolicyError);
  });

  it("authenticates established first-party sessions and rejects expired or stale bindings", async () => {
    const sessionSecret = "a".repeat(43);
    const record: EstablishedFirstPartySession = {
      sessionId: "session_alpha",
      userId: "user_alpha",
      locationId: "location_alpha",
      installationId: "installation_alpha",
      role: "location_admin",
      roleVersion: 3,
      expiresAtEpochSeconds: 2_000,
    };
    const lookup: FirstPartySessionLookup = {
      async getActive(secret, nowEpochSeconds) {
        if (secret !== sessionSecret || record.expiresAtEpochSeconds <= nowEpochSeconds) {
          return undefined;
        }
        return record;
      },
    };
    await expect(
      authenticateInboundFirstPartySession({
        sessionSecret,
        lookup,
        nowEpochSeconds: 1_001,
        currentRoleVersion: () => 3,
      }),
    ).resolves.toMatchObject({
      userId: "user_alpha",
      locationId: "location_alpha",
      role: "location_admin",
    });
    await expect(
      authenticateInboundFirstPartySession({
        sessionSecret,
        lookup,
        nowEpochSeconds: 2_000,
        currentRoleVersion: () => 3,
      }),
    ).rejects.toThrow(BrowserSessionPolicyError);
    await expect(
      authenticateInboundFirstPartySession({
        sessionSecret,
        lookup,
        nowEpochSeconds: 1_001,
        currentRoleVersion: () => 4,
      }),
    ).rejects.toThrow(BrowserSessionPolicyError);
    await expect(
      authenticateInboundFirstPartySession({
        sessionSecret: "b".repeat(43),
        lookup,
        nowEpochSeconds: 1_001,
        currentRoleVersion: () => 3,
      }),
    ).rejects.toThrow(BrowserSessionPolicyError);
    await expect(
      authenticateInboundFirstPartySession({
        sessionSecret: "short",
        lookup,
        nowEpochSeconds: 1_001,
        currentRoleVersion: () => 3,
      }),
    ).rejects.toThrow(BrowserSessionPolicyError);
    const invalidLookup: FirstPartySessionLookup = {
      async getActive() {
        return { ...record, role: "owner" as EstablishedFirstPartySession["role"] };
      },
    };
    await expect(
      authenticateInboundFirstPartySession({
        sessionSecret,
        lookup: invalidLookup,
        nowEpochSeconds: 1_001,
        currentRoleVersion: () => 3,
      }),
    ).rejects.toThrow(BrowserSessionPolicyError);
  });
});
