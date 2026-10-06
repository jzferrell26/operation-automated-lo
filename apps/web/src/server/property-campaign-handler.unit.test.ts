import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createDefaultCampaignCommandPorts,
  createLocalSyntheticPrincipal,
} from "./authenticated-principal.js";
import {
  createTemporaryCampaignStore,
  LOCAL_SYNTHETIC_ENV,
} from "./campaign-command-test-support.js";
import { createCampaignPersistenceAdapter } from "./campaign-persistence-runtime.js";
import { loadLocalCampaign } from "./local-campaign-store.js";
import { readPropertyCampaignContext } from "./property-campaign-context.js";
import { handlePropertyCampaignSave } from "./property-campaign-handler.js";
import { savePropertyCampaign } from "./property-campaign-save.js";
import { PropertyCampaignSavedSchema } from "../features/property-campaigns/model.js";
import { buildCampaignPage } from "./campaign-page-data.js";
import { readPropertyCampaignPage } from "./property-campaign-page.js";
import { singleActorSessionFixture } from "./signed-session.test-support.js";

function signedSession(role: "campaign_creator" | "campaign_approver" | "viewer") {
  const principal = createLocalSyntheticPrincipal({
    role,
    actorRef: "principal_recoveryactor001",
    locationRef: "location_recoverytenant001",
    installationRef: "installation_recovery001",
  });
  return {
    principal,
    fixture: singleActorSessionFixture(principal),
  };
}

const INPUT = Object.freeze({
  requestId: "0fda8d4c-2b98-4c4f-a8eb-26e6309f9ae1",
  address: "123 Example Street, Dallas",
  stateCode: "TX",
  description: "A made-up property used to prove the campaign preparation path.",
  startsAt: "2030-06-12T18:00:00-05:00",
  endsAt: "2030-06-12T20:00:00-05:00",
  partnerId: "00000000-0000-4000-8000-000000000001",
  propertyPermissionConfirmed: false,
  realtorPermissionConfirmed: false,
});

const store = createTemporaryCampaignStore("oalo-property-recovery-");
afterEach(async () => {
  await store.restore();
  vi.restoreAllMocks();
});

