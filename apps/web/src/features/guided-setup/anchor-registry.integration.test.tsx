import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { OpenHouseDraftBuilder } from "../campaigns/components/open-house-draft-builder.js";
import { PersistedCampaignScreen } from "../campaigns/components/persisted-campaign-screen.js";
import { OnboardingScreen } from "../onboarding/components/onboarding-screen.js";
import { OverviewScreen } from "../overview/components/overview-screen.js";
import { loadSyntheticUiFixture } from "../ui-foundation/data/load-synthetic-ui.js";
import {
  GUIDED_SETUP_ANCHOR_REGISTRY,
  GUIDED_SETUP_PANEL_SURFACE,
  anchorSelector,
  guidedSetupAnchorIds,
  requiredAnchorsForRoute,
  type GuidedSetupAnchorId,
} from "./anchor-registry.js";
import { GuidedSetupProvider } from "./guided-setup-provider.js";
import { campaignProjection, progressAt } from "./guided-setup.test-support.js";

vi.mock("next/navigation.js", () => ({
  usePathname: () => "/overview",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

/**
 * PRD-006c D2 and 006C-AC-002, the rendering half.
 *
 * Every screen the registry names is rendered through the same harness the screen's own suite
 * uses, and each anchor the registry marks `required` has to be present exactly once. Exactly
 * once matters as much as present: two elements carrying the same id means the step points at
 * whichever the browser found first, which is a bug that only shows up on one screen size.
 *
 * The panel's three anchors are covered by rendering the provider at the step that owns each one,
 * because that is where they render. An anchor with nowhere to be proven would be an anchor the
 * registry could keep claiming after the element was deleted.
 */

function countAnchors(container: HTMLElement, anchor: GuidedSetupAnchorId): number {
  return container.querySelectorAll(anchorSelector(anchor)).length;
}

function renderPanelAt(step: number) {
  return render(
    <GuidedSetupProvider
      canApprove
      enabled
      initialProfile={undefined}
      initialProgress={progressAt(step)}
      serverNowIso="2026-09-19T12:00:00.000Z"
      sessionDisplayName="Dana Reyes"
      sessionWorkspaceName="Northgate Lending"
    >
      <div />
    </GuidedSetupProvider>,
  );
}

describe("guided setup anchors on the screens the registry names", () => {
  it("renders every required overview anchor exactly once", () => {
    const fixture = loadSyntheticUiFixture();
    const { container } = render(
      <OverviewScreen overview={fixture.overview} session={fixture.session} />,
    );
    for (const anchor of requiredAnchorsForRoute("/overview")) {
      expect(countAnchors(container, anchor), anchor).toBe(1);
    }
  });

  it("renders every required create-campaign anchor exactly once", () => {
    const { container } = render(<OpenHouseDraftBuilder />);
    for (const anchor of requiredAnchorsForRoute("/marketing/campaigns/new")) {
      expect(countAnchors(container, anchor), anchor).toBe(1);
    }
  });

  it("renders every required campaign anchor exactly once", async () => {
    const { container } = render(<PersistedCampaignScreen campaign={await campaignProjection()} />);
    for (const anchor of requiredAnchorsForRoute("/marketing/campaigns")) {
      expect(countAnchors(container, anchor), anchor).toBe(1);
    }
  });

  it("renders the hand-off anchor only for someone who cannot approve", async () => {
    const approver = render(
      <PersistedCampaignScreen campaign={await campaignProjection("campaign_approver")} />,
    );
    expect(countAnchors(approver.container, "campaign.handoff.link")).toBe(0);
    approver.unmount();

    const creator = render(
      <PersistedCampaignScreen campaign={await campaignProjection("campaign_creator")} />,
    );
    expect(countAnchors(creator.container, "campaign.handoff.link")).toBe(1);
  });

  it("renders every required onboarding anchor exactly once", () => {
    const fixture = loadSyntheticUiFixture();
    const { container } = render(
      <OnboardingScreen onboarding={fixture.onboarding} session={fixture.session} />,
    );
    for (const anchor of requiredAnchorsForRoute("/onboarding")) {
      expect(countAnchors(container, anchor), anchor).toBe(1);
    }
  });

  it.each([
    [2, "setup.details.form"],
    [3, "setup.realtor.form"],
    [7, "setup.done"],
  ] as const)("renders %s's panel anchor %s exactly once", (step, anchor) => {
    const { container } = renderPanelAt(step);
    expect(countAnchors(container, anchor)).toBe(1);
    // Each panel anchor belongs to exactly one step, so the other two must be absent.
    for (const other of requiredAnchorsForRoute(GUIDED_SETUP_PANEL_SURFACE)) {
      if (other === anchor) continue;
      expect(countAnchors(container, other), other).toBe(0);
    }
  });

  it("covers every registry entry with a rendering proof or a stated reason", () => {
    const provenElsewhere: readonly GuidedSetupAnchorId[] = [
      // The shell controls render inside the provider, which the shell-controls suite drives.
      "shell.help.menu",
      // Optional by design: present only inside the seven-day window after a dismissal.
      "shell.finish-setup.chip",
      // Optional by design: only a user who cannot approve ever sees it, proven above.
      "campaign.handoff.link",
    ];
    for (const anchor of guidedSetupAnchorIds()) {
      const record = GUIDED_SETUP_ANCHOR_REGISTRY[anchor];
      if (provenElsewhere.includes(anchor)) {
        expect(record.route.length).toBeGreaterThan(0);
        continue;
      }
      expect(record.required, anchor).toBe(true);
    }
  });
});
