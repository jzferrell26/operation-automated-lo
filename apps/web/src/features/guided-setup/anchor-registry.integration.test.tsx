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
  SHELL_SURFACE,
  anchorSelector,
  guidedSetupAnchorIds,
  requiredAnchorsForRoute,
  type GuidedSetupAnchorId,
} from "./anchor-registry.js";
import { GuidedSetupShellControls } from "./guided-setup-progress.js";
import { GuidedSetupProvider } from "./guided-setup-provider.js";
import { complete, initialGuidedSetupProgress } from "./model/progress.js";
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

const SERVER_NOW = "2026-09-19T12:00:00.000Z";

function renderInsideTheProvider(
  progress: ReturnType<typeof initialGuidedSetupProgress>,
  children = <div />,
) {
  return render(
    <GuidedSetupProvider
      canApprove
      enabled
      initialProfile={undefined}
      initialProgress={progress}
      serverNowIso={SERVER_NOW}
      sessionDisplayName="Dana Reyes"
      sessionWorkspaceName="Northgate Lending"
    >
      {children}
    </GuidedSetupProvider>,
  );
}

function renderPanelAt(step: number) {
  return renderInsideTheProvider(progressAt(step));
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

  /**
   * 006C-AC-002's shell half, which was a claim about the registry until 2026-09-20.
   *
   * `shell.help.menu` used to be excused with an assertion that its registry row named a route,
   * which is a fact about this file rather than about any screen: the element could have been
   * deleted and the row would still have had a route. The shell's controls are rendered here, the
   * way the layout renders them, and the anchor has to be on exactly one element.
   *
   * The walkthrough is finished in this render so the panel is shut, which is the state the shell
   * is in whenever somebody uses the help menu to start again.
   */
  it("renders every required shell anchor exactly once", () => {
    const { container } = renderInsideTheProvider(
      complete(initialGuidedSetupProgress(), new Date(SERVER_NOW)),
      <GuidedSetupShellControls />,
    );
    const required = requiredAnchorsForRoute(SHELL_SURFACE);
    expect(required).toContain("shell.help.menu");
    for (const anchor of required) {
      expect(countAnchors(container, anchor), anchor).toBe(1);
    }
  });

  it("covers every registry entry with a rendering proof or a stated reason", () => {
    const provenElsewhere: readonly GuidedSetupAnchorId[] = [
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
