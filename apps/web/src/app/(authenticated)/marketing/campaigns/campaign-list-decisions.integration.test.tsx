import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  approvedProjection,
  awaitingApprovalProjection,
  sentBackProjection,
} from "../../../../features/campaigns/components/campaign-decision.test-support.js";
import { OALO_REVIEW_SURFACE_AUTHORIZED } from "../../../../server/authenticated-workspace-data.js";
import CampaignListPage from "./page.js";

/**
 * PRD-008, the coordinator's follow-up to finding S1b of the 2026-10-01 writing review.
 *
 * A send-back leaves a campaign in `awaiting_approval` with a rejection recorded against it, and the
 * list page named where each campaign stands from the state alone, so a campaign that had just been
 * sent back read "Ready for approval" on the list while its own page said it was sent back. The
 * reads are the one thing mocked: what this proves is what the page says about a campaign it was
 * given, and `campaign-workspace-read.test.ts` proves the projection carries the decision.
 */

const mocked = vi.hoisted(() => ({ read: vi.fn() }));
vi.mock("next/headers.js", () => ({ headers: () => Promise.resolve(new Headers()) }));
vi.mock("../../../../server/campaign-workspace-reads.js", () => ({
  readWorkspaceCampaignsForRequest: mocked.read,
}));

beforeEach(() => {
  vi.stubEnv("OALO_ENVIRONMENT", "production");
  vi.stubEnv("OALO_PROVIDER_MODE", "stub");
  vi.stubEnv("OALO_SYNTHETIC_DATA_ONLY", "true");
  vi.stubEnv("OALO_REVIEW_SURFACE", OALO_REVIEW_SURFACE_AUTHORIZED);
});

afterEach(() => {
  vi.unstubAllEnvs();
  mocked.read.mockReset();
});

describe("the campaign list for a campaign somebody has decided on", () => {
  it("says a sent-back campaign was sent back, and never that it is ready for approval", async () => {
    mocked.read.mockResolvedValue({ authenticated: true, campaigns: [await sentBackProjection()] });

    render(await CampaignListPage());

    expect(screen.getByText("Sent back for changes")).toBeInTheDocument();
    expect(screen.queryByText("Ready for approval")).toBeNull();
    expect(screen.queryByText("Approve this version.")).toBeNull();
  });

  /**
   * 008B-AC-009, the approved half. An approval moves the state to `approved`, so the stored state
   * already says so; this keeps it that way and keeps the list from describing an approved
   * campaign as ready for approval or as sent back.
   */
  it("says an approved campaign is approved, and never that it is ready for approval", async () => {
    mocked.read.mockResolvedValue({ authenticated: true, campaigns: [await approvedProjection()] });

    render(await CampaignListPage());

    expect(screen.getByText("Approved")).toBeInTheDocument();
    expect(screen.queryByText("Ready for approval")).toBeNull();
    expect(screen.queryByText("Sent back for changes")).toBeNull();
    expect(screen.queryByText("Approve this version.")).toBeNull();
  });

  it("still says a campaign nobody has decided on is ready for approval", async () => {
    mocked.read.mockResolvedValue({
      authenticated: true,
      campaigns: [await awaitingApprovalProjection()],
    });

    render(await CampaignListPage());

    expect(screen.getByText("Ready for approval")).toBeInTheDocument();
    expect(screen.queryByText("Sent back for changes")).toBeNull();
  });
});
