import { render, screen, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ADS_LIBRARY_HEADING, ADS_LIBRARY_LEAD } from "../../../../../copy/ads-library-messages.js";
import { EMPTY_LIBRARY } from "../../../../../copy/launch-messages.js";
import {
  ADS_LIBRARY_SAMPLES_FLAG,
  loadAdsLibrary,
  type LoadedAdsLibraryEntry,
} from "../../../../../features/ads-library/server/catalog-loader.js";
import { shortDay } from "../../../../../features/campaigns/launch-model.js";
import { PLACEHOLDER_BAND } from "../../../../../server/launch-an-ad.js";
import { OALO_REVIEW_SURFACE_AUTHORIZED } from "../../../../../server/authenticated-workspace-data.js";
import { AdsLibraryScreen } from "./ads-library-screen.js";
import { TEST_CARDS } from "../../../../../features/campaigns/components/launch-flow.test-support.js";
import AdsLibraryPage from "./page.js";

/**
 * PRD-009c part 2: 009C-AC-005 (the label on a library card), 009C-AC-010 (the tab, the chips, the
 * grid, and no search or sort), 009C-AC-011 (what a card shows), 009C-AC-012 (the empty library),
 * and 009C-AC-013 (what reaches the browser).
 *
 * The page is driven the way Next.js drives it: awaited with its `searchParams`, in the same
 * synthetic workspace the demo runs in, with the sample guard's two raw values set. What a card must
 * show is read from the catalog itself, so the test follows the data and not a copy of it.
 */

const sent = vi.hoisted(() => ({ redirects: [] as string[] }));
const redirectCalls = sent.redirects;

vi.mock("next/headers.js", () => ({ headers: () => Promise.resolve(new Headers()) }));
// A visitor with no session is sent to sign in: the page calls `redirect`, which never returns.
vi.mock("next/navigation.js", () => ({
  redirect: (path: string): never => {
    sent.redirects.push(path);
    throw new Error(`redirected to ${path}`);
  },
}));

function syntheticWorkspace(samples: boolean): void {
  vi.stubEnv("OALO_ENVIRONMENT", "local");
  vi.stubEnv("OALO_PROVIDER_MODE", "stub");
  vi.stubEnv("OALO_SYNTHETIC_DATA_ONLY", "true");
  vi.stubEnv("OALO_REVIEW_SURFACE", undefined);
  vi.stubEnv("OALO_DASHBOARD_PREVIEW", undefined);
  vi.stubEnv("VERCEL", undefined);
  vi.stubEnv("VERCEL_ENV", undefined);
  vi.stubEnv("OALO_RELEASE_MANIFEST_JSON", undefined);
  vi.stubEnv(ADS_LIBRARY_SAMPLES_FLAG, samples ? "enabled" : undefined);
}

