import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { useState, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  GUIDED_SETUP_CONTROLS,
  GUIDED_SETUP_STEPS,
  GUIDED_SETUP_TOTAL_STEPS,
} from "../../copy/guided-setup-messages.js";
import { CHECK_RESULT_READY, NOT_CONNECTED_SOURCE } from "../../copy/user-language.js";
import { OpenHouseDraftBuilder } from "../campaigns/components/open-house-draft-builder.js";
import { GUIDED_SETUP_ANCHORS } from "./anchor-registry.js";
import { GuidedSetupShellControls } from "./guided-setup-progress.js";
import { GuidedSetupProvider } from "./guided-setup-provider.js";
import { complete, dismiss, initialGuidedSetupProgress } from "./model/progress.js";
import {
  heldProgressWriteFetch,
  progressAt,
  READY_PREFLIGHT_RESPONSE,
  recordingSetupFetch,
  SAMPLE_PROFILE,
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
      canApprove={options.canApprove ?? true}
      enabled={options.enabled ?? true}
      initialProfile={options.profile}
      initialProgress={options.progress ?? initialGuidedSetupProgress()}
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

/**
 * What a person types into the create screen that the profile did not already fill, and then the
 * press that runs the checks. The fields the walkthrough prefilled are left alone, because leaving
 * them alone is what a person does with a value that is already right.
 */
function saveTheOpenHouseDraft(): void {
  const typed: readonly (readonly [string, string])[] = [
    ["Property address", "48 Cedar Street, Austin"],
    ["Property description", "A three-bedroom home near the park."],
    ["Open house starts", "2030-06-12T13:00"],
    ["Open house ends", "2030-06-12T15:00"],
    ["Where the ad runs", "Austin metro"],
  ];
  for (const [label, value] of typed) {
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  }
  fireEvent.change(screen.getByLabelText("State", { exact: true }), { target: { value: "TX" } });
  fireEvent.click(screen.getByLabelText("I have permission to market this property."));
  fireEvent.click(screen.getByLabelText("I have permission to use the Realtor's materials."));
  fireEvent.click(screen.getByRole("button", { name: "Save and run the checks" }));
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

  it("is a non-modal dialog, so the page underneath stays reachable", () => {
    renderSetup();
    expect(panel()).not.toHaveAttribute("aria-modal");
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
    renderSetup({ progress: progressAt(5) });
    // The sentence is both the panel's description and its body, which is the point: a user who
    // reads only the heading and a user who reads only the body are told the same thing.
    expect(screen.getAllByText(GUIDED_SETUP_STEPS.readTheResult.readyBody).length).toBe(2);
    expect(panel()).toHaveAccessibleDescription(GUIDED_SETUP_STEPS.readTheResult.readyBody);
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
