import { afterEach, describe, expect, it, vi } from "vitest";
import { canonicalCampaignHash } from "@oalo/application";
import { prepareWebinarAdVersion } from "./webinar-ad-prepare.js";
import { createWebinarAdEvidencePort, webinarCurrentEvidence } from "./webinar-ad-evidence.js";
import * as destinationModule from "./webinar-destination.js";
import {
  webinarMemoryAdapter,
  WEBINAR_TEST_BRAND as brand,
  WEBINAR_TEST_DESTINATION as destination,
  WEBINAR_TEST_INPUT as input,
  WEBINAR_TEST_PRINCIPAL as principal,
} from "./webinar-ad.test-support.js";

afterEach(() => vi.restoreAllMocks());
async function savedVersion() {
  return (
    await prepareWebinarAdVersion(
      input,
      principal,
      {},
      {
        adapter: webinarMemoryAdapter(),
        readBrand: async () => brand,
        resolveDestination: async () => destination,
        now: () => new Date("2026-10-13T12:00:00.000Z"),
      },
    )
  ).version;
}
describe("authoritative webinar evidence adapter", () => {
  it("regenerates actual source and raster evidence and compares the stored-version destination boundary", async () => {
    const version = await savedVersion();
    const resolve = vi
      .spyOn(destinationModule, "resolveCampaignWebinarDestination")
      .mockResolvedValue(destination);
    const port = createWebinarAdEvidencePort(principal, {});
    expect(await webinarCurrentEvidence(version, port)).toEqual({ available: true });
    expect(resolve).toHaveBeenCalledWith(
      principal,
      version.campaignRef,
      version.campaignVersionRef,
      {},
      expect.any(Date),
    );
    resolve.mockResolvedValue({
      ...destination,
      publicUrl: "https://changed.example/f/00000000-0000-4000-8000-000000000901",
    });
    expect(await webinarCurrentEvidence(version, port)).toEqual({
      available: false,
      error: "DESTINATION_CHANGED",
    });
  });
  it("refuses current source and raster drift even when a modified record carries a consistent outer hash", async () => {
    const version = await savedVersion();
    vi.spyOn(destinationModule, "resolveCampaignWebinarDestination").mockResolvedValue(destination);
    const source = structuredClone(version.manifest);
    if (source.blueprintId !== "webinar-ad") throw new Error("Expected webinar");
    source.template.sourceHash = "d".repeat(64);
    const port = createWebinarAdEvidencePort(principal, {});
    expect(
      await webinarCurrentEvidence(
        { ...version, manifest: source, manifestHash: canonicalCampaignHash(source) },
        port,
      ),
    ).toEqual({ available: false, error: "WEBINAR_ART_INVALID" });
    const raster = structuredClone(version.manifest);
    if (raster.blueprintId !== "webinar-ad") throw new Error("Expected webinar");
    raster.images[1].contentSha256 = "d".repeat(64);
    expect(
      await webinarCurrentEvidence(
        { ...version, manifest: raster, manifestHash: canonicalCampaignHash(raster) },
        port,
      ),
    ).toEqual({ available: false, error: "WEBINAR_RASTER_CHANGED" });
  });
  it("does not probe a withdrawn or elapsed stored destination as current", async () => {
    const version = await savedVersion();
    const resolve = vi
      .spyOn(destinationModule, "resolveCampaignWebinarDestination")
      .mockRejectedValue(new destinationModule.WebinarDestinationError(409, "DESTINATION_CHANGED"));
    const port = createWebinarAdEvidencePort(principal, {});
    expect(await webinarCurrentEvidence(version, port)).toEqual({
      available: false,
      error: "DESTINATION_CHANGED",
    });
    resolve.mockClear();
    expect(
      (await webinarCurrentEvidence(version, port, new Date("2031-01-01T00:00:00.000Z"))).available,
    ).toBe(false);
    expect(resolve).not.toHaveBeenCalled();
  });
});
