import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { R2ObjectStoreConfigurationError } from "@oalo/storage";
import { CampaignManifestSchema, FinancingCampaignManifestSchema } from "@oalo/contracts";
import { canonicalCampaignHash } from "@oalo/application";
import { FinancingRequestSchema, FinancingSavedSchema } from "../features/financing/model.js";
import { createTemporaryCampaignStore } from "./campaign-command-test-support.js";
import { createLocalSyntheticPrincipal } from "./authenticated-principal.js";
import { createFinancingMediaRuntime } from "./financing-media-runtime.js";
import * as mediaRuntime from "./financing-media-runtime.js";
import { uploadFinancingMedia } from "./financing-media-service.js";
import { financingInput, financingPorts, financingRequest } from "./financing.test-support.js";
import { handleFinancingSave } from "./financing-http.js";
import { loadLocalCampaign } from "./local-campaign-store.js";
import { readFinancingFormContext } from "./financing-context.js";
import { verifyFinancingVersion } from "./financing-verification.js";

const store = createTemporaryCampaignStore("oalo-financing-v2-");
const facts = {
  listPriceMinor: 42_000_000,
  bedrooms: 3,
  bathroomsHundredths: 250,
  floorAreaSqFt: 1800,
  confirmed: true,
} as const;
const input = () => ({
  ...financingInput(),
  schemaVersion: 2 as const,
  propertyFacts: facts,
  propertyMedia: [] as { mediaRef: string; altText: string }[],
});
const save = (body: unknown) =>
  handleFinancingSave(financingRequest(body), store.env(), financingPorts());
