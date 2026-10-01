import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  deriveCampaignNextActions,
  projectCampaignWorkspace,
  type CampaignWorkspaceProjection,
} from "@oalo/application";

import { createLocalSyntheticPrincipal } from "../../../server/authenticated-principal.js";
import {
  LOCAL_SYNTHETIC_ENV,
  OPEN_HOUSE_DRAFT_INPUT,
} from "../../../server/campaign-command-test-support.js";
import { compileOpenHouseDraft } from "../../../server/open-house-draft.js";
import { PersistedCampaignScreen } from "./persisted-campaign-screen.js";

// The approval card refreshes the page after a decision (PRD-008b D2), so it needs an app router.
vi.mock("next/navigation.js", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const APPROVER = {
  ...createLocalSyntheticPrincipal(),
  role: "campaign_approver" as const,
  actorRef: "principal_localApprover001",
  actorId: "00000000-0000-4000-8000-000000000812",
};

/** A fresh draft, read the way an approver reads it before anyone has decided. */
async function awaitingApprovalView(): Promise<CampaignWorkspaceProjection> {
  const compiled = await compileOpenHouseDraft(
    OPEN_HOUSE_DRAFT_INPUT,
    createLocalSyntheticPrincipal(),
    LOCAL_SYNTHETIC_ENV,
  );
  return projectCampaignWorkspace(
    {
      version: compiled.version,
      preflight: compiled.preflight,
      state: "awaiting_approval" as const,
      rowVersion: 1,
      updatedAt: compiled.version.createdAt,
    },
    APPROVER,
    "postgres",
  );
}

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

  /**
   * PRD-008b 008B-AC-006, the server-rendered half of it. After an approval the card says what was
   * recorded, and the page the refresh re-reads must stop saying the campaign is ready for approval,
   * stop saying an approver can sign off on it, and stop offering the approval as a next step.
   */
  it("stops saying an approved campaign is ready for approval", async () => {
    const approved: CampaignWorkspaceProjection = {
      ...(await awaitingApprovalView()),
      state: "approved",
      rowVersion: 2,
      approval: {
        decision: "approved",
        decidedAt: "2026-10-01T12:00:00.000Z",
        actorRole: "approver",
      },
      canApprove: false,
      nextActions: deriveCampaignNextActions("approved", false),
    };

    render(<PersistedCampaignScreen campaign={approved} />);

    expect(screen.queryByText("Ready for approval")).toBeNull();
    expect(screen.queryByText(/An approver can sign off on it now/u)).toBeNull();
    expect(screen.queryByText("Approve this version.")).toBeNull();
    expect(screen.getAllByText("Approved").length).toBeGreaterThan(0);
    expect(screen.getByRole("region", { name: "Who signed off" })).toHaveTextContent(
      "Approved by an approver",
    );
  });

  it("still says an awaiting campaign is ready for approval", async () => {
    render(<PersistedCampaignScreen campaign={await awaitingApprovalView()} />);

    expect(screen.getAllByText("Ready for approval").length).toBeGreaterThan(0);
    expect(screen.getByText(/An approver can sign off on it now/u)).toBeInTheDocument();
    expect(screen.getByText("Approve this version.")).toBeInTheDocument();
  });
});
