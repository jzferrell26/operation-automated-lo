import { describe, expect, it } from "vitest";

import {
  APPROVER,
  approvedProjection,
  awaitingApprovalProjection,
  sentBackProjection,
} from "../features/campaigns/components/campaign-decision.test-support.js";
import { createLocalSyntheticPrincipal } from "./authenticated-principal.js";
import { campaignResultFrom, selectCampaignAwaitingDecision } from "./setup-preferences.js";

/**
 * PRD-008b 008B-AC-010, the server's half of the guided setup.
 *
 * The walkthrough hands an approver "the campaign waiting for their decision". The application
 * layer's `canApprove` answers a narrower question, which is whether the approval command would
 * accept a decision right now, and it stays true for a version that was sent back, because a
 * send-back leaves the campaign in the waiting state. So the pick cannot stand on `canApprove`
 * alone: it also asks that nobody has decided. `canApprove` keeps its meaning, because the approval
 * card is drawn from it.
 */

const OLDER = "2026-10-01T09:00:00.000Z";
const NEWER = "2026-10-01T10:00:00.000Z";
const NEWEST = "2026-10-01T11:00:00.000Z";

describe("the campaign an approver is handed", () => {
  it("is not told apart by canApprove, which stays true for a version that was sent back", async () => {
    expect((await sentBackProjection()).canApprove).toBe(true);
    expect((await awaitingApprovalProjection()).canApprove).toBe(true);
  });

  it("is the newest campaign nobody has decided on", async () => {
    const waiting = { ...(await awaitingApprovalProjection()), updatedAt: OLDER };
    const alsoWaiting = {
      ...(await awaitingApprovalProjection()),
      campaignRef: "campaign_newerWaiting001",
      updatedAt: NEWER,
    };

    expect(selectCampaignAwaitingDecision([waiting, alsoWaiting])).toBe(alsoWaiting);
    expect(selectCampaignAwaitingDecision([alsoWaiting, waiting])).toBe(alsoWaiting);
  });

  it("is never a version that was sent back or approved, however new it is", async () => {
    const waiting = { ...(await awaitingApprovalProjection()), updatedAt: OLDER };
    const sentBack = {
      ...(await sentBackProjection()),
      campaignRef: "campaign_sentBack001",
      updatedAt: NEWER,
    };
    const approved = {
      ...(await approvedProjection()),
      campaignRef: "campaign_approved001",
      updatedAt: NEWEST,
    };

    expect(selectCampaignAwaitingDecision([approved, sentBack, waiting])).toBe(waiting);
  });

  it("is nothing when every campaign has a decision on it, so nothing claims one is waiting", async () => {
    expect(
      selectCampaignAwaitingDecision([await sentBackProjection(), await approvedProjection()]),
    ).toBeUndefined();
    expect(selectCampaignAwaitingDecision([])).toBeUndefined();
  });

  it("is nothing for somebody the approval command would refuse", async () => {
    const creatorsView = await awaitingApprovalProjection(createLocalSyntheticPrincipal());

    expect(creatorsView.canApprove).toBe(false);
    expect(selectCampaignAwaitingDecision([creatorsView])).toBeUndefined();
    expect(APPROVER.role).toBe("campaign_approver");
  });
});

describe("what the walkthrough is told about a campaign", () => {
  it("carries the recorded decision, so step 6 can say what happened", async () => {
    expect(campaignResultFrom(await approvedProjection()).decision).toBe("approved");
    expect(campaignResultFrom(await sentBackProjection()).decision).toBe("rejected");
  });

  it("carries no decision for a version nobody has decided on, and keeps the shape it always had", async () => {
    const result = campaignResultFrom(await awaitingApprovalProjection());

    expect(Object.keys(result).toSorted()).toEqual([
      "campaignRef",
      "detailHref",
      "findings",
      "ready",
    ]);
    expect(result.decision).toBeUndefined();
  });

  it("still holds back the rule codes and the decision's own details", async () => {
    const result = campaignResultFrom(await sentBackProjection());

    expect(Object.keys(result).toSorted()).toEqual([
      "campaignRef",
      "decision",
      "detailHref",
      "findings",
      "ready",
    ]);
    expect(JSON.stringify(result)).not.toMatch(/ruleCode|actorRole|decidedAt|approver/u);
  });
});
