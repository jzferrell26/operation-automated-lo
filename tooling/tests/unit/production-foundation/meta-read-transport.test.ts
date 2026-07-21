import { describe, expect, it, vi } from "vitest";

import {
  createMetaPublishingProgressPollingPort,
  readActiveLocationMetaAssets,
  readActiveLocationMetaConnection,
  type ProductionMetaReadTransport,
} from "../../../../packages/ghl/src/index.js";

const locationRef = "location_01TenantA";

function connectionResponse() {
  return {
    locationRef,
    connectionState: "connected",
    assets: [
      {
        kind: "ad_account",
        providerId: "act_12345",
        safeDisplayName: "Approved account",
        availability: "available",
      },
    ],
  };
}

describe("production Meta read transport", () => {
  it("uses only exact allowlisted GET routes scoped to the active location", async () => {
    const transport: ProductionMetaReadTransport = {
      get: vi.fn(async () => connectionResponse()),
    };
    await readActiveLocationMetaConnection(locationRef, transport);
    await readActiveLocationMetaAssets("get-ad-accounts", locationRef, transport);

    expect(transport.get).toHaveBeenNthCalledWith(1, {
      locationRef,
      route: "/ad-publishing/facebook/integration",
    });
    expect(transport.get).toHaveBeenNthCalledWith(2, {
      locationRef,
      route: "/ad-publishing/facebook/ad-accounts",
    });
  });

  it("fails closed on a cross-location or unsafe connection response", async () => {
    const crossLocation: ProductionMetaReadTransport = {
      get: vi.fn(async () => ({ ...connectionResponse(), locationRef: "location_02Other" })),
    };
    await expect(readActiveLocationMetaConnection(locationRef, crossLocation)).rejects.toThrow(
      "active location scope",
    );
    await expect(
      readActiveLocationMetaAssets("get-ad-accounts", locationRef, crossLocation),
    ).rejects.toThrow("active location scope");

    const unsafeResponse: ProductionMetaReadTransport = {
      get: vi.fn(async () => ({ ...connectionResponse(), accessToken: "must-not-parse" })),
    };
    await expect(readActiveLocationMetaConnection(locationRef, unsafeResponse)).rejects.toThrow();
  });

  it("strictly parses terminal publishing progress through an injected read transport", async () => {
    const transport: ProductionMetaReadTransport = {
      get: vi.fn(async () => ({
        state: "live",
        completedSteps: 2,
        totalSteps: 2,
        observedAt: "2026-07-21T12:00:00.000Z",
      })),
    };
    const progress = createMetaPublishingProgressPollingPort({
      locationRef,
      campaignId: "campaign_meta_01",
      transport,
    });

    const signal = new AbortController().signal;
    await expect(progress.poll(signal)).resolves.toMatchObject({ state: "live" });
    expect(transport.get).toHaveBeenCalledWith(
      {
        locationRef,
        route: "/ad-publishing/facebook/campaigns/campaign_meta_01/publishing-progress",
      },
      signal,
    );
  });
});
