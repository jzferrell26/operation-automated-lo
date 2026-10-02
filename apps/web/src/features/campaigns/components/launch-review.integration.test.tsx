import { fireEvent, render, screen, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LAUNCH_SENTENCES, launchRetiredSentence } from "../../../copy/launch-messages.js";
import {
  CAMPAIGN_SENT_BACK_NEEDS_NEW_VERSION,
  CHECK_RESULT_NEEDS_CHANGES,
} from "../../../copy/user-language.js";
import { LaunchOnFacebook } from "./launch-on-facebook.js";
import { reviewFixture } from "./launch-flow.test-support.js";
import { LaunchReview, launchReviewState } from "./launch-review.js";

/**
 * PRD-009d step 3, Review and launch: 009D-AC-013, 014, 015 (the approve line and controls), 016,
 * 018 (every PRD-008b state of D8), and 019 ("Fix it").
 */

const mocked = vi.hoisted(() => ({ refresh: vi.fn(), push: vi.fn() }));
vi.mock("next/navigation.js", () => ({
  useRouter: () => ({ refresh: mocked.refresh, push: mocked.push }),
}));

beforeEach(() => {
  mocked.refresh.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const CLAIM = {
  ruleCode: "WORDS_RATE_PAYMENT_OR_TERM_CLAIM",
  affected: "content.headline",
  remediation: "Take 'low rates' out of the headline. Ads can't state rate claims.",
};

/**
 * A sentence whose day is drawn as a `time` element (so it lines up in tabular figures): matched on
 * the element that holds the whole sentence, whose only child elements are its days.
 */
function sentenceWithDays(text: string) {
  return (_content: string, element: Element | null): boolean =>
    element !== null &&
    element.textContent === text &&
    element.children.length > 0 &&
    [...element.children].every((child) => child.tagName === "TIME");
}

describe("the actual ad in a feed frame (009D-AC-013)", () => {
  it("shows the ad tall by default, with a square switch that changes only the view", async () => {
    const { container } = render(<LaunchReview review={reviewFixture()} />);
    const tall = screen.getByRole("radio", { name: "Tall (4:5)" });
    const square = screen.getByRole("radio", { name: "Square (1:1)" });
    expect(tall).toBeChecked();
    expect(container.querySelector("[data-ad-creative]")).toHaveAttribute("data-shape", "tall");
    const before = container.querySelector("[data-launch-step]")?.textContent;
    await userEvent.setup().click(square);
    expect(container.querySelector("[data-ad-creative]")).toHaveAttribute("data-shape", "square");
    expect(container.querySelector("img")).toHaveAttribute(
      "src",
      "/api/ads-library/samples/sample-first-home/2/square",
    );
    // Nothing else on the page changed: the switch is a view, never a new version.
    expect(container.querySelector("[data-launch-step]")?.textContent).toBe(before);
    expect(screen.getByText("Your approval covers both shapes.")).toBeInTheDocument();
  });

  it("frames the ad without any Meta logo or branding, and claims no exact match", () => {
    const { container } = render(<LaunchReview review={reviewFixture()} />);
    const frame = container.querySelector("[data-ad-feed-preview]");
    expect(frame?.querySelectorAll("img")).toHaveLength(1);
    expect(frame?.textContent).not.toMatch(/Meta|Facebook|facebook\.com/u);
    expect(
      screen.getByText(
        "Shown as it might look in a Facebook feed. The image comes from the ads library, and the band underneath is your brand.",
      ),
    ).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/exactly as it appears/u);
  });
});

describe("what you approve (009D-AC-014)", () => {
  it("counts the checks from the ruleset registry and names each in plain words", () => {
    render(<LaunchReview review={reviewFixture()} />);
    const card = screen.getByRole("heading", { name: "What you approve" }).closest("div")
      ?.parentElement as HTMLElement;
    expect(within(card).getByText("Checks passed")).toBeInTheDocument();
    expect(within(card).getByText("22 of 22 checks passed.")).toBeInTheDocument();
    const checked = within(card).getByText("See what we checked").closest("details") as HTMLElement;
    expect(within(checked).getAllByRole("listitem")).toHaveLength(22);
    expect(within(checked).getByText("Doesn't ask for private details")).toBeInTheDocument();
    expect(within(checked).getByText("No age, gender or ZIP code targeting")).toBeInTheDocument();
  });

  it("counts a needs-changes version as run minus the rules that found something", () => {
    render(<LaunchReview review={reviewFixture({}, [CLAIM])} />);
    expect(screen.getByText("21 of 22 checks passed.")).toBeInTheDocument();
    expect(screen.getAllByText(CHECK_RESULT_NEEDS_CHANGES).length).toBeGreaterThan(0);
  });

  /**
   * Writing review pass 2, W-26. The list used to show every check name in one style, each a
   * positive sentence ("Ends after today"), so the one that failed read as an achievement. The state
   * is now said in words next to each name, and the failed checks come first.
   */
  describe("says which check failed (writing review W-26)", () => {
    function openedList(): HTMLElement {
      return screen.getByText("See what we checked").closest("details") as HTMLElement;
    }

    it("puts the failed check first, with 'Needs changes:' in visible text", () => {
      render(<LaunchReview review={reviewFixture({}, [CLAIM])} />);
      const items = within(openedList()).getAllByRole("listitem");
      expect(items).toHaveLength(22);
      expect(items[0]).toHaveTextContent(
        "Needs changes: No rate, payment or term claims in your words",
      );
      // The state is text a sighted person reads, never a screen reader's alone.
      expect(items[0]?.querySelector(".oalo-visually-hidden")).toBeNull();
      expect(within(openedList()).getAllByText(/^Needs changes:/u)).toHaveLength(1);
    });

    it("says 'Passed' to a screen reader before every other check, beside a decorative check icon", () => {
      render(<LaunchReview review={reviewFixture({}, [CLAIM])} />);
      const items = within(openedList()).getAllByRole("listitem");
      for (const item of items.slice(1)) {
        expect(item).toHaveTextContent(/^Passed: /u);
        expect(item.querySelector(".oalo-visually-hidden")).toHaveTextContent("Passed:");
        expect(item.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
      }
    });

    it("lists failed checks in the order the ruleset runs them, ahead of every passed one", () => {
      const second = {
        ruleCode: "NMLS_NUMBER_REQUIRED",
        affected: "advertiser.nmls",
        remediation: "Add your NMLS number in Brand.",
      };
      render(<LaunchReview review={reviewFixture({}, [CLAIM, second])} />);
      const items = within(openedList()).getAllByRole("listitem");
      const states = items.map((item) =>
        /^Needs changes: /u.test(item.textContent ?? "") ? "failed" : "passed",
      );
      expect(states.slice(0, 2)).toEqual(["failed", "failed"]);
      expect(states.slice(2).every((state) => state === "passed")).toBe(true);
      expect(items[0]).toHaveTextContent("No rate, payment or term claims in your words");
      expect(items[1]).toHaveTextContent("NMLS number on the ad");
    });

    it("says 'Passed' on all of them, and 'Needs changes' on none, when nothing failed", () => {
      render(<LaunchReview review={reviewFixture()} />);
      const items = within(openedList()).getAllByRole("listitem");
      expect(items.every((item) => /^Passed: /u.test(item.textContent ?? ""))).toBe(true);
      expect(within(openedList()).queryByText(/Needs changes/u)).toBeNull();
    });
  });

  it("lists the facts the approval covers, with one Change link to step 2", () => {
    render(<LaunchReview from="home" review={reviewFixture()} />);
    const facts = document.querySelector("dl") as HTMLElement;
    expect(
      within(facts).getByText("Sample: First home, start here, library version 2"),
    ).toBeInTheDocument();
    expect(within(facts).getByText(/Headline changed\. Ad text unchanged/u)).toBeInTheDocument();
    expect(within(facts).getByText("$25 a day, up to $350 in total")).toBeInTheDocument();
    expect(
      within(facts).getByText(sentenceWithDays("From launch until Tue, Oct 20, 2026")),
    ).toBeInTheDocument();
    expect(
      within(facts).getByText("Austin, TX and everything within 15 miles"),
    ).toBeInTheDocument();
    expect(within(facts).getByText("Texas")).toBeInTheDocument();
    expect(within(facts).getByText("the Facebook feed")).toBeInTheDocument();
    expect(
      within(facts).getByText("Your HighLevel account. It isn't connected yet."),
    ).toBeInTheDocument();
    const changes = screen.getAllByRole("link", { name: "Change" });
    expect(changes).toHaveLength(1);
    expect(changes[0]).toHaveAttribute(
      "href",
      "/marketing/campaigns/new?step=2&campaign=campaign_0123456789abcdef&from=home",
    );
  });
});

describe("Approve this version (009D-AC-015)", () => {
  it("says the approval covers this version, with these words, and confirms before it approves", async () => {
    const fetch = vi.fn(
      async () =>
        new Response(JSON.stringify({ decision: "approved" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    );
    vi.stubGlobal("fetch", fetch);
    const user = userEvent.setup();
    render(<LaunchReview review={reviewFixture()} />);
    expect(
      screen.getByText(
        "Approving applies to this exact version, with your words. Nothing is published or sent.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send back for changes" })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "Approve this version" }));
    expect(fetch).not.toHaveBeenCalled();
    await user.click(await screen.findByRole("button", { name: "Yes, approve" }));
    expect(fetch).toHaveBeenCalledTimes(1);
    const [path, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(path).toBe("/api/campaigns/approve");
    expect(JSON.parse(String(init.body))).toMatchObject({
      campaignRef: "campaign_0123456789abcdef",
      expectedCampaignVersionRef: "campaignversion_0123456789abcdef",
      decision: "approved",
    });
    expect(mocked.refresh).toHaveBeenCalled();
  });
});

describe("Launch on Facebook (009D-AC-016)", () => {
  it("is its own disabled button, apart from Approve, tied to one sentence that links to the connections page", () => {
    render(<LaunchReview review={reviewFixture()} />);
    const launch = screen.getByRole("button", { name: "Launch on Facebook" });
    expect(launch).toBeDisabled();
    expect(launch).toHaveAttribute("disabled");
    expect(launch).not.toHaveAttribute("formaction");
    expect(launch).not.toHaveAttribute("href");
    expect(launch).toHaveAccessibleDescription(
      "Launching on Facebook isn't turned on yet, and it needs Meta connected. See what's needed for Meta.",
    );
    const describedBy = launch.getAttribute("aria-describedby") ?? "";
    const sentence = document.getElementById(describedBy) as HTMLElement;
    expect(
      within(sentence).getByRole("link", { name: "See what's needed for Meta" }),
    ).toHaveAttribute("href", "/settings/connections");
    expect(launch.closest("[data-launch-card]")?.querySelector("[data-approval-card]")).toBeNull();
  });

  it("makes no request on click, Enter, or Space even with every input true", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    render(
      <LaunchOnFacebook
        state={{ metaConnected: true, retiredOn: null, approved: true, launchingTurnedOn: true }}
      />,
    );
    const launch = screen.getByRole("button", { name: "Launch on Facebook" });
    expect(launch).toHaveAccessibleDescription(LAUNCH_SENTENCES.notTurnedOn);
    fireEvent.click(launch);
    launch.focus();
    await userEvent.setup().keyboard("{Enter}{ }");
    fireEvent.keyDown(launch, { key: "Enter" });
    fireEvent.keyDown(launch, { key: " " });
    expect(fetch).not.toHaveBeenCalled();
    expect(launch).toBeDisabled();
  });

  it("is given no event handler, no form, and no form action, whatever its state (verifier, 2026-10-02)", () => {
    for (const state of [
      { metaConnected: false, retiredOn: null, approved: false, launchingTurnedOn: false },
      { metaConnected: true, retiredOn: null, approved: true, launchingTurnedOn: true },
    ]) {
      const { unmount } = render(<LaunchOnFacebook state={state} />);
      const launch = screen.getByRole("button", { name: "Launch on Facebook" });
      // A disabled button never dispatches a click, so a handler on it would pass every click
      // test. React keeps the props it was given on the element; they are read from there.
      const propsKey = Object.keys(launch).find((key) => key.startsWith("__reactProps$"));
      expect(propsKey, "React's props on the button").toBeDefined();
      const props = (launch as unknown as Record<string, Record<string, unknown>>)[propsKey ?? ""];
      const handlers = Object.keys(props ?? {}).filter((name) => /^on[A-Z]/u.test(name));
      expect(handlers).toEqual([]);
      expect(props?.["formAction"]).toBeUndefined();
      expect(props?.["form"]).toBeUndefined();
      for (const attribute of ["form", "formaction", "formmethod", "href", "onclick"]) {
        expect(launch).not.toHaveAttribute(attribute);
      }
      expect(launch.closest("form")).toBeNull();
      unmount();
    }
  });

  it.each([
    [
      { metaConnected: true, retiredOn: "Oct 1, 2026", approved: true, launchingTurnedOn: false },
      launchRetiredSentence("Oct 1, 2026"),
    ],
    [
      { metaConnected: true, retiredOn: null, approved: false, launchingTurnedOn: false },
      LAUNCH_SENTENCES.notApproved,
    ],
  ] as const)("carries exactly the sentence D7 chooses", (state, sentence) => {
    render(<LaunchOnFacebook state={state} />);
    expect(screen.getByRole("button", { name: "Launch on Facebook" })).toHaveAccessibleDescription(
      sentence,
    );
  });
});

describe("the PRD-008b states on step 3 (D8, 009D-AC-018)", () => {
  it("ready, no decision: Approve and Send back, with Launch disabled", () => {
    const { container } = render(<LaunchReview review={reviewFixture()} />);
    expect(container.querySelector("[data-review-state]")).toHaveAttribute(
      "data-review-state",
      "ready",
    );
    expect(screen.getByRole("button", { name: "Approve this version" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Send back for changes" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Launch on Facebook" })).toBeDisabled();
  });

  it("ready, viewer can't approve: the chip, the reason and Copy the link, and no approve control at all", () => {
    const { container } = render(<LaunchReview review={reviewFixture({ canApprove: false })} />);
    const card = container.querySelector("[data-decision-card='cannot-approve']") as HTMLElement;
    expect(card).not.toBeNull();
    expect(within(card).getByText("Ready for approval")).toBeInTheDocument();
    expect(
      within(card).getByText(
        "You can't approve campaigns in this workspace. Send this link to an approver.",
      ),
    ).toBeInTheDocument();
    expect(within(card).getByRole("button", { name: "Copy the link" })).toBeInTheDocument();
    // D8 and the PRD-008b cannot-approve state: nothing this viewer could press that would not work.
    expect(screen.queryByRole("button", { name: "Approve this version" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Send back for changes" })).toBeNull();
    expect(screen.getByRole("button", { name: "Launch on Facebook" })).toBeDisabled();
  });

  it("needs changes: the chip, the plain fix, Fix it, and Approve disabled with its reason", () => {
    render(<LaunchReview review={reviewFixture({}, [CLAIM])} />);
    expect(screen.getByText(CLAIM.remediation)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Fix it" })).toHaveAttribute(
      "href",
      "/marketing/campaigns/new?step=2&campaign=campaign_0123456789abcdef#words",
    );
    expect(screen.getByRole("button", { name: "Approve this version" })).toBeDisabled();
    expect(
      screen.getAllByText("This version needs changes before anyone can approve it.").length,
    ).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "Copy the link" })).toBeNull();
  });

  it("approved: the chip, who approved on which day, and Launch disabled", () => {
    render(
      <LaunchReview
        review={reviewFixture({
          state: "approved",
          decision: {
            decision: "approved",
            approver: "Dana Reyes",
            decidedAt: "2026-10-02T15:00:00.000Z",
          },
        })}
      />,
    );
    expect(screen.getByText("Approved")).toBeInTheDocument();
    expect(
      screen.getByText(
        sentenceWithDays(
          "Approved by Dana Reyes on Oct 2, 2026. The approval covers this version only.",
        ),
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Approve this version" })).toBeNull();
    expect(screen.getByRole("button", { name: "Launch on Facebook" })).toBeDisabled();
  });

  it("sent back: the sentence and Make a new version, with no approve and no hand-off", () => {
    render(
      <LaunchReview
        review={reviewFixture({
          canApprove: false,
          decision: {
            decision: "rejected",
            approver: "Dana Reyes",
            decidedAt: "2026-10-02T15:00:00.000Z",
          },
        })}
      />,
    );
    expect(screen.getByText(CAMPAIGN_SENT_BACK_NEEDS_NEW_VERSION)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Make a new version" })).toHaveAttribute(
      "href",
      "/marketing/campaigns/new?step=2&campaign=campaign_0123456789abcdef",
    );
    expect(screen.queryByRole("button", { name: "Approve this version" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Copy the link" })).toBeNull();
  });

  it("ad retired, undecided: the chip, the notice, and Choose another ad", () => {
    render(<LaunchReview review={reviewFixture({ retiredOn: "2026-09-30" })} />);
    expect(screen.getByText("Ad retired")).toBeInTheDocument();
    expect(
      screen.getByText(
        sentenceWithDays(
          "This ad was taken out of the library on Sep 30, 2026, so this draft can't be approved. Your budget, dates and area are kept.",
        ),
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Choose another ad" })).toHaveAttribute(
      "href",
      "/marketing/campaigns/new?step=1&campaign=campaign_0123456789abcdef",
    );
    expect(screen.queryByRole("button", { name: "Approve this version" })).toBeNull();
  });

  it("reads the recorded decision before anything else", () => {
    const decided = {
      decision: "approved" as const,
      approver: "x",
      decidedAt: "2026-10-02T15:00:00.000Z",
    };
    const base = {
      canApprove: true,
      retiredOn: "2026-09-30",
      checks: { ...reviewFixture().checks, blocking: true },
    };
    expect(launchReviewState({ ...base, decision: decided })).toBe("approved");
    expect(launchReviewState({ ...base, decision: { ...decided, decision: "rejected" } })).toBe(
      "sent-back",
    );
    expect(launchReviewState({ ...base, decision: undefined })).toBe("retired");
    expect(launchReviewState({ ...base, retiredOn: null, decision: undefined })).toBe(
      "needs-changes",
    );
  });
});

describe("Fix it (009D-AC-019)", () => {
  it.each([
    [{ ...CLAIM, affected: "advertiser.company" }, "#brand"],
    [
      {
        ruleCode: "WORDS_PRIVATE_INFO_REQUEST",
        affected: "content.body",
        remediation: "Take 'ssn' out of the ad text.",
      },
      "#words",
    ],
    [
      {
        ruleCode: "WORDS_PRIVATE_INFO_REQUEST",
        affected: "content.consentText",
        remediation: "Take 'ssn' out of the lead form wording in Brand.",
      },
      "#brand",
    ],
    [
      {
        ruleCode: "NMLS_NUMBER_REQUIRED",
        affected: "advertiser.nmls",
        remediation: "Add your NMLS number in Brand.",
      },
      "#brand",
    ],
    [
      {
        ruleCode: "BUDGET_OUT_OF_BOUNDS",
        affected: "meta.dailyBudgetMinor",
        remediation: "Choose a daily and total budget within the active ruleset.",
      },
      "#budget",
    ],
    [
      {
        ruleCode: "RUN_DATES_INVALID",
        affected: "schedule.endsAt",
        remediation: "Choose an end date after today.",
      },
      "#budget",
    ],
    [
      {
        ruleCode: "TARGETING_NOT_ALLOWED",
        affected: "meta.targeting",
        remediation: "Choose one or more cities or states, and nothing else.",
      },
      "#area",
    ],
  ])("opens the part of step 2 that holds %j", (finding, hash) => {
    render(<LaunchReview review={reviewFixture({}, [finding])} />);
    expect(screen.getByRole("link", { name: "Fix it" }).getAttribute("href")).toBe(
      `/marketing/campaigns/new?step=2&campaign=campaign_0123456789abcdef${hash}`,
    );
  });

  it("opens step 1 for a retired ad", () => {
    render(
      <LaunchReview
        review={reviewFixture({}, [
          {
            ruleCode: "LIBRARY_AD_RETIRED",
            affected: "libraryAd",
            remediation: "Choose another ad. Your budget, dates and area are kept.",
          },
        ])}
      />,
    );
    expect(screen.getByRole("link", { name: "Fix it" })).toHaveAttribute(
      "href",
      "/marketing/campaigns/new?step=1&campaign=campaign_0123456789abcdef",
    );
  });
});
