import { generateKeyPairSync } from "node:crypto";

import { describe, expect, it } from "vitest";
import { ZodError } from "zod";

import {
  CSRF_REQUEST_HEADER,
  FIRST_PARTY_SESSION_COOKIE,
  createSessionBoundCsrfToken,
  issueEmbeddedSessionToken,
  type EstablishedFirstPartySession,
  type FirstPartySessionLookup,
} from "@oalo/auth";

import {
  UnauthenticatedPrincipalError,
  createDefaultCampaignCommandPorts,
  createLocalSyntheticPrincipal,
  createStaticIdentityDirectory,
  createStaticRoleBindingPort,
  resolveAuthenticatedPrincipal,
  type CampaignCommandPorts,
} from "./authenticated-principal.js";
import { LOCAL_SYNTHETIC_ENV, OPEN_HOUSE_DRAFT_INPUT } from "./campaign-command-test-support.js";
import { compileOpenHouseDraft } from "./open-house-draft.js";

const reviewEnv = {
  ...LOCAL_SYNTHETIC_ENV,
  OALO_ENVIRONMENT: "production",
  OALO_REVIEW_SURFACE: "authorized",
};

const stagingEnv = {
  OALO_ENVIRONMENT: "staging",
  OALO_PROVIDER_MODE: "stub",
  OALO_SYNTHETIC_DATA_ONLY: "true",
};

const csrfSecret = Buffer.alloc(32, 9);
const locationId = "00000000-0000-4000-8000-000000000801";
const actorId = "00000000-0000-4000-8000-000000000811";