beforeEach(() => {
  redirectCalls.length = 0;
  window.history.replaceState(null, "", "/marketing/campaigns/library");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

async function renderLibrary(search: Record<string, string> = {}) {
  return render(await AdsLibraryPage({ searchParams: Promise.resolve(search) }));
}

/** The ads a person can choose today: active, and at the ad's newest version. */
async function activeEntries(): Promise<readonly LoadedAdsLibraryEntry[]> {
  const library = await loadAdsLibrary({
    environment: { OALO_ENVIRONMENT: "local", [ADS_LIBRARY_SAMPLES_FLAG]: "enabled" },
  });
  return library.entries.filter(
    (loaded) =>
      loaded.entry.status === "active" &&
      library.standingOf(loaded.entry)?.highestVersion === loaded.entry.version,
  );
}

const TOPIC_ORDER = [
  "sample-first-home",
  "sample-first-home-checklist",
  "sample-loan-review",
  "sample-refinance-questions",
  "sample-va-home-loans",
  "sample-pre-approval",
  "sample-stronger-offer",
  "sample-down-payment-help",
] as const;

function cardIds(): string[] {
  return screen
    .queryAllByRole("article")
    .map((card) => card.getAttribute("data-ad-card") ?? "");
}

describe("the Ads library tab, with the sample ads on (009C-AC-010)", () => {
  beforeEach(() => syntheticWorkspace(true));

  it("sits under the Campaigns title with the tab strip, its heading, and the design's lead sentence", async () => {
    await renderLibrary();

    expect(screen.getByRole("heading", { level: 1, name: "Campaigns" })).toBeInTheDocument();
    const tabs = screen.getByRole("navigation", { name: "Campaigns sections" });
    expect(within(tabs).getByRole("link", { name: "Ads library" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(within(tabs).getByRole("link", { name: "Your campaigns" })).not.toHaveAttribute(
      "aria-current",
    );
    expect(
      screen.getByRole("heading", { level: 2, name: ADS_LIBRARY_HEADING }),
    ).toBeInTheDocument();
    expect(screen.getByText(ADS_LIBRARY_LEAD)).toBeInTheDocument();
    // 009G-AC-001: the cards sit under that section heading, so each ad is named at the next level
    // down. Step 1 has no section heading and names them one level up (`launch-flow` tests).
    const cardHeadings = screen
      .getAllByRole("heading")
      .filter((heading) => heading.closest("article") !== null);
    expect(cardHeadings.length).toBeGreaterThan(0);
    for (const heading of cardHeadings) expect(heading.tagName).toBe("H3");
    // 009d D3: the product has no logo upload, so the lead never promises one.
    expect(ADS_LIBRARY_LEAD).not.toMatch(/logo/iu);
    expect(ADS_LIBRARY_LEAD).toBe(
      "Ready-made ads for loan officers, reviewed before they're added. Your name and NMLS number go on each one automatically. You can change the words; the image stays as it is.",
    );
  });

  it("has topic chips with counts: All, then one per topic that has an active ad", async () => {
    await renderLibrary();

    const chips = within(screen.getByRole("list", { name: "Show ads about" }));
    expect(chips.getAllByRole("button").map((chip) => chip.textContent)).toEqual([
      "All 8",
      "First-time buyers 2",
      "Refinance 2",
      "VA loans 1",
      "Pre-approval 2",
      "Down payment help 1",
    ]);
    expect(chips.getByRole("button", { name: "All 8" })).toHaveAttribute("aria-pressed", "true");
    expect(chips.getByRole("button", { name: "Refinance 2" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("shows every active ad once, by topic, newest approval first within a topic (009C-AC-011)", async () => {
    await renderLibrary();
    expect(cardIds()).toEqual([...TOPIC_ORDER]);
    expect((await activeEntries()).map((loaded) => loaded.entry.id).sort()).toEqual(
      [...TOPIC_ORDER].sort(),
    );
  });

  it("opens filtered by `?topic=`", async () => {
    await renderLibrary({ topic: "refinance" });
    expect(cardIds()).toEqual(["sample-loan-review", "sample-refinance-questions"]);
    expect(screen.getByRole("button", { name: "Refinance 2" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "All 8" })).toHaveAttribute("aria-pressed", "false");
    // The counts are the whole library's, so the chips stay put while the grid narrows.
    expect(screen.getByRole("button", { name: "VA loans 1" })).toBeInTheDocument();
  });

  it("shows every ad when the topic in the address is not one of the five", async () => {
    await renderLibrary({ topic: "mortgages" });
    expect(cardIds()).toEqual([...TOPIC_ORDER]);
    expect(screen.getByRole("button", { name: "All 8" })).toHaveAttribute("aria-pressed", "true");
  });

  it("filters in place, without leaving the page, and keeps the address in step", async () => {
    await renderLibrary();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "VA loans 1" }));
    expect(cardIds()).toEqual(["sample-va-home-loans"]);
    expect(window.location.pathname + window.location.search).toBe(
      "/marketing/campaigns/library?topic=va-loans",
    );
    expect(screen.getByRole("button", { name: "VA loans 1" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "All 8" })).toHaveAttribute("aria-pressed", "false");

    await user.click(screen.getByRole("button", { name: "Pre-approval 2" }));
    expect(cardIds()).toEqual(["sample-pre-approval", "sample-stronger-offer"]);

    await user.click(screen.getByRole("button", { name: "All 8" }));
    expect(cardIds()).toEqual([...TOPIC_ORDER]);
    expect(window.location.pathname + window.location.search).toBe(
      "/marketing/campaigns/library",
    );
  });

  it("says how many ads a topic shows, for a screen reader", async () => {
    await renderLibrary();
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Showing all 8 ads.");

    await userEvent.setup().click(screen.getByRole("button", { name: "VA loans 1" }));
    expect(status).toHaveTextContent("Showing 1 ad about VA loans.");
  });

  it("has no search box and no sort control", async () => {
    const { container } = await renderLibrary();

    expect(screen.queryByRole("searchbox")).toBeNull();
    expect(screen.queryByRole("search")).toBeNull();
    expect(screen.queryByRole("combobox")).toBeNull();
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(container.querySelectorAll("input, select, textarea")).toHaveLength(0);
    expect(screen.queryByText(/sort|search/iu)).toBeNull();
  });
});

describe("a library card (009C-AC-011, 009C-AC-013)", () => {
  beforeEach(() => syntheticWorkspace(true));

  it("shows the art, the viewer's brand band, the topic, the name, the words, the version line, and the way in", async () => {
    await renderLibrary();

    for (const { entry } of await activeEntries()) {
      const card = screen.getByRole("article", { name: entry.name });
      // 009C-AC-013: the alternative text is the catalog's, and the art comes from this origin.
      const art = within(card).getByRole("img", { name: entry.images.alt });
      expect(art.getAttribute("src")).toMatch(/^\/api\/ads-library\/samples\//u);
      // The band is text a screen reader reads: the name and the NMLS number.
      expect(within(card).getByText("Alex Morgan")).toBeInTheDocument();
      expect(within(card).getByText("Loan officer, NMLS 0000000")).toBeInTheDocument();
      // PRD-009d's band draws the company and its NMLS number as two lines, so the company wraps
      // instead of being cut off at a card's width.
      expect(within(card).getByText("Prairie Home Lending")).toBeInTheDocument();
      expect(within(card).getByText("NMLS 0000000")).toBeInTheDocument();
      expect(within(card).getByText("Equal Housing Opportunity.")).toBeInTheDocument();
      expect(within(card).getByText(entry.defaults.headline)).toBeInTheDocument();
      // The version line draws its day as a time element, in tabular figures like every date.
      expect(card).toHaveTextContent(
        `Version ${String(entry.version)}. Reviewed ${shortDay(entry.approval.approvedOn)}.`,
      );
      expect(within(card).getByText(shortDay(entry.approval.approvedOn)).tagName).toBe("TIME");
      const use = within(card).getByRole("link", { name: /^Use this ad/u });
      expect(use).toHaveAccessibleName(`Use this ad: ${entry.name}`);
      expect(use).toHaveAttribute(
        "href",
        `/marketing/campaigns/new?step=2&ad=${entry.id}&from=library`,
      );
    }
    expect(document.body).toHaveTextContent("Version 2. Reviewed Sep 28, 2026.");
  });

  it("names each card's topic", async () => {
    await renderLibrary();
    const card = screen.getByRole("article", { name: "Sample: Home loans for veterans" });
    expect(within(card).getByText("VA loans")).toBeInTheDocument();
  });

  it("offers only secondary controls, so no single blue button competes with the ads", async () => {
    const { container } = await renderLibrary();
    for (const use of screen.getAllByRole("link", { name: /^Use this ad/u })) {
      expect(use).toHaveAttribute("data-variant", "action");
    }
    expect(container.querySelectorAll('[data-variant="primary"]')).toHaveLength(0);
  });

  it("never lets a compliance note or an approval block reach the browser", async () => {
    const { container } = await renderLibrary();
    const html = container.innerHTML;
    const library = await loadAdsLibrary({
      environment: { OALO_ENVIRONMENT: "local", [ADS_LIBRARY_SAMPLES_FLAG]: "enabled" },
    });
    for (const { entry } of library.entries) {
      expect(html).not.toContain(entry.compliance.notes);
      expect(html).not.toContain(entry.approval.approvedBy);
      expect(html).not.toContain(entry.images.tall.sha256);
    }
  });
});

describe("the Sample ad label on the library (009C-AC-005)", () => {
  beforeEach(() => syntheticWorkspace(true));

  it("labels every sample card, in words a screen reader reads", async () => {
    await renderLibrary();

    const cards = screen.getAllByRole("article");
    expect(cards).toHaveLength(8);
    for (const card of cards) {
      const label = within(card).getByText("Sample ad");
      expect(label).toBeVisible();
      expect(label.closest("[aria-hidden='true']")).toBeNull();
    }
  });

  it("labels a sample card in the grid however the ads are filtered", async () => {
    await renderLibrary({ topic: "pre-approval" });
    expect(screen.getAllByText("Sample ad")).toHaveLength(2);
  });

  it("puts no label on a real ad", () => {
    const real = TEST_CARDS.map((card) => ({ ...card, sample: false }));
    render(<AdsLibraryScreen data={{ topic: undefined, cards: real, advertiser: PLACEHOLDER_BAND }} />);
    expect(screen.queryByText("Sample ad")).toBeNull();
    expect(screen.getAllByRole("article")).toHaveLength(real.length);
  });
});

describe("a viewer with no Brand yet", () => {
  it("sees the placeholder band on every card, and can still choose an ad", () => {
    render(
      <AdsLibraryScreen
        data={{ topic: undefined, cards: TEST_CARDS, advertiser: PLACEHOLDER_BAND }}
      />,
    );
    expect(screen.getAllByText("Your name and NMLS number go here")).toHaveLength(
      TEST_CARDS.length,
    );
    expect(screen.getAllByRole("link", { name: /^Use this ad/u })).toHaveLength(TEST_CARDS.length);
  });
});

describe("the empty library (009C-AC-012)", () => {
  beforeEach(() => syntheticWorkspace(false));

  it("says so in one sentence, with no chips and no grid", async () => {
    const { container } = await renderLibrary();

    expect(screen.getByText(EMPTY_LIBRARY)).toBeInTheDocument();
    expect(EMPTY_LIBRARY).toBe(
      "No ads in the library yet. New ads are added after they're reviewed, so there's nothing to set up until then.",
    );
    expect(screen.queryByRole("list", { name: "Show ads about" })).toBeNull();
    expect(container.querySelector("[data-ad-card-grid]")).toBeNull();
    expect(screen.queryAllByRole("article")).toHaveLength(0);
    expect(screen.queryAllByRole("link", { name: /^Use this ad/u })).toHaveLength(0);
    // The page still says where it is, and it does not describe ads there are none of.
    expect(screen.getByRole("heading", { level: 1, name: "Campaigns" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: ADS_LIBRARY_HEADING }),
    ).toBeInTheDocument();
    expect(screen.queryByText(ADS_LIBRARY_LEAD)).toBeNull();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("is empty even with the flag set when the environment is not local", async () => {
    syntheticWorkspace(true);
    vi.stubEnv("VERCEL", "1");
    await renderLibrary();
    expect(screen.getByText(EMPTY_LIBRARY)).toBeInTheDocument();
    expect(screen.queryAllByRole("article")).toHaveLength(0);
  });

  it("is empty in the dashboard preview, which has no session", async () => {
    vi.stubEnv("OALO_ENVIRONMENT", "preview");
    vi.stubEnv("OALO_DASHBOARD_PREVIEW", "enabled");
    await renderLibrary();
    expect(screen.getByText(EMPTY_LIBRARY)).toBeInTheDocument();
    expect(redirectCalls).toEqual([]);
  });
});

describe("a visitor with no session", () => {
  it("is sent to sign in, never shown a library with a band that belongs to nobody", async () => {
    vi.stubEnv("OALO_ENVIRONMENT", "production");
    vi.stubEnv("OALO_PROVIDER_MODE", "stub");
    vi.stubEnv("OALO_SYNTHETIC_DATA_ONLY", "true");
    vi.stubEnv("OALO_REVIEW_SURFACE", OALO_REVIEW_SURFACE_AUTHORIZED);

    await expect(AdsLibraryPage({ searchParams: Promise.resolve({}) })).rejects.toThrow(
      "redirected to /sign-in",
    );
    expect(redirectCalls).toEqual(["/sign-in"]);
  });
});
