import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  AREA_HINT,
  BAND_PLACEHOLDER,
  BRAND_CARD_LINE,
  DAILY_BUDGET_FIX,
  EMPTY_LIBRARY,
  PLACE_REFUSED,
  TOTAL_BUDGET_FIX,
  WORDS_HINT,
} from "../../../copy/launch-messages.js";
import { SUPPORT_DETAILS_LABELS, SUPPORT_DETAILS_SUMMARY } from "../../../copy/user-language.js";
import { SUPPORT_REFERENCE_HEADER } from "../../http/internal-api.js";
import { parseLaunchAddress, type LaunchAddress } from "../launch-model.js";
import { LaunchFlow, type LaunchFlowProps } from "./launch-flow.js";
import { TEST_BAND, TEST_CARDS } from "./launch-flow.test-support.js";

/**
 * PRD-009d, steps 1 and 2 of "Launch an ad": 009D-AC-001, 002, 005, 006, 007, 008, and the live
 * preview half of 009.
 */

const mocked = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation.js", () => ({ useRouter: () => ({ push: mocked.push }) }));

const TODAY = "2026-10-02";

function renderFlow(initial: LaunchAddress, overrides: Partial<LaunchFlowProps> = {}) {
  return render(
    <LaunchFlow
      advertiser={TEST_BAND}
      cards={TEST_CARDS}
      initial={initial}
      rememberedPlaces={[]}
      today={TODAY}
      {...overrides}
    />,
  );
}

