import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { createLocalSyntheticPrincipal } from "../../../server/authenticated-principal.js";
import { GUIDED_SETUP_ANCHORS } from "../../guided-setup/anchor-registry.js";
import {
  APPROVER,
  approvedProjection,
  awaitingApprovalProjection,
  needsChangesProjection,
  sentBackProjection,
} from "./campaign-decision.test-support.js";
import { PersistedCampaignScreen } from "./persisted-campaign-screen.js";

/**
 * PRD-008b 008B-AC-010, the approver hand-off card.
 *
 * The card tells somebody who cannot approve to copy the campaign's link and send it to an
 * approver. That is a step on a version nobody has decided on. On a version that was approved, or
 * sent back, there is nothing for an approver to do with the link, so the card said something that
 * is not true. It used to render whenever the viewer could not approve, which on an approved
 * version meant for everybody, approvers and the workspace owner included, because the approval
 * rule also needs the campaign to be waiting.
 */

vi.mock("next/navigation.js", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const CREATOR = createLocalSyntheticPrincipal();

const HAND_OFF_WORDS =
  "Only an approver or your workspace owner can approve. Copy this link and send it to them.";

function renderCampaign(campaign: Awaited<ReturnType<typeof awaitingApprovalProjection>>) {
  return render(<PersistedCampaignScreen campaign={campaign} />);
}

function handOffAnchors(container: HTMLElement): number {
  return container.querySelectorAll(`[data-tour="${GUIDED_SETUP_ANCHORS.campaignHandoffLink}"]`)
    .length;
}

describe("the approver hand-off card on a version nobody has decided on", () => {
  it("is offered to a creator, who cannot approve", async () => {
    const { container } = renderCampaign(await awaitingApprovalProjection(CREATOR));

    expect(screen.getByText(HAND_OFF_WORDS)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy link" })).toBeInTheDocument();
    expect(handOffAnchors(container)).toBe(1);
  });

  it("is not offered to an approver, who can approve it themselves", async () => {
    const { container } = renderCampaign(await awaitingApprovalProjection(APPROVER));

    expect(screen.queryByText(/Copy this link and send it to them/u)).toBeNull();
    expect(screen.queryByRole("button", { name: "Copy link" })).toBeNull();
    expect(handOffAnchors(container)).toBe(0);
  });
});

describe.each([
  ["approved", approvedProjection],
  ["sent back", sentBackProjection],
] as const)("the approver hand-off card on a version that was %s", (_outcome, project) => {
  it.each([
    ["a creator", CREATOR],
    ["an approver", APPROVER],
  ])("is not offered to %s, because there is nothing left to hand off", async (_who, principal) => {
    const { container } = renderCampaign(await project(principal));

    expect(screen.queryByText(/Copy this link and send it to them/u)).toBeNull();
    expect(screen.queryByText(/Only an approver or your workspace owner can approve/u)).toBeNull();
    expect(screen.queryByRole("button", { name: "Copy link" })).toBeNull();
    expect(handOffAnchors(container)).toBe(0);
  });

  it("leaves the control that says what was recorded, with its walkthrough anchor", async () => {
    const { container } = renderCampaign(await project(CREATOR));

    expect(screen.getByRole("button", { name: "Approve this version" })).toBeDisabled();
    expect(
      container.querySelectorAll(`[data-tour="${GUIDED_SETUP_ANCHORS.campaignApproveControl}"]`),
    ).toHaveLength(1);
  });
});

/**
 * PRD-008b 008B-AC-011. The card is for a version that is waiting for an approver. One whose checks
 * need changes is waiting for its author, and nothing about it can be approved yet, so asking
 * somebody to send the link to an approver would send them to a person who has nothing to do. It
 * used to render for everybody who could not approve, which for this version meant everybody.
 */
describe("the approver hand-off card on a version whose checks need changes", () => {
  it.each([
    ["a creator", CREATOR],
    ["an approver", APPROVER],
  ])(
    "is not offered to %s, because nothing about it can be approved yet",
    async (_who, principal) => {
      const { container } = renderCampaign(await needsChangesProjection(principal));

      expect(screen.queryByText(/Copy this link and send it to them/u)).toBeNull();
      expect(screen.queryByRole("button", { name: "Copy link" })).toBeNull();
      expect(handOffAnchors(container)).toBe(0);
      // The page still says plainly where it stands, and the approve control stays blocked.
      expect(screen.getByRole("heading", { name: "Needs changes" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Approve this version" })).toBeDisabled();
    },
  );
});