function issueCreatorToken(privateKeyPem: string): string {
  return issueEmbeddedSessionToken({
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
}

function identityDirectory() {
  return createStaticIdentityDirectory([
    {
      locationRef: "location_alpha",
      locationId,
      actorRef: "user_alpha",
      actorId,
    },
  ]);
}

function mutationGate() {
  return {
    expectedHost: "app.operation-automated-lo.test",
    allowedBrowserOrigins: [
      "https://app.operation-automated-lo.test",
      "https://app.gohighlevel.com",
    ],
    csrfServerSecret: csrfSecret,
  };
}

function request(headers: HeadersInit): Request {
  return new Request("https://app.operation-automated-lo.test/api/campaigns/preflight", {
    method: "POST",
    headers,
  });
}

describe("authenticated principal adapter", () => {
  it("uses an explicit local synthetic principal only in synthetic workspace mode", async () => {
    const principal = await resolveAuthenticatedPrincipal(
      request({}),
      LOCAL_SYNTHETIC_ENV,
      createDefaultCampaignCommandPorts(),
    );
    expect(principal).toMatchObject({
      authenticationMode: "local_synthetic",
      locationRef: "location_localWorkspace001",
      actorRef: "principal_localUser001",
      role: "campaign_creator",
    });
    await expect(
      resolveAuthenticatedPrincipal(request({}), reviewEnv, createDefaultCampaignCommandPorts()),
    ).rejects.toBeInstanceOf(UnauthenticatedPrincipalError);
    await expect(
      compileOpenHouseDraft(OPEN_HOUSE_DRAFT_INPUT, createLocalSyntheticPrincipal(), reviewEnv),
    ).rejects.toBeInstanceOf(UnauthenticatedPrincipalError);
  });

  it("normalizes embedded and first-party sessions to the same principal shape", async () => {
    const { privateKey, publicKey } = generateKeyPairSync("ed25519");
    const privateKeyPem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
    const publicKeyPem = publicKey.export({ type: "spki", format: "pem" }).toString();
    const token = issueCreatorToken(privateKeyPem);
    const sessionSecret = "a".repeat(43);
    const established: EstablishedFirstPartySession = {
      sessionId: "session_alpha",
      userId: "user_alpha",
      locationId: "location_alpha",
      installationId: "installation_alpha",
      role: "campaign_creator",
      roleVersion: 3,
      expiresAtEpochSeconds: Math.floor(Date.now() / 1000) + 3_600,
    };
    const lookup: FirstPartySessionLookup = {
      async getActive(secret) {
        return secret === sessionSecret ? established : undefined;
      },
    };
    const sharedPorts: Omit<CampaignCommandPorts, "embedded" | "firstPartySessions"> = {
      identityDirectory: identityDirectory(),
      roleBindings: createStaticRoleBindingPort([
        {
          actorRef: "user_alpha",
          locationRef: "location_alpha",
          role: "campaign_creator",
          roleVersion: 3,
        },
      ]),
      mutation: mutationGate(),
    };
    const embedded = await resolveAuthenticatedPrincipal(
      request({
        authorization: `Bearer ${token}`,
        origin: "https://app.gohighlevel.com",
        host: "app.operation-automated-lo.test",
      }),
      reviewEnv,
      {
        ...sharedPorts,
        embedded: {
          issuer: "https://auth.operation-automated-lo.test",
          audience: "oalo-web",
          publicKeysById: { key_primary: publicKeyPem },
          nowEpochSeconds: () => 1_001,
          isSessionActive: () => true,
        },
      },
    );
    const csrfToken = createSessionBoundCsrfToken({
      serverSecret: csrfSecret,
      sessionId: "session_alpha",
    });
    const firstParty = await resolveAuthenticatedPrincipal(
      request({
        cookie: `${FIRST_PARTY_SESSION_COOKIE}=${sessionSecret}`,
        origin: "https://app.operation-automated-lo.test",
        host: "app.operation-automated-lo.test",
        [CSRF_REQUEST_HEADER]: csrfToken,
      }),
      reviewEnv,
      {
        ...sharedPorts,
        firstPartySessions: lookup,
      },
    );
    expect(embedded).toMatchObject({
      authenticationMode: "embedded",
      actorRef: "user_alpha",
      actorId,
      locationRef: "location_alpha",
      locationId,
      installationRef: "installation_alpha",
      role: "campaign_creator",
      roleVersion: 3,
      sessionId: "session_alpha",
    });
    expect(firstParty).toMatchObject({
      ...embedded,
      authenticationMode: "first_party",
    });
  });

  it("fails closed for cookie plus bearer, missing lookup, and stale role versions", async () => {
    const { privateKey, publicKey } = generateKeyPairSync("ed25519");
    const privateKeyPem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
    const publicKeyPem = publicKey.export({ type: "spki", format: "pem" }).toString();
    const token = issueCreatorToken(privateKeyPem);
    const sessionSecret = "a".repeat(43);
    await expect(
      resolveAuthenticatedPrincipal(
        request({
          authorization: `Bearer ${token}`,
          cookie: `${FIRST_PARTY_SESSION_COOKIE}=${sessionSecret}`,
        }),
        LOCAL_SYNTHETIC_ENV,
        createDefaultCampaignCommandPorts(),
      ),
    ).rejects.toBeInstanceOf(UnauthenticatedPrincipalError);
    await expect(
      resolveAuthenticatedPrincipal(
        request({ cookie: `${FIRST_PARTY_SESSION_COOKIE}=${sessionSecret}` }),
        LOCAL_SYNTHETIC_ENV,
        createDefaultCampaignCommandPorts(),
      ),
    ).rejects.toBeInstanceOf(UnauthenticatedPrincipalError);
    await expect(
      resolveAuthenticatedPrincipal(
        request({
          authorization: `Bearer ${token}`,
          origin: "https://app.gohighlevel.com",
          host: "app.operation-automated-lo.test",
        }),
        reviewEnv,
        {
          identityDirectory: identityDirectory(),
          roleBindings: createStaticRoleBindingPort([
            {
              actorRef: "user_alpha",
              locationRef: "location_alpha",
              role: "campaign_creator",
              roleVersion: 4,
            },
          ]),
          mutation: mutationGate(),
          embedded: {
            issuer: "https://auth.operation-automated-lo.test",
            audience: "oalo-web",
            publicKeysById: { key_primary: publicKeyPem },
            nowEpochSeconds: () => 1_001,
            isSessionActive: () => true,
          },
        },
      ),
    ).rejects.toThrow();
  });

  it("does not let the draft body override tenant, actor, or role and forbids viewers", async () => {
    const creator = createLocalSyntheticPrincipal();
    const compiled = await compileOpenHouseDraft(
      OPEN_HOUSE_DRAFT_INPUT,
      creator,
      LOCAL_SYNTHETIC_ENV,
    );
    expect(compiled.version.locationRef).toBe(creator.locationRef);
    expect(compiled.version.createdBy).toBe(creator.actorRef);
    await expect(
      compileOpenHouseDraft(
        { ...OPEN_HOUSE_DRAFT_INPUT, locationRef: "location_otherTenant001" },
        creator,
        LOCAL_SYNTHETIC_ENV,
      ),
    ).rejects.toBeInstanceOf(ZodError);
    await expect(
      compileOpenHouseDraft(
        OPEN_HOUSE_DRAFT_INPUT,
        createLocalSyntheticPrincipal({ role: "viewer" }),
        LOCAL_SYNTHETIC_ENV,
      ),
    ).rejects.toMatchObject({ name: "CampaignCommandForbiddenError" });
    await expect(
      resolveAuthenticatedPrincipal(request({}), stagingEnv, createDefaultCampaignCommandPorts()),
    ).rejects.toMatchObject({ name: "AuthenticatedWorkspaceUnavailableError" });
  });
});
