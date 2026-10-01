import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  deriveCampaignNextActions,
  projectCampaignWorkspace,
  type AuthenticatedPrincipal,
  type CampaignWorkspaceProjection,
} from "@oalo/application";
import { ApprovalDecisionSchema } from "@oalo/contracts";

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

/**
 * The same draft after somebody pressed "Send back for changes".
 *
 * A send-back does not move the campaign out of `awaiting_approval`: the approval command records
 * the decision and sets the state to `awaiting_approval` again (`campaign-approval-command.ts`,
 * `toState`). The only thing on the record that says it happened is the decision, so the view is
 * built through the real projection with that decision attached, the way the page reads it after
 * the refresh.
 */
async function sentBackView(
  principal: AuthenticatedPrincipal = APPROVER,
): Promise<CampaignWorkspaceProjection> {
  const compiled = await compileOpenHouseDraft(
    OPEN_HOUSE_DRAFT_INPUT,
    createLocalSyntheticPrincipal(),
    LOCAL_SYNTHETIC_ENV,
  );
  const { artifacts } = compiled.version.manifest;
  return projectCampaignWorkspace(
    {
      version: compiled.version,
      preflight: compiled.preflight,
      state: "awaiting_approval" as const,
      rowVersion: 2,
      updatedAt: compiled.version.createdAt,
      approval: ApprovalDecisionSchema.parse({
        schemaVersion: 1,
        approvalRef: "approval_sentBack001",
        locationRef: compiled.version.locationRef,
        campaignRef: compiled.version.campaignRef,
        campaignVersionRef: compiled.version.campaignVersionRef,
        manifestHash: compiled.version.manifestHash,
        preflightResultHash: compiled.preflight.resultHash,
        actorRef: "principal_localApprover001",
        actorKind: "human",
        actorRole: "approver",
        decidedAt: "2026-10-01T12:00:00.000Z",
        ipAuditHash: "e".repeat(64),
        decision: "rejected",
        snapshot: {
          pageVersionRef: artifacts.pageVersionRef,
          pdfVersionRef: artifacts.pdfVersionRef,
          creativeVersionRef: artifacts.creativeVersionRef,
          copyVersionRef: artifacts.copyVersionRef,
          emailPackageVersionRef: artifacts.emailPackageVersionRef,
          smsPackageVersionRef: artifacts.smsPackageVersionRef,
          disclosureVersionRef: artifacts.disclosureVersionRef,
          targetingHash: "1".repeat(64),
          budgetHash: "2".repeat(64),
          datesHash: "3".repeat(64),
          formVersionRef: artifacts.formVersionRef,
          destinationVersionRef: artifacts.destinationVersionRef,
        },
      }),
    },
    principal,
    "postgres",
  );
}

const SENT_BACK_NEEDS_NEW_VERSION =
  "It was sent back for changes, so it needs a new version before anyone can approve it.";

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
    // A decision was recorded, but it was not a send-back, so the send-back sentence stays out.
    expect(screen.queryByText(/It was sent back for changes/u)).toBeNull();
    expect(screen.getByRole("heading", { name: "Checks passed" })).toBeInTheDocument();
  });

  it("still says an awaiting campaign is ready for approval", async () => {
    render(<PersistedCampaignScreen campaign={await awaitingApprovalView()} />);

    expect(screen.getAllByText("Ready for approval").length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "Ready for approval" })).toBeInTheDocument();
    expect(screen.getByText(/An approver can sign off on it now/u)).toBeInTheDocument();
    expect(screen.getByText("Approve this version.")).toBeInTheDocument();
    // Nobody has decided, so nothing here may say a decision was made.
    expect(screen.queryByText(/sent back/iu)).toBeNull();
    expect(screen.queryByRole("region", { name: "Who signed off" })).toBeNull();
  });

  /**
   * Finding S1b (B5 and B6) of the 2026-10-01 writing review. After "Send back for changes" the
   * campaign stays in `awaiting_approval`, so a screen that keys only on the state keeps saying
   * "Ready for approval" and "An approver can sign off on it now" about a version that was just
   * sent back, beside an Approval section that says it was sent back and a control that says
   * someone has already decided. The state badge and the next-steps card share the cause.
   */
  describe("after the version was sent back for changes", () => {
    it("never says the campaign is ready for approval, in the badge, the card, or the heading", async () => {
      render(<PersistedCampaignScreen campaign={await sentBackView()} />);

      expect(screen.queryAllByText("Ready for approval")).toHaveLength(0);
      expect(screen.queryByRole("heading", { name: "Ready for approval" })).toBeNull();
      expect(screen.getByRole("heading", { name: "Checks passed" })).toBeInTheDocument();
    });

    it("says in the badge and in where it stands that it was sent back", async () => {
      render(<PersistedCampaignScreen campaign={await sentBackView()} />);

      // The header badge and the "Where it stands" card, as exact phrases on their own.
      expect(screen.getAllByText("Sent back for changes")).toHaveLength(2);
      expect(screen.getByRole("region", { name: "Who signed off" })).toHaveTextContent(
        "Sent back for changes by an approver",
      );
    });

    it("no longer says an approver can sign off, and says what it needs instead", async () => {
      render(<PersistedCampaignScreen campaign={await sentBackView()} />);

      expect(screen.queryByText(/An approver can sign off on it now/u)).toBeNull();
      expect(screen.getByText(/This campaign meets every rule we check\./u)).toHaveTextContent(
        `This campaign meets every rule we check. ${SENT_BACK_NEEDS_NEW_VERSION}`,
      );
    });

    it.each([
      ["an approver", APPROVER],
      ["a campaign creator", createLocalSyntheticPrincipal()],
    ])(
      "does not offer approval, or wait for an approver, as a next step for %s",
      async (_who, principal) => {
        render(<PersistedCampaignScreen campaign={await sentBackView(principal)} />);

        const nextSteps = screen.getByRole("region", { name: "Your next steps" });
        expect(nextSteps).not.toHaveTextContent("Approve this version.");
        expect(nextSteps).not.toHaveTextContent("Waiting for an approver");
        expect(nextSteps).toHaveTextContent("Someone has already decided on this version.");
      },
    );

    it("keeps the approve control blocked and says what was recorded", async () => {
      render(<PersistedCampaignScreen campaign={await sentBackView()} />);

      expect(screen.getByRole("button", { name: "Approve this version" })).toBeDisabled();
      expect(screen.queryByRole("button", { name: "Send back for changes" })).toBeNull();
      expect(
        screen.getByText(
          "Sent back for changes. The campaign creator can fix it and save a new version.",
        ),
      ).toBeInTheDocument();
    });
  });
});
