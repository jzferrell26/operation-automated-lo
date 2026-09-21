import { render, screen, waitFor, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { useState, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  GUIDED_SETUP_CONTROLS,
  GUIDED_SETUP_STEPS,
  GUIDED_SETUP_TOTAL_STEPS,
} from "../../copy/guided-setup-messages.js";
import {
  CHECK_RESULT_READY,
  NOT_CONNECTED_SOURCE,
  SUPPORT_DETAILS_LABELS,
  SUPPORT_REFERENCE_NOT_RECORDED,
} from "../../copy/user-language.js";
import { SUPPORT_REFERENCE_HEADER } from "../http/internal-api.js";
import { OpenHouseDraftBuilder } from "../campaigns/components/open-house-draft-builder.js";
import { fillAndSaveOpenHouseDraft } from "../campaigns/components/open-house-draft.test-support.js";
import { anchorSelector, GUIDED_SETUP_ANCHORS } from "./anchor-registry.js";
import { GuidedSetupShellControls } from "./guided-setup-progress.js";
import { GuidedSetupProvider } from "./guided-setup-provider.js";
import { complete, dismiss, initialGuidedSetupProgress } from "./model/progress.js";
import { CAMPAIGN_FIELD_SEQUENCE } from "./steps/step-model.js";
import { userMessageSentence } from "../http/user-messages.js";
import type { SetupCampaignResult } from "./model/campaign-result.js";
import {
  blockedCampaignResult,
  heldProgressWriteFetch,
  NEEDS_CHANGES_PREFLIGHT_RESPONSE,
  progressAt,
  READY_PREFLIGHT_RESPONSE,
  recordingSetupFetch,
  SAMPLE_PROFILE,
  savedCampaignResult,
} from "./guided-setup.test-support.js";

const push = vi.fn();

vi.mock("next/navigation.js", () => ({
  usePathname: () => "/overview",
  useRouter: () => ({ push, replace: vi.fn() }),
}));

/**
 * PRD-006c D3, D5, and D6. What each step does, in both branches, and how it behaves for someone
 * using a keyboard or a screen reader.
 *
 * Every assertion here is about behaviour a user can observe: the words on the panel, where focus
 * went, what was announced, what was saved. None of it reaches into the provider's state, because
 * a test that asserts on state passes while the screen is broken.
 */

const SERVER_NOW = "2026-09-19T12:00:00.000Z";

type ProviderOptions = Readonly<{
  /** What a named address answers with, when echoing the posted body is not the right answer. */
  answers?: Readonly<Record<string, unknown>>;
  canApprove?: boolean;
  /**
   * The page under the provider. `<main />` stands in for it almost everywhere, because almost
   * every case here is about the panel. The two Wave 7m cases pass the real create screen, because
   * what they are about is what the walkthrough does to the page beneath it.
   */
  children?: ReactNode;
  enabled?: boolean;
  profile?: typeof SAMPLE_PROFILE | undefined;
  progress?: ReturnType<typeof initialGuidedSetupProgress>;
  /** The server's reading of the campaign the stored progress names, as the layout supplies it. */
  savedCampaign?: SetupCampaignResult | undefined;
  /** PRD-006c D5's other campaign: one waiting for this person's decision. */
  campaignAwaitingDecision?: SetupCampaignResult | undefined;
  /**
   * A `fetch` that answers differently from the recording one: held open, answering out of order,
   * refusing. The two F-23 cases supply their own; everything else uses the recorder and reads
   * `calls` from the returned view.
   */
  fetch?: typeof globalThis.fetch;
}>;

function renderSetup(options: ProviderOptions = {}) {
  const recorder = recordingSetupFetch(options.answers);
  vi.stubGlobal("fetch", options.fetch ?? recorder.fetch);
  const view = render(
    <GuidedSetupProvider
      campaignAwaitingDecision={options.campaignAwaitingDecision}
      canApprove={options.canApprove ?? true}
      enabled={options.enabled ?? true}
      initialProfile={options.profile}
      initialProgress={options.progress ?? initialGuidedSetupProgress()}
      savedCampaign={options.savedCampaign}
      serverNowIso={SERVER_NOW}
      sessionDisplayName="Dana Reyes"
      sessionWorkspaceName="Northgate Lending"
    >
      {/* The layout renders the shell controls beside the pages, so the harness does too. */}
      <GuidedSetupShellControls />
      {options.children ?? <main />}
    </GuidedSetupProvider>,
  );
  return { ...view, calls: recorder.calls };
}

function panel() {
  return screen.getByRole("dialog", { name: /.+/u });
}

/** The reference the setup routes put on every answer, as one of them would look. */
const SETUP_SUPPORT_REFERENCE = "correlation_setupProfile_4c8e12a06b5d9f37e1a2b3c4";

/**
 * The create screen filled in and saved. The Realtor field is left alone on purpose: the
 * walkthrough prefilled it two steps earlier, and leaving a value that is already right alone is
 * what a person does.
 */
function saveTheOpenHouseDraft(): void {
  fillAndSaveOpenHouseDraft();
}

/**
 * A page whose anchored element can be rebuilt on demand.
 *
 * A screen that remounts the card or the field a step points at hands the walkthrough a different
 * DOM node carrying the same `data-tour` id. That is a thing screens do: a card whose data
 * arrived, a group behind a `key` that changed, a route that rendered its fallback and then its
 * content. The generation attribute is how the case below tells the replacement from the original.
 */
function RebuildableQuickActions() {
  const [generation, setGeneration] = useState(0);
  return (
    <main>
      <button
        onClick={() => {
          setGeneration((current) => current + 1);
        }}
        type="button"
      >
        Rebuild the quick actions
      </button>
      <div
        data-generation={String(generation)}
        data-tour={GUIDED_SETUP_ANCHORS.setupWelcome}
        key={generation}
      >
        <a href="/marketing/campaigns/new">Create an Open House Boost</a>
      </div>
    </main>
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  push.mockReset();
});

describe("guided setup steps", () => {
  it("opens the welcome step on the first render, with no click and no effect", () => {
    renderSetup();
    expect(panel()).toHaveAccessibleName(GUIDED_SETUP_STEPS.welcome.title);
    expect(screen.getByText(GUIDED_SETUP_STEPS.welcome.body)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: GUIDED_SETUP_STEPS.welcome.primaryLabel }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: GUIDED_SETUP_CONTROLS.dismiss })).toBeInTheDocument();
  });

  /**
   * D6 and 006C-AC-010. The attribute is present and false, not absent.
   *
   * It used to be absent, which is also what a dialog whose author forgot looks like. Saying
   * `false` is the panel claiming its own behaviour: the page behind it stays reachable, Tab
   * leaves, and nothing locks the background scroll, because the person has to type into the
   * field the panel is pointing at.
   */
  it("is a non-modal dialog, so the page underneath stays reachable", () => {
    renderSetup();
    expect(panel()).toHaveAttribute("aria-modal", "false");
    expect(document.body.style.overflow).not.toBe("hidden");
  });

  it("names and describes itself, and announces the step politely", () => {
    renderSetup({ progress: progressAt(3) });
    const dialog = panel();
    expect(dialog).toHaveAccessibleName(GUIDED_SETUP_STEPS.realtorPartner.title);
    expect(dialog).toHaveAccessibleDescription(GUIDED_SETUP_STEPS.realtorPartner.body);
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent(
      `Step 3 of ${String(GUIDED_SETUP_TOTAL_STEPS)}: ${GUIDED_SETUP_STEPS.realtorPartner.title}`,
    );
    expect(status).toHaveAttribute("aria-live", "polite");
  });

  it("moves focus to the step's own title when the step opens", async () => {
    renderSetup();
    await waitFor(() => {
      expect(document.activeElement).toHaveTextContent(GUIDED_SETUP_STEPS.welcome.title);
    });
  });

  /**
   * D6's two focus movements, where they meet. A Continue that opens the next step is a step
   * opening, so focus goes to that step's heading.
   *
   * Until 2026-09-20 it was treated as the other movement: "Let's go" pointed at the overview's
   * quick actions, so pressing it put focus on a link in the page behind the panel while a screen
   * reader was being told about step 2. The review accessibility walk is what found it.
   */
  it("moves focus to the new step's title when Continue opens the next step", async () => {
    const user = userEvent.setup();
    renderSetup({
      children: (
        <main>
          <div data-tour={GUIDED_SETUP_ANCHORS.setupWelcome}>
            <button type="button">Create an Open House Boost</button>
          </div>
        </main>
      ),
    });
    await user.click(screen.getByRole("button", { name: GUIDED_SETUP_STEPS.welcome.primaryLabel }));

    await waitFor(() => {
      expect(document.activeElement).toHaveTextContent(GUIDED_SETUP_STEPS.yourDetails.title);
    });
  });

  it("shows where the user is out of seven", () => {
    renderSetup({ progress: progressAt(4) });
    const stepper = screen.getByRole("navigation", { name: "Guided setup progress" });
    expect(within(stepper).getByText("Step 4 of 7")).toBeInTheDocument();
    expect(within(stepper).getByRole("progressbar")).toHaveAttribute("aria-valuenow", "3");
  });

  it("keeps Continue disabled until the step's required fields are filled", async () => {
    const user = userEvent.setup();
    renderSetup({ progress: progressAt(3) });
    const continueButton = screen.getByRole("button", {
      name: GUIDED_SETUP_CONTROLS.continueLabel,
    });
    expect(continueButton).toBeDisabled();
    await user.type(
      screen.getByLabelText(GUIDED_SETUP_STEPS.realtorPartner.realtorNameLabel),
      "Priya Nadeem",
    );
    expect(continueButton).toBeEnabled();
  });

  it("saves the profile and the new position when a details step continues", async () => {
    const user = userEvent.setup();
    const { calls } = renderSetup({ profile: SAMPLE_PROFILE, progress: progressAt(2) });
    await user.click(screen.getByRole("button", { name: GUIDED_SETUP_CONTROLS.continueLabel }));

    const profileCall = calls.find((call) => call.path === "/api/setup/profile");
    expect(profileCall?.body).toEqual({ profile: SAMPLE_PROFILE });
    const progressCall = calls.findLast((call) => call.path === "/api/setup/progress");
    expect(progressCall?.body).toMatchObject({
      progress: { currentStep: 3, status: "in_progress", completedSteps: [1, 2] },
    });
  });

  it("marks the optional fields optional and the required ones required", () => {
    renderSetup({ progress: progressAt(2) });
    expect(screen.getByLabelText(GUIDED_SETUP_STEPS.yourDetails.nameLabel)).toBeRequired();
    expect(screen.getByLabelText(GUIDED_SETUP_STEPS.yourDetails.phoneLabel)).not.toBeRequired();
  });

  it("prefills the first step with the name the user typed at sign-up", () => {
    renderSetup({ progress: progressAt(2) });
    expect(screen.getByLabelText(GUIDED_SETUP_STEPS.yourDetails.nameLabel)).toHaveValue(
      "Dana Reyes",
    );
  });

  it("lists the create-campaign fields in the order the user fills them", () => {
    renderSetup({ progress: progressAt(4) });
    expect(screen.getByText(GUIDED_SETUP_STEPS.createCampaign.starterTextNote)).toBeInTheDocument();
    expect(screen.getByText(GUIDED_SETUP_STEPS.createCampaign.submitHint)).toBeInTheDocument();
    expect(screen.getByText("The address and the state")).toBeInTheDocument();
    expect(screen.getByText("Save and run the checks")).toBeInTheDocument();
  });

  it("says so at the result step when the checks found nothing to fix", () => {
    renderSetup({
      progress: progressAt(5, { campaignRef: READY_PREFLIGHT_RESPONSE.campaignRef }),
      savedCampaign: savedCampaignResult(),
    });
    // The sentence is both the panel's description and its body, which is the point: a user who
    // reads only the heading and a user who reads only the body are told the same thing.
    expect(screen.getAllByText(GUIDED_SETUP_STEPS.readTheResult.readyBody).length).toBe(2);
    expect(panel()).toHaveAccessibleDescription(GUIDED_SETUP_STEPS.readTheResult.readyBody);
  });

  /**
   * 006C-AC-006's other branch of step 5, which nothing rendered until 2026-09-20.
   *
   * Every finding is said twice over: what it means, then what to do about it. The rule's own code
   * is in neither sentence, because PRD-006b D5 puts a code inside the campaign page's collapsed
   * support region and this panel is not that region.
   */
  it("explains each finding at the result step when the checks found something to fix", () => {
    const blocked = NEEDS_CHANGES_PREFLIGHT_RESPONSE.findings[0];
    renderSetup({
      progress: progressAt(5, { campaignRef: READY_PREFLIGHT_RESPONSE.campaignRef }),
      savedCampaign: blockedCampaignResult(),
    });
    expect(panel()).toHaveAccessibleDescription(GUIDED_SETUP_STEPS.readTheResult.needsChangesBody);
    expect(screen.getByText(blocked?.description ?? "")).toBeInTheDocument();
    expect(screen.getByText(blocked?.remediation ?? "")).toBeInTheDocument();
    expect(panel().textContent ?? "").not.toContain(blocked?.ruleCode ?? "");
  });

  /**
   * The defect this pins, found by the PRD-006c verifier on 2026-09-20.
   *
   * Step 5 read its result from `reportCampaignSaved`, which only the browser session that pressed
   * "Save and run the checks" ever receives. Somebody who signed in the next morning resumed onto
   * step 5 with no report at all, so the findings were empty and the panel chose the ready
   * sentence: a campaign the checks had blocked was described as saved and ready for approval.
   * The result is the server's now, and a resumed step 5 says what the checks actually decided.
   */
  it("tells a resumed step 5 that a blocked campaign needs changes", () => {
    renderSetup({
      progress: progressAt(5, { campaignRef: READY_PREFLIGHT_RESPONSE.campaignRef }),
      savedCampaign: blockedCampaignResult(),
    });
    expect(screen.queryByText(GUIDED_SETUP_STEPS.readTheResult.readyBody)).not.toBeInTheDocument();
    expect(screen.getByText(GUIDED_SETUP_STEPS.readTheResult.needsChangesBody)).toBeInTheDocument();
  });

  /** The third answer: the campaign could not be read, so the step claims neither outcome. */
  it("says nothing definitive at step 5 when the campaign could not be read", () => {
    renderSetup({ progress: progressAt(5, { campaignRef: READY_PREFLIGHT_RESPONSE.campaignRef }) });
    expect(screen.queryByText(GUIDED_SETUP_STEPS.readTheResult.readyBody)).not.toBeInTheDocument();
    expect(
      screen.queryByText(GUIDED_SETUP_STEPS.readTheResult.needsChangesBody),
    ).not.toBeInTheDocument();
    expect(screen.getAllByText(GUIDED_SETUP_STEPS.readTheResult.unknownBody).length).toBe(2);
  });

  /**
   * PRD-006c D5's approver, and 006C-AC-016. A person who can approve and has no campaign of
   * their own is handed the one that is waiting for a decision.
   *
   * Step 4 is "Create the Open House Boost", and their colleague has already done it, so step 3
   * hands them to the result instead of asking for a second campaign. Step 4 is marked complete,
   * which is true: somebody did it.
   */
  it("takes an approver with a campaign waiting for them from step 3 to the result", async () => {
    const user = userEvent.setup();
    const { calls } = renderSetup({
      campaignAwaitingDecision: savedCampaignResult(),
      canApprove: true,
      profile: SAMPLE_PROFILE,
      progress: progressAt(3),
    });
    await user.click(screen.getByRole("button", { name: GUIDED_SETUP_CONTROLS.continueLabel }));

    await waitFor(() => {
      expect(panel()).toHaveAccessibleName(GUIDED_SETUP_STEPS.readTheResult.title);
    });
    expect(calls.findLast((call) => call.path === "/api/setup/progress")?.body).toMatchObject({
      progress: { currentStep: 5, completedSteps: [1, 2, 3, 4] },
    });
    // The campaign it is about is the colleague's, so that is where the walkthrough goes.
    await waitFor(() => {
      expect(push).toHaveBeenCalledWith(READY_PREFLIGHT_RESPONSE.detailHref);
    });
  });

  /** The creator's own path is untouched: step 3 still leads to the create screen. */
  it("still sends a creator from step 3 to the create screen", async () => {
    const user = userEvent.setup();
    const { calls } = renderSetup({
      campaignAwaitingDecision: savedCampaignResult(),
      canApprove: false,
      profile: SAMPLE_PROFILE,
      progress: progressAt(3),
    });
    await user.click(screen.getByRole("button", { name: GUIDED_SETUP_CONTROLS.continueLabel }));

    await waitFor(() => {
      expect(panel()).toHaveAccessibleName(GUIDED_SETUP_STEPS.createCampaign.title);
    });
    expect(calls.findLast((call) => call.path === "/api/setup/progress")?.body).toMatchObject({
      progress: { currentStep: 4 },
    });
  });

  it("offers approval to an approver and the hand-off words to everyone else", () => {
    const approver = renderSetup({ canApprove: true, progress: progressAt(6) });
    expect(screen.getByText(GUIDED_SETUP_STEPS.approveOrHandOff.approveBody)).toBeInTheDocument();
    approver.unmount();

    renderSetup({ canApprove: false, progress: progressAt(6) });
    expect(screen.getByText(GUIDED_SETUP_STEPS.approveOrHandOff.handOffBody)).toBeInTheDocument();
  });

  it("closes by naming all three accounts and offering no connect, publish, or spend action", () => {
    renderSetup({ progress: progressAt(7) });
    expect(screen.getByText(GUIDED_SETUP_STEPS.whatHappensNext.body)).toBeInTheDocument();
    expect(screen.getByText(NOT_CONNECTED_SOURCE)).toBeInTheDocument();
    for (const control of screen.getAllByRole("button")) {
      expect(control.textContent ?? "").not.toMatch(/connect|publish|launch|pay|spend/iu);
    }
  });

  it("marks the setup complete when the last step is finished", async () => {
    const user = userEvent.setup();
    const { calls } = renderSetup({ progress: progressAt(7) });
    await user.click(
      screen.getByRole("button", { name: GUIDED_SETUP_STEPS.whatHappensNext.primaryLabel }),
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(calls.findLast((call) => call.path === "/api/setup/progress")?.body).toMatchObject({
      progress: { status: "completed" },
    });
  });

  it("dismisses on Escape without losing what the user typed", async () => {
    const user = userEvent.setup();
    const { calls } = renderSetup({ progress: progressAt(3) });
    await user.type(
      screen.getByLabelText(GUIDED_SETUP_STEPS.realtorPartner.realtorNameLabel),
      "Priya Nadeem",
    );
    await user.keyboard("{Escape}");
    // F-23. The panel closes once its write has landed, so this waits for the close rather than
    // reading the instant after the key.
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(calls.findLast((call) => call.path === "/api/setup/progress")?.body).toMatchObject({
      progress: { status: "dismissed", currentStep: 3 },
    });
  });

  /**
   * PRD-006d's named-state review, F-23. The dismissal settles before the panel closes.
   *
   * "Not now" used to close the panel and post the new position afterwards. A navigation that
   * overtook that post read the old position, reopened the walkthrough on the step it was on, and
   * carried the page away from wherever the person was going: measured on 2026-09-20, when the
   * change-password review spec spent its whole timeout on somebody else's step 5. Wave 7e waited
   * for the response in the test layer, which made the suite green and left the product racing.
   *
   * The write is held open here so the window between the press and the answer can be looked at.
   * Inside it: the panel is still on screen, "Not now" is disabled so the same dismissal cannot be
   * posted twice, and after a beat the panel says why it is still there. Releasing the write closes
   * the panel.
   */
  it("keeps the panel open, and Not now disabled, until the dismissal has been saved", async () => {
    const user = userEvent.setup();
    const calls: { path: string; body: unknown }[] = [];
    let releaseWrite: (() => void) | undefined;
    const held = new Promise<void>((resolve) => {
      releaseWrite = resolve;
    });
    const fetchStub = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = String(input);
      const body: unknown = JSON.parse(String(init?.body ?? "{}"));
      calls.push({ path, body });
      if (path === "/api/setup/progress") await held;
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }) as typeof globalThis.fetch;

    renderSetup({ fetch: fetchStub, profile: SAMPLE_PROFILE, progress: progressAt(3) });

    const dismissControl = screen.getByRole("button", { name: GUIDED_SETUP_CONTROLS.dismiss });
    await user.click(dismissControl);

    expect(screen.getByRole("dialog", { name: /.+/u })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: GUIDED_SETUP_CONTROLS.dismiss })).toBeDisabled();
    expect(calls.findLast((call) => call.path === "/api/setup/progress")?.body).toMatchObject({
      progress: { status: "dismissed", currentStep: 3 },
    });
    await waitFor(() => {
      expect(screen.getByText(GUIDED_SETUP_CONTROLS.dismissPending)).toBeInTheDocument();
    });

    releaseWrite?.();
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    // One press, one write. The disabled control is what makes that true.
    expect(calls.filter((call) => call.path === "/api/setup/progress")).toHaveLength(1);
  });

  /**
   * F-23's second half. A reply from a write that has been overtaken says nothing about where the
   * person is now.
   *
   * Two progress writes overlap whenever somebody presses Continue before the previous write has
   * answered, which "Show me around again" followed by Continue does every time. Each reply
   * carries the progress the server held when it ran, the replies are not ordered, and the older
   * one used to arrive last and move the panel back to the step it had already left. Measured on
   * 2026-09-20 in the review browser run: a step 2 Continue saved the profile, advanced, and was
   * then pulled back to step 2 by the restart's own reply, where it stayed. Both writes answered
   * 200, so it read as a step that would not advance rather than as an error.
   *
   * The first write is held open here and released after the second has answered, which is the
   * order that used to lose. The panel must be on the step the newest write named.
   */
  it("ignores a progress reply that a newer write has overtaken", async () => {
    const user = userEvent.setup();
    const writes = heldProgressWriteFetch();

    renderSetup({ fetch: writes.fetch, profile: SAMPLE_PROFILE, progress: progressAt(1) });

    // The first write: the welcome step's own move to step 2, held open.
    await user.click(screen.getByRole("button", { name: GUIDED_SETUP_STEPS.welcome.primaryLabel }));
    expect(panel()).toHaveAccessibleName(GUIDED_SETUP_STEPS.yourDetails.title);

    // The second write, which answers first: step 2's Continue on to step 3.
    await user.click(screen.getByRole("button", { name: GUIDED_SETUP_CONTROLS.continueLabel }));
    await waitFor(() => {
      expect(panel()).toHaveAccessibleName(GUIDED_SETUP_STEPS.realtorPartner.title);
    });

    writes.release();
    await waitFor(() => {
      expect(writes.progressWrites()).toBeGreaterThanOrEqual(2);
    });
    // The overtaken reply named step 2. The panel is still on step 3.
    expect(panel()).toHaveAccessibleName(GUIDED_SETUP_STEPS.realtorPartner.title);
  });

  it("never opens for a setup that is finished, and never opens when it is turned off", () => {
    const finished = renderSetup({
      progress: complete(initialGuidedSetupProgress(), new Date(SERVER_NOW)),
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    finished.unmount();

    renderSetup({ enabled: false });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows the chip inside the seven-day window and reopens at the saved step", async () => {
    const user = userEvent.setup();
    const { calls } = renderSetup({
      progress: dismiss(progressAt(4), new Date(SERVER_NOW)),
    });
    const chip = screen.getByRole("button", { name: GUIDED_SETUP_CONTROLS.finishChip });
    await user.click(chip);
    expect(panel()).toHaveAccessibleName(GUIDED_SETUP_STEPS.createCampaign.title);
    expect(calls.findLast((call) => call.path === "/api/setup/progress")?.body).toMatchObject({
      progress: { status: "in_progress", currentStep: 4 },
    });
  });

  it("hides the chip once the seven days are up", () => {
    renderSetup({
      progress: dismiss(progressAt(4), new Date("2026-09-01T12:00:00.000Z")),
    });
    expect(
      screen.queryByRole("button", { name: GUIDED_SETUP_CONTROLS.finishChip }),
    ).not.toBeInTheDocument();
  });

  it("restarts from the help menu, keeps the profile, and counts the restart", async () => {
    const user = userEvent.setup();
    const { calls } = renderSetup({
      profile: SAMPLE_PROFILE,
      progress: complete(progressAt(7), new Date(SERVER_NOW)),
    });
    await user.click(screen.getByRole("button", { name: "Help" }));
    await user.click(screen.getByRole("button", { name: GUIDED_SETUP_CONTROLS.restart }));

    expect(panel()).toHaveAccessibleName(GUIDED_SETUP_STEPS.welcome.title);
    expect(calls.findLast((call) => call.path === "/api/setup/progress")?.body).toMatchObject({
      progress: { currentStep: 1, restartedCount: 1, status: "in_progress" },
    });
    // The profile survives a restart: the user is walking the journey again, not starting over.
    expect(calls.some((call) => call.path === "/api/setup/profile")).toBe(false);
  });

  it("closes the help menu on Escape and puts focus back on the trigger", async () => {
    const user = userEvent.setup();
    renderSetup({ progress: complete(initialGuidedSetupProgress(), new Date(SERVER_NOW)) });
    const trigger = screen.getByRole("button", { name: "Help" });
    await user.click(trigger);
    expect(screen.getByRole("button", { name: GUIDED_SETUP_CONTROLS.restart })).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(
      screen.queryByRole("button", { name: GUIDED_SETUP_CONTROLS.restart }),
    ).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  /**
   * The defect this pins: every stored write used to produce a new `onClose`, the panel primitive
   * treated that as a new layer and moved focus back to its first control, which is the close
   * button, and the next space the user typed dismissed the whole walkthrough. It showed up as a
   * name with a space in it disappearing along with the panel.
   */
  it("puts the panel's controls before the page in tab order", () => {
    renderSetup();
    // D6. Tab follows the document, so the panel is rendered before the page. Somebody who has
    // just been shown a step reaches that step's controls before the rest of the workspace.
    const dialog = panel();
    const pageContent = screen.getByRole("main");
    expect(
      dialog.compareDocumentPosition(pageContent) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("keeps focus in the field while a saved write comes back", async () => {
    const user = userEvent.setup();
    renderSetup({ progress: progressAt(3) });
    const field = screen.getByLabelText(GUIDED_SETUP_STEPS.realtorPartner.realtorNameLabel);
    await user.click(field);
    await user.type(field, "Priya Nadeem");

    expect(field).toHaveFocus();
    expect(field).toHaveValue("Priya Nadeem");
    expect(panel()).toBeInTheDocument();
  });

  /**
   * Wave 7m. Saving a campaign with the walkthrough put aside leaves the page where it is.
   *
   * Reporting a saved campaign used to open the panel whatever state it was in, and step 5's route
   * is the campaign's own page, so the auto-start effect immediately pushed the browser there. The
   * person was reading the result they had just saved and was taken off it; the "Open campaign"
   * link they were about to press went with the page. Measured on 2026-09-20 in the review
   * composition: the link was added 288 ms after the save and removed 204 ms later, unthrottled,
   * and added at 467 ms and removed 201 ms later under 6x CPU throttling, with the navigation
   * following each time. `review-campaign-decision.spec.ts` spent three 15-minute timeouts on the
   * `ubuntu-24.04` runner trying to press it inside that window.
   *
   * The campaign is still remembered, so "Finish setup" resumes onto it. What is gone is the
   * opening nobody asked for, and the navigation behind it.
   */
  it("leaves the result on screen when a campaign is saved with the walkthrough aside", async () => {
    const { calls } = renderSetup({
      answers: { "/api/campaigns/preflight": READY_PREFLIGHT_RESPONSE },
      children: <OpenHouseDraftBuilder profile={SAMPLE_PROFILE} />,
      profile: SAMPLE_PROFILE,
      progress: dismiss(progressAt(4), new Date(SERVER_NOW)),
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    saveTheOpenHouseDraft();
    const link = await screen.findByRole("link", { name: "Open campaign" });
    expect(link).toHaveAttribute("href", READY_PREFLIGHT_RESPONSE.detailHref);

    // The bookkeeping write that follows the save, and its reply reconciling, are the renders the
    // link has to survive. It is the same element afterwards: nothing remounted it.
    await waitFor(() => {
      expect(calls.findLast((call) => call.path === "/api/setup/progress")?.body).toMatchObject({
        progress: { campaignRef: READY_PREFLIGHT_RESPONSE.campaignRef, status: "dismissed" },
      });
    });
    expect(screen.getByRole("link", { name: "Open campaign" })).toBe(link);
    expect(screen.getByRole("heading", { name: CHECK_RESULT_READY })).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  /**
   * The other half of the same rule: a walkthrough somebody is actually walking still finishes step
   * 4 when the checks run, and still takes them to the campaign it just saved. That is D3's step 5,
   * and the case above must not have cost it.
   */
  it("moves an open walkthrough on to the result step and opens the campaign it saved", async () => {
    renderSetup({
      answers: { "/api/campaigns/preflight": READY_PREFLIGHT_RESPONSE },
      children: <OpenHouseDraftBuilder profile={SAMPLE_PROFILE} />,
      profile: SAMPLE_PROFILE,
      progress: progressAt(4),
    });

    saveTheOpenHouseDraft();
    await waitFor(() => {
      expect(panel()).toHaveAccessibleName(GUIDED_SETUP_STEPS.readTheResult.title);
    });
    await waitFor(() => {
      expect(push).toHaveBeenCalledWith(READY_PREFLIGHT_RESPONSE.detailHref);
    });
  });

  /**
   * Wave 7m. A dismissal that answers after the walkthrough was asked for again closes nothing.
   *
   * F-23 made "Not now" wait for its write before closing the panel, which fixed one race and left
   * another: the close now lands whenever the write answers, and by then the person may have
   * pressed "Finish setup" or "Show me around again". The panel opened and then vanished a beat
   * later, with no way back to it. Measured on 2026-09-20 with the dismissal's write held for
   * 900 ms and the processor throttled 6x: the panel the restart had just opened was removed
   * 1260 ms in, and `guided-setup.resume.spec.ts` timed out pressing "Let's go" on it.
   *
   * The write is held open here so the press and the answer can be put either side of the restart,
   * which is the order that used to lose.
   */
  it("keeps a panel the person reopened while the dismissal's write was still travelling", async () => {
    const user = userEvent.setup();
    const writes = heldProgressWriteFetch();

    renderSetup({ fetch: writes.fetch, profile: SAMPLE_PROFILE, progress: progressAt(3) });
    await user.click(screen.getByRole("button", { name: GUIDED_SETUP_CONTROLS.dismiss }));
    // F-23. The panel is still on screen while the dismissal travels, which is the window this
    // case lives in.
    expect(panel()).toHaveAccessibleName(GUIDED_SETUP_STEPS.realtorPartner.title);

    await user.click(screen.getByRole("button", { name: "Help" }));
    await user.click(screen.getByRole("button", { name: GUIDED_SETUP_CONTROLS.restart }));
    expect(panel()).toHaveAccessibleName(GUIDED_SETUP_STEPS.welcome.title);

    writes.release();
    // The dismissal has finished: its control is live again. The panel it was pressed on is not
    // the one on screen, so it closed nothing.
    await waitFor(() => {
      expect(screen.getByRole("button", { name: GUIDED_SETUP_CONTROLS.dismiss })).toBeEnabled();
    });
    expect(panel()).toHaveAccessibleName(GUIDED_SETUP_STEPS.welcome.title);
    expect(
      screen.getByRole("button", { name: GUIDED_SETUP_STEPS.welcome.primaryLabel }),
    ).toBeInTheDocument();
  });

  /**
   * D6 and 006C-AC-010, the second focus movement. Continue hands focus to the element the panel
   * has just moved on to, not the one the person has finished with.
   *
   * Step 4 is the only step whose Continue changes which element is highlighted without changing
   * the step, so it is the case that can go backwards. It did not have a test until 2026-09-20:
   * the focus return was written and nothing held it.
   */
  it("hands focus to the newly highlighted field when step 4 continues", async () => {
    const user = userEvent.setup();
    renderSetup({
      children: <OpenHouseDraftBuilder profile={SAMPLE_PROFILE} />,
      profile: SAMPLE_PROFILE,
      progress: progressAt(4),
    });

    await user.click(screen.getByRole("button", { name: GUIDED_SETUP_CONTROLS.continueLabel }));

    const moved = CAMPAIGN_FIELD_SEQUENCE[1];
    await waitFor(() => {
      const highlighted = document.querySelector(anchorSelector(moved ?? "setup.welcome"));
      expect(highlighted).toHaveAttribute("data-guided-setup-highlight", "true");
      expect(highlighted?.querySelector("input, select, textarea, button, a[href]")).toBe(
        document.activeElement,
      );
    });
  });

  /**
   * A profile write that is refused once, then accepted, with the route's code and reference on
   * the first answer. `refusedProfileWrite` below builds it so each case names only what it is
   * about.
   */
  function refusedProfileWriteOnce(
    code: string | undefined,
    reference: string | undefined,
  ): typeof globalThis.fetch {
    let profileWrites = 0;
    return (async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = String(input);
      const body: unknown = JSON.parse(String(init?.body ?? "{}"));
      if (path === "/api/setup/profile") {
        profileWrites += 1;
        if (profileWrites === 1) {
          return new Response(JSON.stringify(code === undefined ? {} : { error: code }), {
            status: 500,
            headers: {
              "content-type": "application/json",
              ...(reference === undefined ? {} : { [SUPPORT_REFERENCE_HEADER]: reference }),
            },
          });
        }
      }
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }) as typeof globalThis.fetch;
  }

  /**
   * 006D-AC-011, through PRD-006b D7. A write that did not land is said out loud.
   *
   * The step used to move anyway and write a line to the console: somebody whose details had not
   * saved was shown the next step, told nothing, and found their name missing the next morning.
   * The panel now stays where it is, says what the route's code means in its own status region,
   * and the same Continue is the retry.
   *
   * Until 2026-09-20 the sentence was the generic one no matter what the route had said, so a
   * refusal the product has words for was reported as an unexplained failure of ours. This case
   * uses a mapped code and asserts the mapped sentence, and the one after it uses an unmapped code
   * and asserts the support reference the generic sentence owes.
   */
  it("holds the step and says what the route said, then advances on the retry", async () => {
    const user = userEvent.setup();

    renderSetup({
      fetch: refusedProfileWriteOnce("SETUP_PREFERENCE_FAILED", SETUP_SUPPORT_REFERENCE),
      profile: SAMPLE_PROFILE,
      progress: progressAt(2),
    });
    await user.click(screen.getByRole("button", { name: GUIDED_SETUP_CONTROLS.continueLabel }));

    // The step is where it was, the typed values are where they were, and the panel says why.
    expect(panel()).toHaveAccessibleName(GUIDED_SETUP_STEPS.yourDetails.title);
    expect(screen.getByLabelText(GUIDED_SETUP_STEPS.yourDetails.nameLabel)).toHaveValue(
      SAMPLE_PROFILE.displayName,
    );
    const notice = await screen.findByText(userMessageSentence("SETUP_PREFERENCE_FAILED"));
    expect(notice.closest("[role='status']")).not.toBeNull();
    // A code with words of its own needs no reference, so the region stays out of the way.
    expect(screen.queryByText(SUPPORT_DETAILS_LABELS.supportReference)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: GUIDED_SETUP_CONTROLS.continueLabel }));
    await waitFor(() => {
      expect(panel()).toHaveAccessibleName(GUIDED_SETUP_STEPS.realtorPartner.title);
    });
    expect(
      screen.queryByText(userMessageSentence("SETUP_PREFERENCE_FAILED")),
    ).not.toBeInTheDocument();
  });

  /**
   * 006B-AC-007 on the walkthrough. The generic sentence sends the person to support, so it brings
   * the reference support needs; the setup routes put one on every answer
   * (`apps/web/src/server/setup-preferences.ts:354,381`).
   */
  it("carries the support reference when the refusal has no sentence of its own", async () => {
    const user = userEvent.setup();

    renderSetup({
      fetch: refusedProfileWriteOnce("SETUP_UNHEARD_OF_REFUSAL", SETUP_SUPPORT_REFERENCE),
      profile: SAMPLE_PROFILE,
      progress: progressAt(2),
    });
    await user.click(screen.getByRole("button", { name: GUIDED_SETUP_CONTROLS.continueLabel }));

    expect(await screen.findByText(userMessageSentence(undefined))).toBeInTheDocument();
    expect(screen.getByText(SUPPORT_DETAILS_LABELS.supportReference)).toBeInTheDocument();
    const reference = screen.getByText(SETUP_SUPPORT_REFERENCE);
    expect(reference.closest("[data-support-details]")).not.toBeNull();
  });

  it("says the reference was not recorded when nothing answered", async () => {
    const user = userEvent.setup();

    renderSetup({
      fetch: (async () => {
        throw new TypeError("network down");
      }) as typeof globalThis.fetch,
      profile: SAMPLE_PROFILE,
      progress: progressAt(2),
    });
    await user.click(screen.getByRole("button", { name: GUIDED_SETUP_CONTROLS.continueLabel }));

    expect(await screen.findByText(userMessageSentence(undefined))).toBeInTheDocument();
    expect(screen.getByText(SUPPORT_REFERENCE_NOT_RECORDED)).toBeInTheDocument();
  });

  /**
   * Wave 7n. The ring follows an anchored element the page rebuilt under it.
   *
   * The attach effect used to stop watching the moment it had attached: it disconnected its own
   * observer inside `attachIfPresent`. So a screen that remounted the element a step points at
   * left the ring on a node that was no longer in the document, nothing put it on the replacement,
   * and the step pointed at nothing for as long as it stayed open. Nothing on the page said so,
   * because the old node still carried the attribute; it simply was not in the document any more,
   * which is why `[data-guided-setup-highlight='true']` matched nothing.
   *
   * That is what `guided-setup.accessibility.spec.ts` was failing on intermittently: the ring was
   * missing at step 1 in one cell and at step 4 in another, and which cell it was moved between
   * runs, because which render replaced the element did.
   *
   * The observer now runs for as long as the step is open and re-queries only when the element it
   * attached to has left the document, so a replacement is picked up and costs one attribute
   * selector.
   */
  it("moves the highlight to the anchored element the page rebuilt under it", async () => {
    const user = userEvent.setup();
    renderSetup({ children: <RebuildableQuickActions /> });

    const highlighted = () => document.querySelector("[data-guided-setup-highlight='true']");
    await waitFor(() => {
      expect(highlighted()).toHaveAttribute("data-generation", "0");
    });

    await user.click(screen.getByRole("button", { name: "Rebuild the quick actions" }));

    await waitFor(() => {
      expect(highlighted()).toHaveAttribute("data-generation", "1");
    });
    // Exactly one element carries it, so the ring never splits between the old node and the new.
    expect(document.querySelectorAll("[data-guided-setup-highlight='true']")).toHaveLength(1);
  });

  it("never reaches browser storage", async () => {
    const user = userEvent.setup();
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    const getItem = vi.spyOn(Storage.prototype, "getItem");
    renderSetup({ progress: progressAt(2) });
    await user.click(screen.getByRole("button", { name: GUIDED_SETUP_CONTROLS.continueLabel }));
    expect(setItem).not.toHaveBeenCalled();
    expect(getItem).not.toHaveBeenCalled();
    setItem.mockRestore();
    getItem.mockRestore();
  });
});
