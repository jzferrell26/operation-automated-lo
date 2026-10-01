import { render, screen, within } from "@testing-library/react";
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
import { GUIDED_SETUP_ANCHORS } from "../../guided-setup/anchor-registry.js";
import {
  APPROVER,
  awaitingApprovalProjection,
  approvedProjection,
  sentBackProjection,
  needsChangesProjection,
} from "./campaign-decision.test-support.js";
import { PersistedCampaignScreen } from "./persisted-campaign-screen.js";

// The approval card refreshes the page after a decision (PRD-008b D2), so it needs an app router.
vi.mock("next/navigation.js", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

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
      ...(await awaitingApprovalProjection()),
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
    expect(screen.getByRole("region", { name: "Who decided" })).toHaveTextContent(
      "Approved by an approver",
    );
    // A decision was recorded, but it was not a send-back, so the send-back sentence stays out.
    expect(screen.queryByText(/It was sent back for changes/u)).toBeNull();
    expect(screen.getByRole("heading", { name: "Checks passed" })).toBeInTheDocument();
  });

  it("still says an awaiting campaign is ready for approval", async () => {
    render(<PersistedCampaignScreen campaign={await awaitingApprovalProjection()} />);

    expect(screen.getAllByText("Ready for approval").length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "Ready for approval" })).toBeInTheDocument();
    expect(screen.getByText(/An approver can sign off on it now/u)).toBeInTheDocument();
    expect(screen.getByText("Approve this version.")).toBeInTheDocument();
    // Nobody has decided, so nothing here may say a decision was made.
    expect(screen.queryByText(/sent back/iu)).toBeNull();
    expect(screen.queryByRole("region", { name: "Who decided" })).toBeNull();
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
      render(<PersistedCampaignScreen campaign={await sentBackProjection()} />);

      expect(screen.queryAllByText("Ready for approval")).toHaveLength(0);
      expect(screen.queryByRole("heading", { name: "Ready for approval" })).toBeNull();
      expect(screen.getByRole("heading", { name: "Checks passed" })).toBeInTheDocument();
    });

    it("says in the badge and in where it stands that it was sent back", async () => {
      render(<PersistedCampaignScreen campaign={await sentBackProjection()} />);

      // The header badge and the "Where it stands" card, as exact phrases on their own.
      expect(screen.getAllByText("Sent back for changes")).toHaveLength(2);
      expect(screen.getByRole("region", { name: "Who decided" })).toHaveTextContent(
        "Sent back for changes by an approver",
      );
    });

    it("no longer says an approver can sign off, and says what it needs instead", async () => {
      render(<PersistedCampaignScreen campaign={await sentBackProjection()} />);

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
        render(<PersistedCampaignScreen campaign={await sentBackProjection(principal)} />);

        const nextSteps = screen.getByRole("region", { name: "Your next steps" });
        expect(nextSteps).not.toHaveTextContent("Approve this version.");
        expect(nextSteps).not.toHaveTextContent("Waiting for an approver");
        expect(nextSteps).toHaveTextContent("Someone has already decided on this version.");
      },
    );

    it("keeps the approve control blocked and says what was recorded", async () => {
      render(<PersistedCampaignScreen campaign={await sentBackProjection()} />);

      expect(screen.getByRole("button", { name: "Approve this version" })).toBeDisabled();
      expect(screen.queryByRole("button", { name: "Send back for changes" })).toBeNull();
      expect(
        screen.getByText(
          "Sent back for changes. The campaign creator can fix it and save a new version.",
        ),
      ).toBeInTheDocument();
    });
  });

  /**
   * Finding H1 of the 2026-10-01 writing re-review. A version whose checks need changes is not
   * approvable by anyone, so `canApprove` is false for an approver as well as for a creator. The
   * approve control tested the viewer's permission before it tested the checks, so it told an
   * approver "Only an approver or your workspace owner can approve a campaign" and told everyone to
   * send the page to one. Both are false for the person reading them: the reason is the checks, and
   * the person who can do something about it is whoever wrote the campaign.
   */
  describe("on a version whose checks need changes", () => {
    const PERMISSION = "Only an approver or your workspace owner can approve a campaign.";
    const SEND_IT_ON = "Send them this page and ask them to look at this version.";

    it.each([
      ["an approver", APPROVER],
      ["a campaign creator", createLocalSyntheticPrincipal()],
    ])("gives %s the checks as the reason, not their permission", async (_who, principal) => {
      const { container } = render(
        <PersistedCampaignScreen campaign={await needsChangesProjection(principal)} />,
      );
      const control = container.querySelector<HTMLElement>(
        `[data-tour="${GUIDED_SETUP_ANCHORS.campaignApproveControl}"]`,
      );
      if (control === null) throw new Error("The approve control has no card around it.");

      expect(screen.queryByText(PERMISSION)).toBeNull();
      expect(screen.queryByText(SEND_IT_ON)).toBeNull();
      expect(
        within(control).getByText("This version needs changes before anyone can approve it."),
      ).toBeInTheDocument();
      expect(
        within(control).getByText("Fix what the checks found, then save it again."),
      ).toBeInTheDocument();
      expect(within(control).getByRole("button", { name: "Approve this version" })).toBeDisabled();
    });
  });

  /**
   * Finding R3, with R1. The blocked control sends the reader to "the decision below", and the
   * section that says who decided is above the control, not below it. That section was headed "Who
   * signed off", which is not what a send-back is, so it is headed "Who decided" and the control
   * points at it.
   */
  it.each([
    ["approved", approvedProjection],
    ["sent back", sentBackProjection],
  ] as const)(
    "points a version that was %s at the section above that says who decided",
    async (_outcome, project) => {
      render(<PersistedCampaignScreen campaign={await project()} />);

      expect(
        screen.getByText("Read who decided, above. Nothing else happens from this page."),
      ).toBeInTheDocument();
      expect(screen.queryByText(/Read the decision below/u)).toBeNull();
      expect(screen.getByRole("region", { name: "Who decided" })).toBeInTheDocument();
      expect(screen.queryByRole("region", { name: "Who signed off" })).toBeNull();
    },
  );
});