async function photograph(color = "#348cab") {
  const runtime = createFinancingMediaRuntime(createLocalSyntheticPrincipal(), store.env());
  const bytes = await sharp({ create: { width: 600, height: 400, channels: 3, background: color } })
    .jpeg()
    .toBuffer();
  return (
    await uploadFinancingMedia(
      {
        requestId: randomUUID(),
        declaredMimeType: "image/jpeg",
        rightsBasis: "owned",
        rightsConfirmed: true,
      },
      bytes,
      createLocalSyntheticPrincipal(),
      runtime,
    )
  ).record;
}
beforeEach(() => store.enter());
afterEach(async () => {
  vi.restoreAllMocks();
  await store.restore();
});
describe("versioned financing snapshots", () => {
  it("reuses legacy and facts-only reports without constructing photograph storage", async () => {
    const legacy = FinancingSavedSchema.parse(await (await save(financingInput())).json());
    const factsOnly = FinancingSavedSchema.parse(await (await save(input())).json());
    const runtime = vi.spyOn(mediaRuntime, "createFinancingMediaRuntime").mockImplementation(() => {
      throw new R2ObjectStoreConfigurationError();
    });
    const context = await readFinancingFormContext(createLocalSyntheticPrincipal(), store.env());
    expect(context.previous.map((item) => item.campaignRef).sort()).toEqual(
      [legacy.campaignRef, factsOnly.campaignRef].sort(),
    );
    expect(context.unavailablePrevious).toEqual([]);
    expect(runtime).not.toHaveBeenCalled();
  });
  it.each(["unconfigured storage", "corrupt bytes"] as const)(
    "keeps text-only creation and reuse available when an older photo has %s",
    async (failure) => {
      const photo = await photograph();
      const photoBody = {
        ...input(),
        propertyMedia: [{ mediaRef: photo.mediaRef, altText: "Front of property" }],
      };
      const photoReport = FinancingSavedSchema.parse(await (await save(photoBody)).json());
      const factsOnly = FinancingSavedSchema.parse(await (await save(input())).json());
      const originalRuntime = createFinancingMediaRuntime(
        createLocalSyntheticPrincipal(),
        store.env(),
      );
      const originalRecord = await loadLocalCampaign(photoReport.campaignRef, store.env());
      const runtime = vi
        .spyOn(mediaRuntime, "createFinancingMediaRuntime")
        .mockImplementation(() => {
          if (failure === "unconfigured storage") throw new R2ObjectStoreConfigurationError();
          return {
            repository: originalRuntime.repository,
            bytes: { ...originalRuntime.bytes, read: async () => Uint8Array.from([1, 2, 3]) },
          };
        });
      const context = await readFinancingFormContext(createLocalSyntheticPrincipal(), store.env());
      expect(context.canSave).toBe(true);
      expect(context.previous.map((item) => item.campaignRef)).toEqual([factsOnly.campaignRef]);
      expect(context.unavailablePrevious).toEqual([
        { campaignRef: photoReport.campaignRef, label: photoBody.address },
      ]);
      expect(runtime).toHaveBeenCalledExactlyOnceWith(createLocalSyntheticPrincipal(), store.env());
      expect(await loadLocalCampaign(photoReport.campaignRef, store.env())).toEqual(originalRecord);
      const unexpected = new Error("Unexpected media initialization failure");
      runtime.mockImplementation(() => {
        throw unexpected;
      });
      await expect(
        readFinancingFormContext(createLocalSyntheticPrincipal(), store.env()),
      ).rejects.toBe(unexpected);
    },
  );
  it("parses legacy manifests to identical canonical values without inserting new facts", async () => {
    const legacy = financingInput();
    expect(FinancingRequestSchema.parse(legacy)).toEqual(legacy);
    const saved = FinancingSavedSchema.parse(await (await save(legacy)).json());
    const record = await loadLocalCampaign(saved.campaignRef, store.env());
    if (!record) throw new Error("Missing report");
    const original = verifyFinancingVersion(record.version);
    expect(FinancingCampaignManifestSchema.parse(original)).toEqual(original);
    expect(CampaignManifestSchema.parse(original)).toEqual(original);
    expect(canonicalCampaignHash(original)).toBe(record.version.manifestHash);
    expect(original).toMatchObject({ schemaVersion: 1, templateVersion: "1.0.0", images: [] });
    expect(original.property).not.toHaveProperty("facts");
    expect(original.property).not.toHaveProperty("media");
  });
  it("freezes ordered actual media and confirmed facts without changing arithmetic", async () => {
    const first = await photograph(),
      second = await photograph("#bd7925");
    const body = {
      ...input(),
      propertyMedia: [
        { mediaRef: second.mediaRef, altText: "Dining room" },
        { mediaRef: first.mediaRef, altText: "Front of property" },
      ],
    };
    const response = await save(body);
    expect(response.status).toBe(200);
    const saved = FinancingSavedSchema.parse(await response.json());
    const record = await loadLocalCampaign(saved.campaignRef, store.env());
    if (!record) throw new Error("Missing report");
    const manifest = verifyFinancingVersion(record.version);
    expect(manifest).toMatchObject({
      schemaVersion: 2,
      templateVersion: "2.0.0",
      images: [],
      reviewOnly: true,
    });
    if (manifest.schemaVersion !== 2) throw new Error("Wrong version");
    expect(manifest.property.facts).toEqual(facts);
    expect(manifest.property.media.map((item) => item.mediaRef)).toEqual([
      second.mediaRef,
      first.mediaRef,
    ]);
    expect(manifest.property.media[0]).toMatchObject({
      sha256: second.sha256,
      rights: second.rights,
      altText: "Dining room",
    });
    expect(manifest.calculated.scenarios[0]?.totalHousingMinor).toBe(256856);
    expect(await (await save(body)).json()).toEqual(saved);
    const reused = (await readFinancingFormContext(createLocalSyntheticPrincipal(), store.env()))
      .previous[0]?.input;
    expect(reused).toMatchObject({
      schemaVersion: 2,
      propertyFacts: { ...facts, confirmed: false },
      propertyMedia: body.propertyMedia,
      propertyPermissionConfirmed: false,
    });
    expect(reused?.financing.scenarios[0]).toMatchObject({
      costsComplete: false,
      quote: { confirmed: false, quotedAt: body.financing.scenarios[0]?.quote.quotedAt },
    });
    for (const changed of [
      { ...body, propertyFacts: { ...facts, bedrooms: 4 } },
      { ...body, propertyMedia: [...body.propertyMedia].reverse() },
      {
        ...body,
        propertyMedia: [
          { ...body.propertyMedia[0], altText: "Changed description" },
          body.propertyMedia[1],
        ],
      },
    ])
      expect((await save(changed)).status).toBe(409);
    await createFinancingMediaRuntime(
      createLocalSyntheticPrincipal(),
      store.env(),
    ).repository.revoke(second.mediaRef);
    expect((await save(body)).status).toBe(410);
    const unavailable = await readFinancingFormContext(
      createLocalSyntheticPrincipal(),
      store.env(),
    );
    expect(unavailable.previous).toEqual([]);
    expect(unavailable.unavailablePrevious).toEqual([
      { campaignRef: saved.campaignRef, label: body.address },
    ]);
    expect(unavailable.canSave).toBe(true);
  });
  it("requires every nullable fact and explicit fact confirmation, refuses browser metadata", async () => {
    const body = input();
    for (const propertyFacts of [
      { ...facts, confirmed: false },
      { ...facts, bedrooms: undefined },
      { ...facts, listPriceMinor: 0 },
    ])
      expect((await save({ ...body, propertyFacts })).status).toBe(400);
    expect(
      (
        await save({
          ...body,
          propertyMedia: [
            { mediaRef: `media_${"a".repeat(32)}`, altText: "A home", sha256: "a".repeat(64) },
          ],
        })
      ).status,
    ).toBe(400);
    const response = await save({
      ...input(),
      propertyFacts: {
        listPriceMinor: null,
        bedrooms: null,
        bathroomsHundredths: null,
        floorAreaSqFt: null,
        confirmed: true,
      },
    });
    expect(response.status).toBe(200);
  });
  it("refuses nonexistent media before committing a campaign and leaves retry identity usable", async () => {
    const body = input();
    expect(
      (
        await save({
          ...body,
          propertyMedia: [{ mediaRef: `media_${"a".repeat(32)}`, altText: "A home" }],
        })
      ).status,
    ).toBe(404);
    expect((await save(body)).status).toBe(200);
  });
});
