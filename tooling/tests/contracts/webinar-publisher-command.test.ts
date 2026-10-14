import { describe, expect, it } from "vitest";
import {
  WebinarPublisherCommandSchema,
  WebinarPublisherSelectionSchema,
  WebinarPublisherTaskSchema,
  WebinarPublisherCheckpointSchema,
  WebinarPublisherNativeIdsSchema,
} from "@oalo/contracts";

const hash = "a".repeat(64);
const command = {
  requestId: "00000000-0000-4000-8000-000000000001",
  projectionRef: "projection_contract001",
  expectedProjectionHash: hash,
  expectedRowVersion: 1,
  action: "draft",
  confirmationHash: hash,
};
describe("CTR-003 browser and outbox contracts", () => {
  it.each([
    "locationId",
    "locationRef",
    "token",
    "projection",
    "providerUrl",
    "reviewerName",
    "sourceSnapshot",
    "createdAt",
    "nativeIds",
    "proof",
  ])("rejects browser authority %s", (key) => {
    expect(WebinarPublisherCommandSchema.safeParse({ ...command, [key]: "injected" }).success).toBe(
      false,
    );
  });
  it.each([
    { action: "delete" },
    { action: "optimize" },
    { expectedRowVersion: 0 },
    { requestId: "retry" },
    { expectedProjectionHash: "bad" },
    { confirmationHash: null },
    { projectionRef: "../../wrong" },
  ])("rejects unsupported or malformed command %j", (patch) => {
    expect(WebinarPublisherCommandSchema.safeParse({ ...command, ...patch }).success).toBe(false);
  });
  it("permits only bounded opaque selected resource references", () => {
    const selected = {
      adAccountRef: "account_contract001",
      pageRef: "page_contract001",
      creativeAssetRef: "creative_contract001",
      geographyRefs: ["geography_contract001"],
    };
    expect(WebinarPublisherSelectionSchema.parse(selected)).toEqual(selected);
    for (const patch of [
      { geographyRefs: [] },
      { geographyRefs: [...selected.geographyRefs, ...selected.geographyRefs] },
      { adAccountId: "act_1" },
      { pageId: "123" },
      { url: "https://provider.example" },
    ])
      expect(WebinarPublisherSelectionSchema.safeParse({ ...selected, ...patch }).success).toBe(
        false,
      );
  });
  it("rejects unknown worker revisions and payloads with private projection contents", () => {
    const task = {
      schemaVersion: 1,
      contractId: "CTR-003",
      contractRevision: 1,
      kind: "webinar-publisher-command",
      operationRef: "operation_contract001",
      locationRef: "location_contract001",
      projectionHash: hash,
      action: "publish",
      correlationRef: "correlation_contract001",
    };
    expect(WebinarPublisherTaskSchema.parse(task)).toEqual(task);
    for (const patch of [
      { schemaVersion: 2 },
      { contractRevision: 2 },
      { kind: "meta-publish" },
      { providerToken: "private" },
      { destination: "https://example.test/private" },
    ])
      expect(WebinarPublisherTaskSchema.safeParse({ ...task, ...patch }).success).toBe(false);
  });
  it("separates native parent linkage from arbitrary Facebook IDs and requires a fenced checkpoint", () => {
    expect(
      WebinarPublisherNativeIdsSchema.safeParse({
        campaignId: null,
        adsetId: "adset123",
        adId: null,
      }).success,
    ).toBe(false);
    expect(
      WebinarPublisherNativeIdsSchema.safeParse({
        campaignId: "campaign123",
        adsetId: null,
        adId: "ad123",
      }).success,
    ).toBe(false);
    const checkpoint = {
      operationRef: "operation_contract001",
      workerRef: "worker_contract001",
      leaseGeneration: 1,
      expectedStage: "campaign",
      stage: "adset",
      state: "drafting",
      nativeIds: { campaignId: "campaign123", adsetId: null, adId: null },
      providerObservedAt: null,
      requestHash: hash,
      readBackHash: null,
    };
    expect(WebinarPublisherCheckpointSchema.parse(checkpoint)).toEqual(checkpoint);
    for (const patch of [
      { leaseGeneration: 0 },
      { expectedStage: "delete" },
      { stage: "unknown" },
      { response: { token: "private" } },
      { facebookCampaignId: "12345" },
    ])
      expect(WebinarPublisherCheckpointSchema.safeParse({ ...checkpoint, ...patch }).success).toBe(
        false,
      );
  });
});