function stubSave(body: unknown = { campaignRef: "campaign_0123456789abcdef" }, status = 200) {
  const fetch = vi.fn(
    async () =>
      new Response(JSON.stringify(body), {
        status,
        headers: { "content-type": "application/json" },
      }),
  );
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

const SUPPORT_REFERENCE = "correlation_save_7f3c1d9e5a2b4c6d8e0f1a2b";

/** A refused save, carrying the reference header every answer from the route carries. */
function stubRefusedSave(code: string): ReturnType<typeof vi.fn> {
  const fetch = vi.fn(
    async () =>
      new Response(JSON.stringify({ error: code }), {
        status: 400,
        headers: {
          "content-type": "application/json",
          [SUPPORT_REFERENCE_HEADER]: SUPPORT_REFERENCE,
        },
      }),
  );
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

beforeEach(() => {
  mocked.push.mockReset();
  window.history.replaceState(null, "", "/marketing/campaigns/new");
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("the three steps (009D-AC-001)", () => {
  it("shows the step indicator with its three names and where the person is", () => {
    renderFlow({ step: 1 });
    expect(screen.getByRole("heading", { level: 1, name: "Choose an ad" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Launch an ad steps" })).toBeInTheDocument();
    expect(screen.getAllByText("Step 1 of 3").length).toBeGreaterThan(0);
    for (const name of ["Choose an ad", "Set it up", "Review and launch"]) {
      expect(screen.getAllByText(name).length).toBeGreaterThan(0);
    }
  });

  it("ignores an address value that is not one of its typed values", () => {
    renderFlow(
      parseLaunchAddress({ from: "https://example.invalid", step: "9", topic: "x", ad: "nope" }),
    );
    expect(screen.getByRole("heading", { level: 1, name: "Choose an ad" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Cancel" })).toHaveAttribute(
      "href",
      "/marketing/campaigns",
    );
    expect(screen.getAllByRole("listitem").length).toBeGreaterThan(TEST_CARDS.length);
  });

  it("shows step 2 with Done on step 1, and keeps typed words through Back", async () => {
    const user = userEvent.setup();
    renderFlow({ step: 1 });
    await user.click(
      within(screen.getByRole("article", { name: "Sample: Your first home checklist" })).getByRole(
        "button",
        { name: /^Use this ad/u },
      ),
    );
    expect(screen.getByRole("heading", { level: 1, name: "Set it up" })).toBeInTheDocument();
    expect(screen.getAllByText("Step 2 of 3").length).toBeGreaterThan(0);
    expect(window.location.search).toBe("?step=2&ad=sample-first-home-checklist");

    const headline = screen.getByLabelText(/^Headline/u);
    await user.clear(headline);
    await user.type(headline, "My own words");
    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("heading", { level: 1, name: "Choose an ad" })).toBeInTheDocument();
    expect(window.location.search).toBe("?step=1");

    await user.click(
      within(screen.getByRole("article", { name: "Sample: Your first home checklist" })).getByRole(
        "button",
        { name: /^Use this ad/u },
      ),
    );
    expect(screen.getByLabelText(/^Headline/u)).toHaveValue("My own words");
  });
});

/**
 * Writing review pass 2, W-30. A step 2 address that names an ad the library no longer holds used to
 * show step 1 with no explanation. It now says why, above the chips, once.
 */
describe("an address that names an ad that has left the library (writing review W-30)", () => {
  const SAID = "That ad isn't in the library anymore. Choose another ad.";

  it("shows step 1 and says the ad is gone, for a new campaign", () => {
    renderFlow({ step: 2, ad: "sample-no-longer-here" });
    expect(screen.getByRole("heading", { level: 1, name: "Choose an ad" })).toBeInTheDocument();
    expect(screen.getByText(SAID)).toBeInTheDocument();
  });

  it("says it for a saved campaign whose ad is gone", () => {
    renderFlow(
      { step: 2, campaign: "campaign_0123456789abcdef" },
      {
        campaign: {
          campaignRef: "campaign_0123456789abcdef",
          adId: "sample-no-longer-here",
          prefill: {
            headline: "Saved headline",
            primaryText: "Saved words",
            dailyBudgetDollars: 40,
            totalBudgetDollars: 400,
            endsOn: "2026-10-30",
            places: ["TX"],
          },
        },
      },
    );
    expect(screen.getByRole("heading", { level: 1, name: "Choose an ad" })).toBeInTheDocument();
    expect(screen.getByText(SAID)).toBeInTheDocument();
  });

  it("says nothing when no ad was named, or the named ad is in the library", () => {
    const { unmount } = renderFlow({ step: 1 });
    expect(screen.queryByText(SAID)).toBeNull();
    unmount();
    renderFlow({ step: 2, ad: "sample-first-home" });
    expect(screen.queryByText(SAID)).toBeNull();
    expect(screen.getByRole("heading", { level: 1, name: "Set it up" })).toBeInTheDocument();
  });

  it("stops saying it once the person chooses another ad", async () => {
    const user = userEvent.setup();
    renderFlow({ step: 2, ad: "sample-no-longer-here" });
    await user.click(
      within(screen.getByRole("article", { name: "Sample: Your first home checklist" })).getByRole(
        "button",
        { name: /^Use this ad/u },
      ),
    );
    expect(screen.getByRole("heading", { level: 1, name: "Set it up" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.queryByText(SAID)).toBeNull();
  });
});

describe("step 1, Choose an ad (009D-AC-002)", () => {
  it("shows the topic chips with counts, only for topics that have an ad", () => {
    renderFlow({ step: 1 });
    const chips = screen.getByRole("list", { name: "Show ads about" });
    const names = within(chips)
      .getAllByRole("button")
      .map((button) => button.textContent?.replace(/\s+/gu, " ").trim());
    expect(names).toEqual(["All 4", "First-time buyers 2", "Refinance 1", "VA loans 1"]);
  });

  it("filters by the topic in the address, and in place from a chip", async () => {
    renderFlow({ step: 1, topic: "refinance" });
    expect(screen.getAllByRole("article")).toHaveLength(1);
    expect(screen.getByRole("button", { name: /Refinance/u })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await userEvent.setup().click(screen.getByRole("button", { name: /^All/u }));
    expect(screen.getAllByRole("article")).toHaveLength(4);
    expect(window.location.search).toBe("?step=1");
  });

  it("makes every card button secondary, so no single blue button competes with the ads", () => {
    renderFlow({ step: 1 });
    const uses = screen.getAllByRole("button", { name: /^Use this ad/u });
    expect(uses).toHaveLength(4);
    for (const use of uses) expect(use).toHaveAttribute("data-variant", "secondary");
    expect(document.querySelectorAll('[data-variant="primary"]')).toHaveLength(0);
  });

  // Writing review pass 2, W-31. Eight identical "Use this ad" buttons told a screen reader's list of
  // buttons nothing; the ads library tab already names each by its ad, and now so does step 1.
  it("names each Use this ad button by its ad, as the library tab does", () => {
    renderFlow({ step: 1 });
    const names = screen
      .getAllByRole("button", { name: /^Use this ad/u })
      .map((button) => button.textContent);
    expect(names).toEqual(
      expect.arrayContaining([
        "Use this ad: Sample: First home, start here",
        "Use this ad: Sample: Your first home checklist",
        "Use this ad: Sample: Is your home loan still a fit?",
        "Use this ad: Sample: Home loans for veterans",
      ]),
    );
    expect(new Set(names).size).toBe(names.length);
    for (const card of TEST_CARDS) {
      const article = screen.getByRole("article", { name: card.name });
      expect(
        within(article).getByRole("button", { name: `Use this ad: ${card.name}` }),
      ).toBeInTheDocument();
      // The words a person sees are still just "Use this ad".
      expect(
        article
          .querySelector(".oalo-visually-hidden")
          ?.parentElement?.textContent?.startsWith("Use this ad"),
      ).toBe(true);
    }
  });

  it("orders newer approvals first within a topic and shows the version line", () => {
    renderFlow({ step: 1, topic: "first-time-buyers" });
    const titles = screen
      .getAllByRole("article")
      .map((card) => card.getAttribute("aria-labelledby"));
    expect(titles).toEqual(["ad-card-sample-first-home", "ad-card-sample-first-home-checklist"]);
    const [first] = screen.getAllByRole("article");
    expect(first).toHaveTextContent("Version 1. Reviewed Sep 28, 2026.");
    // The day is a time element, so it draws in tabular figures like every date in the product.
    expect(within(first as HTMLElement).getByText("Sep 28, 2026").tagName).toBe("TIME");
  });

  it.each([
    ["home", "/overview"],
    ["campaigns", "/marketing/campaigns"],
    ["library", "/marketing/campaigns/library"],
    [undefined, "/marketing/campaigns"],
  ] as const)("returns Cancel to the page from=%s names", (from, href) => {
    renderFlow({ step: 1, from });
    expect(screen.getByRole("link", { name: "Cancel" })).toHaveAttribute("href", href);
  });

  it("says the library is empty in one sentence, with no chips", () => {
    renderFlow({ step: 1 }, { cards: [] });
    expect(screen.getByText(EMPTY_LIBRARY)).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Show ads about" })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Use this ad/u })).toBeNull();
  });

  it("labels every sample ad", () => {
    renderFlow({ step: 1 });
    expect(screen.getAllByText("Sample ad")).toHaveLength(4);
  });
});

describe("step 2, Set it up", () => {
  const STEP_TWO: LaunchAddress = { step: 2, ad: "sample-first-home" };

  // Writing review pass 2, W-34. Step 2's "version 3" is the library's version of the ad, and two
  // screens later "Approve this version" means the campaign's version, so step 2 says which.
  it("says the version in its lead is the library's, as step 3 and the campaign page do", () => {
    renderFlow(STEP_TWO);
    expect(
      screen.getByText("Sample: First home, start here. First-time buyers, library version 1."),
    ).toBeInTheDocument();
  });

  // Writing review pass 2, W-35. With no saved name nothing was added from Brand and nothing is there
  // to change, so the card says so and the link says what it does.
  describe("for a person with no Brand yet (writing review W-35)", () => {
    const NO_BRAND = { ...TEST_BAND, name: "", title: "", company: "", nmls: "", companyNmls: "" };

    it("says nothing is added yet, and links to Add in Brand", () => {
      renderFlow(STEP_TWO, { advertiser: NO_BRAND });
      const brand = screen.getByRole("region", { name: "Your brand on the ad" });
      expect(
        within(brand).getByText(
          "Nothing is added yet. Add your name and NMLS number in Brand before you save. The image and layout come from the library and can't be changed.",
        ),
      ).toBeInTheDocument();
      expect(within(brand).getByRole("link", { name: "Add in Brand" })).toHaveAttribute(
        "href",
        "/brand",
      );
      expect(within(brand).queryByRole("link", { name: "Change in Brand" })).toBeNull();
      expect(brand).not.toHaveTextContent("Added for you from Brand");
    });

    it("shows the same placeholder in the feed header, in place of a blank name", () => {
      renderFlow(STEP_TWO, { advertiser: NO_BRAND });
      const header = document.querySelector("[data-ad-feed-preview]")?.firstElementChild;
      expect(header).toHaveTextContent(BAND_PLACEHOLDER);
      expect(header).toHaveTextContent("Sponsored");
    });

    it("keeps the filled wording for a person who has a Brand", () => {
      renderFlow(STEP_TWO);
      const brand = screen.getByRole("region", { name: "Your brand on the ad" });
      expect(within(brand).getByText(BRAND_CARD_LINE)).toBeInTheDocument();
      expect(within(brand).getByRole("link", { name: "Change in Brand" })).toBeInTheDocument();
      expect(within(brand).queryByRole("link", { name: "Add in Brand" })).toBeNull();
      const header = document.querySelector("[data-ad-feed-preview]")?.firstElementChild;
      expect(header).toHaveTextContent("Alex Morgan, Prairie Home Lending");
      expect(header).not.toHaveTextContent(BAND_PLACEHOLDER);
    });
  });

  it("summarises the band read-only, with Change in Brand (009D-AC-005)", () => {
    renderFlow(STEP_TWO);
    const brand = screen.getByRole("region", { name: "Your brand on the ad" });
    expect(within(brand).getByText("Alex Morgan, Loan officer")).toBeInTheDocument();
    expect(within(brand).getByText("NMLS 0000000. Prairie Home Lending")).toBeInTheDocument();
    expect(within(brand).getByRole("link", { name: "Change in Brand" })).toHaveAttribute(
      "href",
      "/brand",
    );
    expect(within(brand).getByText(BRAND_CARD_LINE)).toBeInTheDocument();
    expect(within(brand).queryAllByRole("textbox")).toHaveLength(0);
    expect(document.querySelectorAll('input[type="file"]')).toHaveLength(0);
    // The only things a person can change are the words, the budget, the end date, and the places.
    const controls = [...document.querySelectorAll("input, textarea, select")].map(
      (control) => control.getAttribute("aria-label") ?? control.id,
    );
    expect(controls).toHaveLength(7);
  });

  it("prefills the library words within their limits, with live counts a screen reader reaches (009D-AC-006)", async () => {
    const user = userEvent.setup();
    renderFlow(STEP_TWO);
    const headline = screen.getByLabelText(/^Headline/u);
    const adText = screen.getByLabelText(/^Ad text/u);
    expect(headline).toHaveValue("Thinking about your first home? Start here.");
    expect(headline).toHaveAttribute("maxlength", "60");
    expect(adText).toHaveAttribute("maxlength", "300");
    expect(headline).toHaveAccessibleDescription(/43 of 60 characters/u);

    await user.type(headline, "!");
    expect(headline).toHaveAccessibleDescription(/44 of 60 characters/u);
    await user.clear(adText);
    await user.type(adText, "Changed");
    await user.click(screen.getByRole("button", { name: "Use the library words" }));
    expect(headline).toHaveValue("Thinking about your first home? Start here.");
    expect(adText).toHaveValue("Thinking about your first home? Start here. Send me a message.");
  });

  it("shows the disclosure locked and the words hint beside the words (009D-AC-006)", () => {
    renderFlow(STEP_TWO);
    const words = screen.getByRole("region", { name: "Ad words" });
    expect(within(words).getByText(WORDS_HINT)).toBeInTheDocument();
    const locked = document.querySelector("[data-locked-disclosure]");
    expect(locked?.textContent).toBe("Disclosure, from your brand: Equal Housing Opportunity.");
    expect(locked?.querySelector("input, textarea")).toBeNull();
  });

  it("renders words as text, never as markup (009D-AC-006)", () => {
    renderFlow(STEP_TWO);
    fireEvent.change(screen.getByLabelText(/^Headline/u), {
      target: { value: "<img src=x onerror=1>" },
    });
    fireEvent.change(screen.getByLabelText(/^Ad text/u), {
      target: { value: "<script>alert(1)</script>" },
    });
    const preview = screen.getByRole("complementary", { name: "Your ad so far" });
    expect(within(preview).getByText("<img src=x onerror=1>")).toBeInTheDocument();
    expect(within(preview).getByText("<script>alert(1)</script>")).toBeInTheDocument();
    expect(document.querySelector('img[src="x"]')).toBeNull();
    expect(document.querySelector("script")).toBeNull();
  });

  it("updates the live preview as the words change (009D-AC-009)", async () => {
    renderFlow(STEP_TWO);
    const preview = screen.getByRole("complementary", { name: "Your ad so far" });
    fireEvent.change(screen.getByLabelText(/^Headline/u), { target: { value: "Fresh words" } });
    expect(within(preview).getByText("Fresh words")).toBeInTheDocument();
    expect(within(preview).getByRole("img")).toHaveAttribute(
      "alt",
      "Sample: First home, start here, a house drawn in simple shapes",
    );
  });

  it("prefills $25 a day, $350 in total, and an end 14 days out, and refuses a budget outside the bounds (009D-AC-007)", async () => {
    const fetch = stubSave();
    const user = userEvent.setup();
    renderFlow(STEP_TWO, { rememberedPlaces: ["TX"] });
    expect(screen.getByLabelText(/^Daily budget/u)).toHaveValue("25");
    expect(screen.getByLabelText(/^Total budget/u)).toHaveValue("350");
    expect(screen.getByLabelText(/^Ends/u)).toHaveValue("2026-10-16");
    expect(screen.getByLabelText(/^Starts/u)).toHaveValue("When you launch it");

    fireEvent.change(screen.getByLabelText(/^Daily budget/u), { target: { value: "4" } });
    fireEvent.change(screen.getByLabelText(/^Total budget/u), { target: { value: "6000" } });
    await user.click(screen.getByRole("button", { name: "Save and check" }));
    expect(screen.getByText(DAILY_BUDGET_FIX)).toBeInTheDocument();
    expect(screen.getByText(TOTAL_BUDGET_FIX)).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("keeps the total at daily times days until the person types a total", () => {
    renderFlow(STEP_TWO);
    fireEvent.change(screen.getByLabelText(/^Daily budget/u), { target: { value: "30" } });
    expect(screen.getByLabelText(/^Total budget/u)).toHaveValue("420");
    fireEvent.change(screen.getByLabelText(/^Total budget/u), { target: { value: "300" } });
    fireEvent.change(screen.getByLabelText(/^Daily budget/u), { target: { value: "20" } });
    expect(screen.getByLabelText(/^Total budget/u)).toHaveValue("300");
  });
});

describe("step 2, Where it shows (009D-AC-008)", () => {
  const STEP_TWO: LaunchAddress = { step: 2, ad: "sample-first-home" };

  it("states the hint exactly, and the feed", () => {
    renderFlow(STEP_TWO);
    expect(
      screen.getByText(
        "Mortgage ads can't be aimed by age, gender or ZIP code, so you choose places, not people. Around a city, Meta requires the area to include everything within 15 miles.",
      ),
    ).toBeInTheDocument();
    expect(AREA_HINT).toBe(
      "Mortgage ads can't be aimed by age, gender or ZIP code, so you choose places, not people. Around a city, Meta requires the area to include everything within 15 miles.",
    );
    expect(document.body.textContent).toContain("Shows in: the Facebook feed.");
    expect(document.body.textContent).not.toMatch(/widen a small area/u);
  });

  it("starts empty the first time and with the person's last area afterwards", () => {
    const { unmount } = renderFlow(STEP_TWO);
    expect(screen.queryByRole("list", { name: "Places this ad shows" })).toBeNull();
    unmount();
    renderFlow(STEP_TWO, { rememberedPlaces: ["TX", "Austin, TX"] });
    const chips = screen.getByRole("list", { name: "Places this ad shows" });
    expect(within(chips).getByText("Texas")).toBeInTheDocument();
    expect(within(chips).getByText("Austin, TX")).toBeInTheDocument();
  });

  it("adds a city or a state as a chip with its own remove button, and refuses anything else", async () => {
    const user = userEvent.setup();
    renderFlow(STEP_TWO);
    const field = screen.getByLabelText(/^Add a city or state/u);
    for (const refused of ["78701", "within 5 miles", "women 25-40", "Austin"]) {
      await user.clear(field);
      await user.type(field, refused);
      await user.click(screen.getByRole("button", { name: "Add" }));
      expect(screen.getByText(PLACE_REFUSED), refused).toBeInTheDocument();
      expect(screen.queryByRole("list", { name: "Places this ad shows" })).toBeNull();
    }
    await user.clear(field);
    await user.type(field, "texas");
    await user.click(screen.getByRole("button", { name: "Add" }));
    await user.type(field, "Austin, tx{Enter}");
    const chips = screen.getByRole("list", { name: "Places this ad shows" });
    expect(
      within(chips)
        .getAllByRole("listitem")
        .map((chip) => chip.textContent),
    ).toEqual(["Texas", "Austin, TX"]);
    await user.click(screen.getByRole("button", { name: "Remove Texas" }));
    expect(within(chips).getAllByRole("listitem")).toHaveLength(1);
  });

  it("saves the chosen ad, the words, the dates, the budgets, and the places, and nothing about the brand", async () => {
    const fetch = stubSave();
    const user = userEvent.setup();
    renderFlow({ ...STEP_TWO, from: "home" }, { rememberedPlaces: ["Austin, TX"] });
    await user.click(screen.getByRole("button", { name: "Save and check" }));
    await waitFor(() => expect(mocked.push).toHaveBeenCalled());
    const [path, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(path).toBe("/api/campaigns/preflight");
    expect(JSON.parse(String(init.body))).toEqual({
      adId: "sample-first-home",
      adVersion: 1,
      headline: "Thinking about your first home? Start here.",
      primaryText: "Thinking about your first home? Start here. Send me a message.",
      endsOn: "2026-10-16",
      dailyBudgetDollars: 25,
      totalBudgetDollars: 350,
      places: ["Austin, TX"],
    });
    expect(mocked.push).toHaveBeenCalledWith(
      "/marketing/campaigns/new?step=3&campaign=campaign_0123456789abcdef&from=home",
    );
  });

  it("asks for a place before saving", async () => {
    const fetch = stubSave();
    await userEvent
      .setup()
      .click(renderFlow(STEP_TWO).getByRole("button", { name: "Save and check" }));
    expect(screen.getByText("Add a city or state.")).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("announces a save it refused at the top of the form, takes focus there, and ties each message to its field", async () => {
    const fetch = stubSave();
    const user = userEvent.setup();
    renderFlow(STEP_TWO, { rememberedPlaces: ["TX"] });
    const daily = screen.getByLabelText(/^Daily budget/u);
    fireEvent.change(daily, { target: { value: "1" } });
    await user.click(screen.getByRole("button", { name: "Save and check" }));

    const problem = screen.getByRole("alert");
    expect(problem).toHaveAttribute("aria-live", "assertive");
    expect(problem).toHaveTextContent("Look over the fields marked below and try again.");
    expect(problem).toHaveFocus();
    const headline = screen.getByLabelText(/^Headline/u);
    expect(
      problem.compareDocumentPosition(headline) & Node.DOCUMENT_POSITION_FOLLOWING,
      "the message comes before the first field",
    ).toBeTruthy();
    expect(daily).toHaveAttribute("aria-invalid", "true");
    expect(daily).toHaveAccessibleDescription(expect.stringContaining(DAILY_BUDGET_FIX));
    expect(fetch).not.toHaveBeenCalled();

    fireEvent.change(daily, { target: { value: "25" } });
    await user.click(screen.getByRole("button", { name: "Save and check" }));
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    expect(screen.queryByText("Look over the fields marked below and try again.")).toBeNull();
  });

  it("says a refused save in plain words and stays on step 2", async () => {
    stubSave({ error: "LIBRARY_AD_NOT_AVAILABLE" }, 400);
    const user = userEvent.setup();
    renderFlow(STEP_TWO, { rememberedPlaces: ["TX"] });
    await user.click(screen.getByRole("button", { name: "Save and check" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "We couldn't save this version. Nothing was saved. This ad isn't in the library anymore, or a newer version replaced it. Choose another ad. Check the words, budget and area before you save.",
    );
    expect(mocked.push).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { level: 1, name: "Set it up" })).toBeInTheDocument();
  });

  // Writing review pass 2, W-30. "Pick it again" cannot work when the ad was taken out, and "your
  // words and budget are kept" is untrue for a new campaign, whose drafts are held per ad.
  it("does not promise words and budget that a different ad would not keep", async () => {
    stubSave({ error: "LIBRARY_AD_NOT_AVAILABLE" }, 400);
    const user = userEvent.setup();
    renderFlow(STEP_TWO, { rememberedPlaces: ["TX"] });
    await user.click(screen.getByRole("button", { name: "Save and check" }));
    const alert = await screen.findByRole("alert");
    expect(alert).not.toHaveTextContent(/pick it again/iu);
    expect(alert).not.toHaveTextContent(/kept/iu);
  });

  /**
   * Writing review pass 2, W-27, and closing check N-4. The failed-save sentence says the reference
   * is "in Details for support, below", so that region is below it: for that code, and for a code the product has no words for, which
   * contract section 7 says always shows one. A code whose own sentence needs none shows none.
   */
  describe("the support reference under a refused save (writing review W-27)", () => {
    async function refuse(code: string): Promise<void> {
      stubRefusedSave(code);
      const user = userEvent.setup();
      renderFlow(STEP_TWO, { rememberedPlaces: ["TX"] });
      await user.click(screen.getByRole("button", { name: "Save and check" }));
      await screen.findByRole("alert");
    }

    it("shows it for CAMPAIGN_PREFLIGHT_FAILED, whose sentence points at it", async () => {
      await refuse("CAMPAIGN_PREFLIGHT_FAILED");
      expect(screen.getByRole("alert")).toHaveTextContent(
        "We couldn't save this version. Nothing was saved. We couldn't finish the checks on this campaign. Try again. If it keeps happening, contact support and give them the reference in Details for support, below.",
      );
      const details = screen.getByText(SUPPORT_DETAILS_SUMMARY).closest("details") as HTMLElement;
      expect(
        within(details).getByText(SUPPORT_DETAILS_LABELS.supportReference),
      ).toBeInTheDocument();
      expect(within(details).getByText(SUPPORT_REFERENCE)).toBeInTheDocument();
      expect(details).not.toHaveAttribute("open");
    });

    it("comes after the sentence that points at it, and stays on step 2", async () => {
      await refuse("CAMPAIGN_PREFLIGHT_FAILED");
      const alert = screen.getByRole("alert");
      const details = screen.getByText(SUPPORT_DETAILS_SUMMARY).closest("details") as HTMLElement;
      expect(
        alert.compareDocumentPosition(details) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect(screen.getByRole("heading", { level: 1, name: "Set it up" })).toBeInTheDocument();
    });

    it("shows it for a code the product has no words for", async () => {
      await refuse("A_CODE_FROM_THE_FUTURE");
      expect(screen.getByRole("alert")).toHaveTextContent(
        "We couldn't save this version. Nothing was saved. Something went wrong on our side.",
      );
      expect(screen.getByText(SUPPORT_REFERENCE)).toBeInTheDocument();
    });

    it("shows it, as 'not recorded', when nothing answered at all", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => {
          throw new TypeError("offline");
        }),
      );
      const user = userEvent.setup();
      renderFlow(STEP_TWO, { rememberedPlaces: ["TX"] });
      await user.click(screen.getByRole("button", { name: "Save and check" }));
      await screen.findByRole("alert");
      expect(screen.getByText(SUPPORT_DETAILS_LABELS.supportReference)).toBeInTheDocument();
      expect(screen.getByText("Not recorded")).toBeInTheDocument();
    });

    it("shows none for a code whose own sentence needs none, and none after a later save works", async () => {
      stubRefusedSave("LIBRARY_AD_NOT_AVAILABLE");
      const user = userEvent.setup();
      renderFlow(STEP_TWO, { rememberedPlaces: ["TX"] });
      await user.click(screen.getByRole("button", { name: "Save and check" }));
      await screen.findByRole("alert");
      expect(screen.queryByText(SUPPORT_DETAILS_LABELS.supportReference)).toBeNull();

      stubRefusedSave("CAMPAIGN_PREFLIGHT_FAILED");
      await user.click(screen.getByRole("button", { name: "Save and check" }));
      await screen.findByText(SUPPORT_REFERENCE);

      stubSave();
      await user.click(screen.getByRole("button", { name: "Save and check" }));
      await waitFor(() => expect(mocked.push).toHaveBeenCalled());
      expect(screen.queryByText(SUPPORT_REFERENCE)).toBeNull();
    });
  });

  it("saves a new version of the campaign it was opened from", async () => {
    const fetch = stubSave();
    const user = userEvent.setup();
    renderFlow(
      { step: 2, campaign: "campaign_0123456789abcdef" },
      {
        campaign: {
          campaignRef: "campaign_0123456789abcdef",
          adId: "sample-loan-review",
          prefill: {
            headline: "Saved headline",
            primaryText: "Saved words",
            dailyBudgetDollars: 40,
            totalBudgetDollars: 400,
            endsOn: "2026-10-30",
            places: ["OK"],
          },
        },
      },
    );
    expect(screen.getByLabelText(/^Headline/u)).toHaveValue("Saved headline");
    expect(screen.getByLabelText(/^Total budget/u)).toHaveValue("400");
    await user.click(screen.getByRole("button", { name: "Save and check" }));
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    const [, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toMatchObject({
      adId: "sample-loan-review",
      campaignRef: "campaign_0123456789abcdef",
      headline: "Saved headline",
      places: ["OK"],
    });
  });
});
