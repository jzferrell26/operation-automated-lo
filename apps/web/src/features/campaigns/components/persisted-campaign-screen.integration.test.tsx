import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { projectCampaignWorkspace } from "@oalo/application";

import { createLocalSyntheticPrincipal } from "../../../server/authenticated-principal.js";
import {
  LOCAL_SYNTHETIC_ENV,
  OPEN_HOUSE_DRAFT_INPUT,
} from "../../../server/campaign-command-test-support.js";
import { compileOpenHouseDraft } from "../../../server/open-house-draft.js";
import { PersistedCampaignScreen } from "./persisted-campaign-screen.js";

describe("persisted campaign approval screen", () => {
  it("keeps approval unavailable for creators and shows evidence before enabling approvers", async () => {
    const compiled = await compileOpenHouseDraft(
      OPEN_HOUSE_DRAFT_INPUT,
      createLocalSyntheticPrincipal(),
      LOCAL_SYNTHETIC_ENV,
    );
    const record = {
      version: compiled.version,
      preflight: compiled.preflight,
      state: "awaiting_approval" as const,
      rowVersion: 1,
      updatedAt: compiled.version.createdAt,
    };
    const creatorView = projectCampaignWorkspace(
      record,
      createLocalSyntheticPrincipal(),
      "filesystem",
    );

    const { unmount } = render(<PersistedCampaignScreen campaign={creatorView} />);
    // PRD-006b D5 and D2. The rule is unchanged and the role tokens never reach the screen.
    expect(
      screen.getByText("Only an approver or your workspace owner can approve a campaign."),
    ).toBeInTheDocument();
    expect(screen.getAllByText("An approver or the workspace owner").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Approve this version" })).toBeDisabled();
    // PRD-006b D8. The version reference is kept, under a plain label, inside the support region.
    expect(screen.getAllByText(compiled.version.campaignVersionRef).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Details for support").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Version ID").length).toBeGreaterThan(0);
    unmount();

    const approverView = projectCampaignWorkspace(
      record,
      {
        ...createLocalSyntheticPrincipal(),
        role: "campaign_approver",
        actorRef: "principal_localApprover001",
        actorId: "00000000-0000-4000-8000-000000000812",
      },
      "postgres",
    );
    render(<PersistedCampaignScreen campaign={approverView} />);
    expect(screen.getByRole("button", { name: "Approve this version" })).toBeEnabled();
    expect(
      screen.getByText(
        "Approval applies to this exact version. If you change the campaign, the new version needs its own approval.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(/Dallas-Fort Worth/)).toBeInTheDocument();
    expect(screen.getByText("Saved")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Saved to your workspace. This campaign won't run as an ad yet: HighLevel and Meta aren't connected.",
      ),
    ).toBeInTheDocument();
  });
});
