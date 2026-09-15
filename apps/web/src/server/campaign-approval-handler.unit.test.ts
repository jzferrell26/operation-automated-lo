import { generateKeyPairSync } from "node:crypto";

import { afterEach, describe, expect, it } from "vitest";
import { issueEmbeddedSessionToken } from "@oalo/auth";

import {
  createDefaultCampaignCommandPorts,
  createStaticIdentityDirectory,
  createStaticRoleBindingPort,
  type CampaignCommandPorts,
} from "./authenticated-principal.js";
import { handleCampaignApproval } from "./campaign-approval-handler.js";
import {
  LOCAL_SYNTHETIC_ENV,
  OPEN_HOUSE_DRAFT_INPUT,
  createTemporaryCampaignStore,
  persistedDraftFromPreflightBody,
} from "./campaign-command-test-support.js";
import { handleCampaignPreflight } from "./campaign-preflight-handler.js";

const store = createTemporaryCampaignStore("oalo-approval-");
const csrfSecret = Buffer.alloc(32, 9);
const LOCATION_REF = "location_approvaltenant001";
const CREATOR_REF = "principal_approvalcreator001";
const APPROVER_REF = "principal_approvalapprover001";
const INSTALLATION_REF = "installation_approval001";

afterEach(async () => {
  await store.restore();
});

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

function sessionFixture() {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const privateKeyPem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
  const publicKeyPem = publicKey.export({ type: "spki", format: "pem" }).toString();
  const ports = embeddedPorts(publicKeyPem);
  return {
    ports,
    creatorHeaders: embeddedHeaders(
      issueToken(privateKeyPem, {
        subject: CREATOR_REF,
        sessionId: "session_approvalcreator001",
        role: "campaign_creator",
      }),
    ),
    approverHeaders: embeddedHeaders(
      issueToken(privateKeyPem, {
        subject: APPROVER_REF,
        sessionId: "session_approvalapprover001",
        role: "campaign_approver",
      }),
    ),
  };
}

function embeddedPorts(publicKeyPem: string): CampaignCommandPorts {
  return {
    identityDirectory: createStaticIdentityDirectory([
      {
        locationRef: LOCATION_REF,
        locationId: "00000000-0000-4000-8000-000000000821",
        actorRef: CREATOR_REF,
        actorId: "00000000-0000-4000-8000-000000000822",
      },
      {
        locationRef: LOCATION_REF,
        locationId: "00000000-0000-4000-8000-000000000821",
        actorRef: APPROVER_REF,
        actorId: "00000000-0000-4000-8000-000000000823",
      },
    ]),
    roleBindings: createStaticRoleBindingPort([
      {
        actorRef: CREATOR_REF,
        locationRef: LOCATION_REF,
        role: "campaign_creator",
        roleVersion: 1,
      },
      {
        actorRef: APPROVER_REF,
        locationRef: LOCATION_REF,
        role: "campaign_approver",
        roleVersion: 1,
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
  };
}

function issueToken(
  privateKeyPem: string,
  input: { subject: string; sessionId: string; role: "campaign_creator" | "campaign_approver" },
): string {
  return issueEmbeddedSessionToken({
    privateKeyPem,
    keyId: "key_primary",
    issuer: "https://auth.operation-automated-lo.test",
    audience: "oalo-web",
    subject: input.subject,
    sessionId: input.sessionId,
    nonce: `${input.sessionId}-nonce`,
    locationId: LOCATION_REF,
    installationId: INSTALLATION_REF,
    role: input.role,
    roleVersion: 1,
    nowEpochSeconds: 1_000,
  });
}

function embeddedHeaders(token: string): HeadersInit {
  return {
    authorization: `Bearer ${token}`,
    origin: "https://app.gohighlevel.com",
    host: "app.operation-automated-lo.test",
  };
}

function approveRequest(body: unknown, headers: HeadersInit = {}): Request {
  return new Request("https://app.operation-automated-lo.test/api/campaigns/approve", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

async function persistDraft(
  ports: CampaignCommandPorts = createDefaultCampaignCommandPorts(),
  headers: HeadersInit = {},
) {
  const response = await handleCampaignPreflight(
    new Request("https://app.operation-automated-lo.test/api/campaigns/preflight", {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(OPEN_HOUSE_DRAFT_INPUT),
    }),
    store.env(),
    ports,
  );
  expect(response.status).toBe(200);
  return persistedDraftFromPreflightBody(await response.json());
}

describe("campaign approval handler", () => {
  it("forbids the local synthetic creator and ignores client-supplied actor fields", async () => {
    await store.enter();
    const draft = await persistDraft();
    const forbidden = await handleCampaignApproval(
      approveRequest({
        campaignRef: draft.campaignRef,
        decision: "approved",
        actorKind: "human",
        actorRole: "approver",
      }),
      store.env(),
      createDefaultCampaignCommandPorts(),
    );
    expect(forbidden.status).toBe(400);
    const creator = await handleCampaignApproval(
      approveRequest({ campaignRef: draft.campaignRef, decision: "approved" }),
      store.env(),
      createDefaultCampaignCommandPorts(),
    );
    expect(creator.status).toBe(403);
    await expect(creator.json()).resolves.toEqual({ error: "FORBIDDEN" });
  });

  it("records an approver decision against server-loaded evidence and is idempotent", async () => {
    await store.enter();
    const session = sessionFixture();
    const draft = await persistDraft(session.ports, session.creatorHeaders);
    const first = await handleCampaignApproval(
      approveRequest(
        {
          campaignRef: draft.campaignRef,
          decision: "approved",
          expectedCampaignVersionRef: draft.campaignVersionRef,
          expectedManifestHash: draft.manifestHash,
          expectedPreflightResultHash: draft.resultHash,
          expectedRowVersion: 1,
        },
        session.approverHeaders,
      ),
      store.env(),
      session.ports,
    );
    expect(first.status).toBe(200);
    const body = (await first.json()) as { decision: string; duplicate: boolean; state: string };
    expect(body).toMatchObject({ decision: "approved", duplicate: false, state: "approved" });
    const retry = await handleCampaignApproval(
      approveRequest(
        {
          campaignRef: draft.campaignRef,
          decision: "approved",
          expectedCampaignVersionRef: draft.campaignVersionRef,
        },
        session.approverHeaders,
      ),
      store.env(),
      session.ports,
    );
    expect(retry.status).toBe(200);
    await expect(retry.json()).resolves.toMatchObject({ duplicate: true, decision: "approved" });
  });

  it("rejects stale browser version hints without mutating the campaign", async () => {
    await store.enter();
    const session = sessionFixture();
    const draft = await persistDraft(session.ports, session.creatorHeaders);
    const response = await handleCampaignApproval(
      approveRequest(
        { campaignRef: draft.campaignRef, decision: "approved", expectedRowVersion: 99 },
        session.approverHeaders,
      ),
      store.env(),
      session.ports,
    );
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({ error: "CAMPAIGN_APPROVAL_CONFLICT" });
  });

  it("returns 401 when review mode has no verified session", async () => {
    const response = await handleCampaignApproval(
      approveRequest({ campaignRef: "campaign_missing001", decision: "approved" }),
      {
        ...LOCAL_SYNTHETIC_ENV,
        OALO_ENVIRONMENT: "production",
        OALO_REVIEW_SURFACE: "authorized",
      },
      createDefaultCampaignCommandPorts(),
    );
    expect(response.status).toBe(401);
  });
});