function request(body: unknown, headers: HeadersInit = {}) {
  return new Request("https://app.operation-automated-lo.test/api/campaigns/property", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

async function save(body: unknown = INPUT) {
  return handlePropertyCampaignSave(
    request(body),
    store.env(),
    createDefaultCampaignCommandPorts(),
  );
}

describe("property preparation through the actual save handler", () => {
  it.each(["viewer", "campaign_approver"] as const)(
    "refuses a signed %s before reading or saving a campaign",
    async (role) => {
      await store.enter();
      const { principal, fixture } = signedSession(role);
      const response = await handlePropertyCampaignSave(
        request(INPUT, fixture.headersFor(principal.actorRef)),
        store.env(),
        fixture.ports,
      );
      expect(response.status).toBe(403);
      const adapter = createCampaignPersistenceAdapter(
        createLocalSyntheticPrincipal(),
        store.env(),
      );
      expect(await adapter.readRepository.listForLocation()).toEqual([]);
    },
  );

  it("rejects an untrusted browser origin even with a valid signed creator session", async () => {
    await store.enter();
    const { principal, fixture } = signedSession("campaign_creator");
    const response = await handlePropertyCampaignSave(
      request(
        INPUT,
        fixture.headersFor(principal.actorRef, { origin: "https://untrusted.example" }),
      ),
      store.env(),
      fixture.ports,
    );
    // The existing command boundary classifies a refused browser session as unauthenticated.
    expect(response.status).toBe(401);
    const adapter = createCampaignPersistenceAdapter(createLocalSyntheticPrincipal(), store.env());
    expect(await adapter.readRepository.listForLocation()).toEqual([]);
  });

  it("shows a signed viewer no brand or partner setup data", async () => {
    await store.enter();
    const { principal, fixture } = signedSession("viewer");
    const result = await readPropertyCampaignPage(
      new Request("https://app.operation-automated-lo.test/marketing/campaigns/property", {
        headers: fixture.headersFor(principal.actorRef),
      }),
      store.env(),
      fixture.ports,
    );
    expect(result).toMatchObject({
      authenticated: true,
      data: { canSave: false, brandName: "", partners: [] },
    });
  });

  it("saves the property, real selected demo partner, and frozen server brand without producing outputs", async () => {
    await store.enter();
    const fetch = vi.spyOn(globalThis, "fetch");
    const response = await save();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const result = PropertyCampaignSavedSchema.parse(await response.json());
    expect(result.versionNo).toBe(1);
    expect(result.providerPublicationAuthorized).toBe(false);
    const record = await loadLocalCampaign(result.campaignRef, store.env());
    const manifest = record?.version.manifest;
    if (manifest?.blueprintId !== "open-house-boost") throw new Error("Missing property version");
    expect(manifest.property.address).toBe(INPUT.address);
    expect(manifest.property.openHouseStartsAt).toBe(INPUT.startsAt);
    expect(manifest.property.permissionConfirmed).toBe(false);
    expect(manifest.partner).toEqual({
      realtorDisplayName: "Jordan Sample",
      permissionConfirmed: false,
    });
    expect(manifest.preparation).toMatchObject({
      status: "draft",
      brand: { name: "Alex Morgan", company: "Prairie Home Lending" },
      partnerRecordId: INPUT.partnerId,
      partnerCompany: "Example Realty",
    });
    expect(manifest.images).toEqual([]);
    expect(manifest.meta.enabled).toBe(false);
    expect(manifest.meta.dailyBudgetMinor).toBe(0);
    expect(manifest.routing.validationStatus).toBe("missing");
    expect(record?.preflight.blocking).toBe(true);
    expect(record?.preflight.findings.map((finding) => finding.ruleCode)).toEqual(
      expect.arrayContaining([
        "PROPERTY_PERMISSION_REQUIRED",
        "PARTNER_PERMISSION_REQUIRED",
        "GHL_ROUTING_INCOMPLETE",
      ]),
    );
    expect(record?.approval).toBeUndefined();
    expect(fetch).not.toHaveBeenCalled();
    const principal = createLocalSyntheticPrincipal();
    const adapter = createCampaignPersistenceAdapter(principal, store.env());
    const workspaceRecord = await adapter.readRepository.getByCampaignRef(result.campaignRef);
    if (workspaceRecord === undefined) throw new Error("Saved campaign is not readable");
    const page = buildCampaignPage({
      record: workspaceRecord,
      versions: [workspaceRecord],
      principal,
      kind: adapter.kind,
      library: { find: () => undefined, standingOf: () => undefined },
    });
    expect(page).toMatchObject({
      kind: "property-preparation",
      address: INPUT.address,
      partnerName: "Jordan Sample",
      brandName: "Alex Morgan",
      propertyPermissionConfirmed: false,
    });
    expect(page).not.toHaveProperty("approvalControls");
    expect(page).not.toHaveProperty("results");
  });

  it("keeps launch blocked even when both permission attestations are true", async () => {
    await store.enter();
    const result = PropertyCampaignSavedSchema.parse(
      await (
        await save({
          ...INPUT,
          propertyPermissionConfirmed: true,
          realtorPermissionConfirmed: true,
        })
      ).json(),
    );
    const record = await loadLocalCampaign(result.campaignRef, store.env());
    expect(record?.preflight.blocking).toBe(true);
    expect(record?.preflight.findings.map((finding) => finding.ruleCode)).toContain(
      "GHL_ROUTING_INCOMPLETE",
    );
  });

  it("returns the same saved campaign and version for an exact retry", async () => {
    await store.enter();
    const first = PropertyCampaignSavedSchema.parse(await (await save()).json());
    const second = PropertyCampaignSavedSchema.parse(await (await save()).json());
    expect(second).toEqual(first);
    const adapter = createCampaignPersistenceAdapter(createLocalSyntheticPrincipal(), store.env());
    const records = await adapter.readRepository.listForLocation();
    expect(records).toHaveLength(1);
    expect(records[0]?.version.versionNo).toBe(1);
  });

  it("refuses an altered retry and preserves the first immutable property", async () => {
    await store.enter();
    const first = PropertyCampaignSavedSchema.parse(await (await save()).json());
    const response = await save({ ...INPUT, address: "456 Changed Street" });
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({ error: "PROPERTY_CAMPAIGN_SAVE_CONFLICT" });
    const record = await loadLocalCampaign(first.campaignRef, store.env());
    const manifest = record?.version.manifest;
    if (manifest?.blueprintId !== "open-house-boost") throw new Error("Missing property version");
    expect(manifest.property.address).toBe(INPUT.address);
    expect(record?.version.versionNo).toBe(1);
  });

  it.each([
    ["a tenant override", { locationRef: "location_other001" }],
    ["an actor override", { actorRef: "actor_other001" }],
    ["a brand override", { brand: { name: "Impersonated lender" } }],
    ["an approval", { approved: true }],
    ["routing authority", { routing: { validationStatus: "valid" } }],
    ["a publish command", { publish: true }],
    ["a fake state", { stateCode: "ZZ" }],
    ["an invalid request key", { requestId: "anything" }],
    ["an end before the start", { endsAt: "2030-06-11T18:00:00-05:00" }],
    ["an event in the past", { startsAt: "2020-01-01T18:00:00Z", endsAt: "2020-01-01T20:00:00Z" }],
  ])("rejects %s before a campaign is saved", async (_label, change) => {
    await store.enter();
    expect((await save({ ...INPUT, ...change })).status).toBe(400);
    const adapter = createCampaignPersistenceAdapter(createLocalSyntheticPrincipal(), store.env());
    expect(await adapter.readRepository.listForLocation()).toEqual([]);
  });

  it("does not invent a partner for an unknown saved-partner ID", async () => {
    await store.enter();
    const response = await save({ ...INPUT, partnerId: "00000000-0000-4000-8000-000000000099" });
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "PROPERTY_CAMPAIGN_PARTNER_NOT_FOUND",
    });
  });

  it("refuses oversized or non-JSON input", async () => {
    await store.enter();
    expect((await save({ ...INPUT, description: "x".repeat(20_000) })).status).toBe(413);
    const response = await handlePropertyCampaignSave(
      request("text", { "content-type": "text/plain" }),
      store.env(),
      createDefaultCampaignCommandPorts(),
    );
    expect(response.status).toBe(415);
    expect((await save("{invalid")).status).toBe(400);
  });

  it("requires a verified session in hosted review mode", async () => {
    const response = await handlePropertyCampaignSave(
      request(INPUT),
      {
        ...LOCAL_SYNTHETIC_ENV,
        OALO_ENVIRONMENT: "production",
        OALO_REVIEW_SURFACE: "authorized",
      },
      createDefaultCampaignCommandPorts(),
    );
    expect(response.status).toBe(401);
  });

  it("cannot borrow local identity in staging", async () => {
    const response = await handlePropertyCampaignSave(
      request(INPUT),
      {
        ...LOCAL_SYNTHETIC_ENV,
        OALO_ENVIRONMENT: "staging",
      },
      createDefaultCampaignCommandPorts(),
    );
    expect(response.status).toBe(403);
  });

  it("rejects conflicting authentication mechanisms", async () => {
    await store.enter();
    const response = await handlePropertyCampaignSave(
      request(INPUT, {
        authorization: "Bearer aaa.bbb.ccc",
        cookie: "__Host-oalo_session=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      }),
      store.env(),
      createDefaultCampaignCommandPorts(),
    );
    expect(response.status).toBe(401);
  });

  it("cannot substitute a placeholder for a missing saved brand", async () => {
    await store.enter();
    const principal = createLocalSyntheticPrincipal();
    const adapter = createCampaignPersistenceAdapter(principal, store.env());
    const context = await readPropertyCampaignContext(principal, store.env());
    await expect(
      savePropertyCampaign(INPUT, principal, store.env(), {
        versionRepository: adapter.versionRepository,
        readRepository: adapter.readRepository,
        readContext: async () => ({ ...context, brand: { ...context.brand, saved: false } }),
      }),
    ).rejects.toMatchObject({ code: "PROPERTY_CAMPAIGN_BRAND_REQUIRED" });
    expect(await adapter.readRepository.listForLocation()).toEqual([]);
  });
});
