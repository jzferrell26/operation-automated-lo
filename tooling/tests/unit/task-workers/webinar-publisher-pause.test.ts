import { describe, expect, it, vi } from "vitest";
import { publisherFixture } from "../../../../packages/db/test/webinar-publisher-fixture.mjs";
import {
  createWebinarPublisherNativeTransport,
  createWebinarPublisherProjection,
  WEBINAR_PUBLISHER_WIRE_MAPPING_HASH,
} from "@oalo/ghl";

function fixture() {
  const f = publisherFixture();
  const { projectionHash: _hash, ...body } = f.summary.projection;
  const now = Date.now();
  const projection = createWebinarPublisherProjection({
    ...body,
    providerContract: {
      ...body.providerContract,
      wireMappingHash: WEBINAR_PUBLISHER_WIRE_MAPPING_HASH,
    },
    schedule: { ...body.schedule, endsAt: new Date(now - 1000).toISOString() },
    createdAt: new Date(now - 86400000).toISOString(),
  });
  const qualification = {
    schemaVersion: 1,
    contractId: "CTR-003",
    contractRevision: 1,
    kind: "app_test",
    action: "pause",
    evidenceRef: "evidence_ownedPause001",
    artifactHash: "a".repeat(64),
    projectionHash: projection.projectionHash,
    wireMappingHash: WEBINAR_PUBLISHER_WIRE_MAPPING_HASH,
    locationId: projection.assets.locationId,
    adAccountId: projection.assets.adAccountId,
    campaignId: "campaign_owned001",
    observedAt: new Date(now - 500).toISOString(),
    expiresAt: new Date(now + 60000).toISOString(),
  };
  const fetch = vi.fn(async (_url: string, _init: RequestInit) => Response.json({ success: true }));
  const assertCurrent = vi.fn(async () => undefined);
  const transport = createWebinarPublisherNativeTransport({
    fetch,
    resolveLocationToken: async () => ({
      locationId: projection.assets.locationId,
      accessToken: "synthetic_pause_access_token_only",
    }),
    authority: { assertCurrent },
    now: () => now,
  });
  const request = {
    operation: "pause",
    locationRef: projection.locationRef,
    projection,
    qualification,
    parameters: { campaignId: qualification.campaignId },
    body: { locationId: projection.assets.locationId },
  };
  return { request, fetch, assertCurrent, transport, now };
}
describe("independent owned pause transport", () => {
  it("stops the owned campaign after creative expiry without launch/media proof", async () => {
    const f = fixture();
    await expect(f.transport.execute(f.request)).resolves.toMatchObject({
      normalized: { success: true },
    });
    expect(f.fetch).toHaveBeenCalledTimes(1);
    expect(f.assertCurrent).toHaveBeenCalledWith(
      expect.objectContaining({ qualification: f.request.qualification, operation: "pause" }),
    );
    expect(f.fetch.mock.calls[0]?.[0]).toBe(
      `https://services.leadconnectorhq.com/ad-publishing/facebook/campaigns/${f.request.qualification.campaignId}/pause`,
    );
  });
  it.each([
    "campaignId",
    "locationId",
    "adAccountId",
    "projectionHash",
    "wireMappingHash",
    "action",
    "kind",
    "expiresAt",
    "observedAt",
  ])("refuses mismatched %s before send", async (key) => {
    const f = fixture();
    const value =
      key === "expiresAt"
        ? new Date(f.now - 1).toISOString()
        : key === "observedAt"
          ? new Date(f.now + 1).toISOString()
          : key === "action"
            ? "resume"
            : key === "kind"
              ? "local_synthetic"
              : key.includes("Hash")
                ? "b".repeat(64)
                : key === "adAccountId"
                  ? "act_999"
                  : "foreign_native001";
    await expect(
      f.transport.execute({
        ...f.request,
        qualification: { ...f.request.qualification, [key]: value },
      }),
    ).rejects.toThrow();
    expect(f.fetch).not.toHaveBeenCalled();
  });
  it("still refuses expired resume", async () => {
    const f = fixture();
    await expect(f.transport.execute({ ...f.request, operation: "resume" })).rejects.toThrow();
    expect(f.fetch).not.toHaveBeenCalled();
  });
});
