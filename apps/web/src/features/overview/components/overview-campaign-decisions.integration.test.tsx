import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { CampaignWorkspaceProjection } from "@oalo/application";

import {
  awaitingApprovalProjection,
  sentBackProjection,
} from "../../campaigns/components/campaign-decision.test-support.js";
import { loadSyntheticUiFixture } from "../../ui-foundation/data/load-synthetic-ui.js";
import { OverviewScreen } from "./overview-screen.js";

/**
 * PRD-008, the coordinator's follow-up to finding S1b of the 2026-10-01 writing review.
 *
 * The overview card for a campaign named where it stands from the stored state alone. A send-back
 * leaves the state at `awaiting_approval` and records a rejection, so a campaign that had just been
 * sent back read "Ready for approval" on the overview while its own page said it was sent back.
 * Both are read through the real projection, which carries the decision.
 */

/** The overview's card for one campaign, found by its headline and scoped so the rest of the page cannot answer. */
function campaignCard(campaign: CampaignWorkspaceProjection): HTMLElement {
  const card = screen.getByRole("heading", { name: campaign.headline }).parentElement;
  if (card === null) throw new Error("The campaign heading has no card around it.");
  return card;
}

function renderOverview(campaign: CampaignWorkspaceProjection): HTMLElement {
  const fixture = loadSyntheticUiFixture();
  render(
    <OverviewScreen
      overview={fixture.overview}
      session={fixture.session}
      workspaceCampaigns={[campaign]}
    />,
  );
  return campaignCard(campaign);
}

describe("the overview card for a campaign somebody has decided on", () => {
  it("says a sent-back campaign was sent back, and never that it is ready for approval", async () => {
    const card = renderOverview(await sentBackProjection());

    expect(within(card).getByText("Sent back for changes")).toBeInTheDocument();
    expect(within(card).queryByText("Ready for approval")).toBeNull();
    expect(within(card).queryByText(/Approve this version/u)).toBeNull();
  });

  it("still says a campaign nobody has decided on is ready for approval", async () => {
    const card = renderOverview(await awaitingApprovalProjection());

    expect(within(card).getByText("Ready for approval")).toBeInTheDocument();
    expect(within(card).queryByText("Sent back for changes")).toBeNull();
  });
});
