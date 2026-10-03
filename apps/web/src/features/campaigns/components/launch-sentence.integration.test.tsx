import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { homeChecklistActionName } from "../../../copy/home-messages.js";
import { LAUNCH_SENTENCES } from "../../../copy/launch-messages.js";
import type { LaunchState } from "../launch-model.js";
import { CampaignHeaderActions } from "./campaign-header-actions.js";
import { LaunchOnFacebook } from "./launch-on-facebook.js";

/**
 * Writing review pass 2, W-25. The one sentence tied to "Launch on Facebook" is drawn by step 3 and
 * by the campaign page's header. It is drawn by one component, so the link's words, and the words
 * around it, cannot drift between the two screens.
 */

const STATES: readonly Readonly<[string, LaunchState]>[] = [
  [
    "Meta not connected",
    { metaConnected: false, retiredOn: null, approved: false, launchingTurnedOn: false },
  ],
  [
    "the ad retired",
    { metaConnected: true, retiredOn: "Oct 1, 2026", approved: true, launchingTurnedOn: false },
  ],
  [
    "not approved",
    { metaConnected: true, retiredOn: null, approved: false, launchingTurnedOn: false },
  ],
  [
    "launching not turned on",
    { metaConnected: true, retiredOn: null, approved: true, launchingTurnedOn: false },
  ],
];

function sentenceOf(button: HTMLElement): HTMLElement {
  const id = button.getAttribute("aria-describedby") ?? "";
  const sentence = document.getElementById(id);
  if (sentence === null) throw new Error("The launch button has no sentence tied to it.");
  return sentence;
}

describe("the launch sentence, drawn once for step 3 and the campaign page", () => {
  it.each(STATES)("reads the same on both screens when %s", (_label, state) => {
    const retiredDay = state.retiredOn === null ? undefined : "2026-10-01";
    const step = render(<LaunchOnFacebook retiredDateTime={retiredDay} state={state} />);
    const stepSentence = sentenceOf(screen.getByRole("button", { name: "Launch on Facebook" }));
    const stepHtml = stepSentence.innerHTML;
    step.unmount();

    render(
      <CampaignHeaderActions
        launch={state}
        makeNewVersionHref={undefined}
        retiredOnDay={retiredDay ?? null}
      />,
    );
    const pageSentence = sentenceOf(screen.getByRole("button", { name: "Launch on Facebook" }));

    expect(pageSentence.innerHTML).toBe(stepHtml);
  });

  it("says launching is off and Meta is needed, in one sentence with one link to the connections page", () => {
    render(
      <CampaignHeaderActions
        launch={{
          metaConnected: false,
          retiredOn: null,
          approved: true,
          launchingTurnedOn: false,
        }}
        makeNewVersionHref={undefined}
        retiredOnDay={null}
      />,
    );
    const button = screen.getByRole("button", { name: "Launch on Facebook" });
    expect(button).toHaveAccessibleDescription(
      "Launching on Facebook isn't turned on yet, and it needs Meta connected. See what's needed for Meta.",
    );
    const link = within(sentenceOf(button)).getByRole("link", {
      name: "See what's needed for Meta",
    });
    expect(link).toHaveAttribute("href", "/settings/connections");
    // A link inside a running sentence takes the sentence's size (R2 F-4), not the 16px body step.
    expect(link).toHaveAttribute("data-variant", "sentence");
  });

  it("uses the link words Home uses, so one fact has one voice", () => {
    expect(LAUNCH_SENTENCES.metaNotConnected.link).toBe(
      homeChecklistActionName("meta", "not_connected"),
    );
  });

  it("never tells a person that connecting Meta is a step they can take, or that it is enough", () => {
    const { before, link, after } = LAUNCH_SENTENCES.metaNotConnected;
    const sentence = `${before}${link}${after}`;
    expect(sentence).not.toMatch(/connect it in Settings/iu);
    expect(sentence).not.toMatch(/once it's connected/iu);
    expect(sentence).toMatch(/isn't turned on yet/u);
    expect(LAUNCH_SENTENCES.notTurnedOn).toBe(
      "Launching on Facebook isn't turned on yet. Nothing has been published.",
    );
    expect(LAUNCH_SENTENCES.notTurnedOn).not.toMatch(/for your workspace/u);
  });
});
