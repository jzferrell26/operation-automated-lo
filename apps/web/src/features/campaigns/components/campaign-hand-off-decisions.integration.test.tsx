import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { HAND_OFF } from "../../../copy/launch-messages.js";
import { glyphBeforeWords, glyphMarkup } from "../../../testing/glyph-markup.js";
import {
  APPROVER,
  CREATOR,
  libraryCampaign,
  pageOf,
  type LibraryCampaignOptions,
} from "../../../server/campaign-page.test-support.js";
import { PersistedCampaignScreen } from "./persisted-campaign-screen.js";

/**
 * PRD-008b 008B-AC-010 and 008B-AC-011, the approver hand-off card, on the campaign page of
 * PRD-009e.
 *
 * The card tells somebody who cannot approve to copy the campaign's link and send it to an
 * approver. That is a step on a version nobody has decided on. On a version that was approved, or
 * sent back, there is nothing for an approver to do with the link, so the card said something that
 * is not true. It used to render whenever the viewer could not approve, which on an approved
 * version meant for everybody, approvers and the workspace owner included, because the approval
 * rule also needs the campaign to be waiting.
 */

vi.mock("next/navigation.js", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));

/** PRD-009d D8: the hand-off card says this, on the campaign page and on step 3 alike. */
const HAND_OFF_WORDS =
  "You can't approve campaigns in this workspace. Send this link to an approver.";

async function renderCampaign(
  options: LibraryCampaignOptions,
  principal: typeof CREATOR | typeof APPROVER,
) {
  const page = await pageOf(await libraryCampaign(options), { principal });
  return render(<PersistedCampaignScreen page={page} />);
}

function handOffAnchors(container: HTMLElement): number {
  return container.querySelectorAll("[data-hand-off]").length;
}

describe("the approver hand-off card on a version nobody has decided on", () => {
  it("is offered to a creator, who cannot approve", async () => {
    const { container } = await renderCampaign({}, CREATOR);

    expect(screen.getByText(HAND_OFF_WORDS)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: HAND_OFF.copyLinkLabel })).toBeInTheDocument();
    expect(handOffAnchors(container)).toBe(1);
  });

  /** Review pass 2, R2 N-2: the mockup's "Copy the link" carries the copy glyph before its words. */
  it("draws the copy glyph before the words of its one primary", async () => {
    await renderCampaign({}, CREATOR);

    expect(glyphBeforeWords(screen.getByRole("button", { name: HAND_OFF.copyLinkLabel }))).toBe(
      glyphMarkup("copy"),
    );
  });

  it("is not offered to an approver, who can approve it themselves", async () => {
    const { container } = await renderCampaign({}, APPROVER);

    expect(screen.queryByText(/Send this link to an approver/u)).toBeNull();
    expect(screen.queryByRole("button", { name: HAND_OFF.copyLinkLabel })).toBeNull();
    expect(handOffAnchors(container)).toBe(0);
  });
});

describe.each([
  ["approved", { decision: "approved" as const }],
  ["sent back", { decision: "rejected" as const }],
] as const)("the approver hand-off card on a version that was %s", (_outcome, options) => {
  it.each([
    ["a creator", CREATOR],
    ["an approver", APPROVER],
  ])("is not offered to %s, because there is nothing left to hand off", async (_who, principal) => {
    const { container } = await renderCampaign(options, principal);

    expect(screen.queryByText(/Send this link to an approver/u)).toBeNull();
    expect(screen.queryByText(/You can't approve campaigns in this workspace/u)).toBeNull();
    expect(screen.queryByRole("button", { name: HAND_OFF.copyLinkLabel })).toBeNull();
    expect(handOffAnchors(container)).toBe(0);
  });

  it("leaves no approve card at all, because the Approval section says what was recorded", async () => {
    const { container } = await renderCampaign(options, CREATOR);

    expect(screen.queryByRole("button", { name: "Approve this version" })).toBeNull();
    expect(container.querySelectorAll("[data-approval-card]")).toHaveLength(0);
    expect(screen.getByRole("region", { name: "Approval" })).toBeInTheDocument();
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
      const { container } = await renderCampaign({ needsChanges: true }, principal);

      expect(screen.queryByText(/Send this link to an approver/u)).toBeNull();
      expect(screen.queryByRole("button", { name: HAND_OFF.copyLinkLabel })).toBeNull();
      expect(handOffAnchors(container)).toBe(0);
      // The page still says plainly where it stands, and the approve control stays blocked.
      expect(container.querySelector("[data-campaign-standing]")).toHaveTextContent(
        "Needs changes",
      );
      expect(screen.getByRole("button", { name: "Approve this version" })).toBeDisabled();
    },
  );
});

/**
 * The scored baseline review of 2026-10-03, pass 1 (009G-AC-006), R1-13. The mockup draws the
 * cannot-approve state as the sentence and then one primary action, "Copy the link"
 * (`launch-step-3-review-and-launch.html`), so a person who cannot approve has exactly one thing to
 * press and it is the blue button. The card is the same on the campaign page and on step 3.
 */
describe("the approver hand-off card's order and its one action (review R1-13)", () => {
  async function handOff(): Promise<HTMLElement> {
    const { container } = await renderCampaign({}, CREATOR);
    return container.querySelector("[data-hand-off]") as HTMLElement;
  }

  it("says its sentence before the button", async () => {
    const card = await handOff();

    expect([...card.children].map((child) => child.tagName.toLowerCase())).toEqual(["p", "button"]);
    expect(card.firstElementChild).toHaveTextContent(HAND_OFF_WORDS);
    expect(card.lastElementChild).toHaveTextContent(HAND_OFF.copyLinkLabel);
  });

  it("makes Copy the link the card's one primary", async () => {
    const card = await handOff();

    const button = screen.getByRole("button", { name: HAND_OFF.copyLinkLabel });
    expect(card).toContainElement(button);
    expect(button).toHaveAttribute("data-variant", "primary");
    expect(card.querySelectorAll("button")).toHaveLength(1);
  });

  it("confirms the copy in a row with its glyph, where the sentence was", async () => {
    const card = await handOff();

    // `userEvent.setup()` gives the page a clipboard of its own, which the copy is read back from.
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: HAND_OFF.copyLinkLabel }));

    await waitFor(() => expect(card.firstElementChild).toHaveTextContent(HAND_OFF.copiedNotice));
    await expect(navigator.clipboard.readText()).resolves.toMatch(
      /\/marketing\/campaigns\/campaign_01LibraryPage$/u,
    );
    // The glyph is a block, so it shares a row with its words instead of standing alone above them.
    const row = card.querySelector("p > span") as HTMLElement;
    expect([...row.children].map((child) => child.tagName.toLowerCase())).toEqual(["svg", "span"]);
  });
});
