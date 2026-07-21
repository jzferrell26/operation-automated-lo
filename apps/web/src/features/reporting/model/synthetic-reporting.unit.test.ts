import { describe, expect, it } from "vitest";

import { loadSyntheticReporting } from "./synthetic-reporting.js";

describe("synthetic reporting boundary", () => {
  it("recursively freezes fixture-only campaign and portfolio projections", () => {
    const reporting = loadSyntheticReporting();

    expect(reporting.safety).toMatchObject({ dataMode: "synthetic", writesEnabled: false });
    expect(Object.isFrozen(reporting)).toBe(true);
    expect(Object.isFrozen(reporting.campaign.history)).toBe(true);
    expect(Object.isFrozen(reporting.campaign.creatives)).toBe(true);
    expect(Object.isFrozen(reporting.campaign.metaConnection.assets)).toBe(true);
    expect(Object.isFrozen(reporting.campaign.approvalSnapshot.versions)).toBe(true);
    expect(Object.isFrozen(reporting.portfolio.locations)).toBe(true);
  });

  it("binds safe Meta assets, exact approval scope, launch constraints, and creative originals", () => {
    const reporting = loadSyntheticReporting();

    expect(reporting.campaign.metaConnection).toMatchObject({
      activeLocationId: "synthetic-location-prairie-home",
      state: "connected",
    });
    expect(reporting.campaign.metaConnection.assets.map((asset) => asset.kind)).toEqual([
      "ad_account",
      "page",
      "instagram_identity",
      "lead_form",
      "pixel",
    ]);
    expect(
      reporting.campaign.metaConnection.assets.every((asset) =>
        asset.providerId.startsWith("synthetic-provider-"),
      ),
    ).toBe(true);
    expect(Object.keys(reporting.campaign.approvalSnapshot.versions)).toEqual([
      "page",
      "pdf",
      "creative",
      "copy",
      "disclosure",
      "targeting",
      "budget",
      "dates",
      "form",
      "destination",
    ]);
    expect(reporting.campaign.launchSummary.targets).toHaveLength(3);
    expect(reporting.campaign.launchSummary.exclusions).toHaveLength(3);
    expect(reporting.campaign.creatives).toEqual([
      expect.objectContaining({
        previewHref: "/synthetic-assets/open-house-feed-v3.svg",
        downloadHref: "/synthetic-assets/open-house-feed-v3.svg",
      }),
      expect.objectContaining({
        previewHref: "/synthetic-assets/open-house-story-v3.svg",
        downloadHref: "/synthetic-assets/open-house-story-v3.svg",
      }),
    ]);
  });

  it("exposes links only on explicitly authorized agency locations", () => {
    const reporting = loadSyntheticReporting();
    const authorized = reporting.portfolio.locations.filter(
      (location) => location.state === "authorized",
    );
    const restricted = reporting.portfolio.locations.filter(
      (location) => location.state === "restricted",
    );

    expect(authorized).toHaveLength(reporting.portfolio.authorizedLocationCount);
    expect(authorized.every((location) => location.campaignHref.startsWith("/marketing/"))).toBe(
      true,
    );
    expect(restricted).toEqual([
      expect.objectContaining({ state: "restricted", label: "Location not included" }),
    ]);
  });
});
