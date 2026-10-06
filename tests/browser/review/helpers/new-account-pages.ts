import { expect, type Page } from "@playwright/test";

import { LIBRARY_PATH, activeSampleAds, sampleTopicCounts } from "../../helpers/ads-library.js";
import { SAMPLE_ADS } from "../../helpers/launch-an-ad.js";

/**
 * PRD-009g, 009G-AC-001. The pages of a brand-new account that the review run photographs before
 * anything is saved, each with what it has to show before it is photographed, in one place so the
 * empty-account spec, its "stated once" and keyboard cases, and the synthetic server's own dry run of
 * the same assertions all read one list.
 *
 * The pictures are named `<screen>--<state>--<frame>--<theme>.png` under
 * `tests/visual/screens/review/`.
 */

/** A page of a brand-new account, and what it must show before it is photographed. */
export type NewAccountPage = Readonly<{
  /** The screen and state of the baseline, `<screen>--<state>--<frame>--<theme>.png`. */
  screen: string;
  state: string;
  path: string;
  /** Pages whose cards carry art are settled by the library's own wait, not by the network going quiet. */
  hasArt?: boolean;
  ready: (page: Page) => Promise<void>;
}>;

export async function expectOneTitle(page: Page): Promise<void> {
  await expect(page.getByRole("main").getByRole("heading", { level: 1 })).toHaveCount(1);
}

/**
 * Homeowner reports is the one page whose title is not read as a single `h1` here: it is a workspace
 * whose heading structure the report screens own, and the review run has never asserted it. What a
 * photograph needs is a page that has arrived, with a heading on it.
 */
export async function expectAHeading(page: Page): Promise<void> {
  const main = page.getByRole("main");
  await expect(main).toBeVisible();
  await expect(main.getByRole("heading").first()).toBeVisible();
}

export const FIRST_TOPIC = [...sampleTopicCounts().keys()][0] ?? "first-time-buyers";

export const NEW_ACCOUNT_PAGES: readonly NewAccountPage[] = Object.freeze([
  {
    screen: "home",
    state: "first-run",
    path: "/overview",
    ready: async (page) => {
      await expect(
        page.getByRole("heading", {
          level: 1,
          name: "One property. One partner. A stronger first impression.",
        }),
      ).toBeVisible();
      await expect(page.getByRole("heading", { level: 2, name: "Launch an ad" })).toBeVisible();
    },
  },
  {
    screen: "campaigns",
    state: "empty-account",
    path: "/marketing/campaigns",
    ready: async (page) => {
      await expect(page.getByText("No campaigns yet")).toBeVisible();
      await expectOneTitle(page);
    },
  },
  {
    screen: "ads-library",
    state: "all",
    path: LIBRARY_PATH,
    hasArt: true,
    ready: async (page) => {
      await expect(page.locator("[data-ad-card]")).toHaveCount(activeSampleAds().length);
    },
  },
  {
    screen: "ads-library",
    state: "one-topic",
    path: `${LIBRARY_PATH}?topic=${FIRST_TOPIC}`,
    hasArt: true,
    ready: async (page) => {
      await expect(page.locator("[data-ad-card]")).toHaveCount(
        sampleTopicCounts().get(FIRST_TOPIC) ?? -1,
      );
    },
  },
  {
    screen: "launch-an-ad",
    state: "step-1-all",
    path: "/marketing/campaigns/new",
    hasArt: true,
    ready: async (page) => {
      await expect(page.getByRole("heading", { level: 1, name: "Choose an ad" })).toBeVisible();
      await expect(page.locator("[data-ad-card]")).toHaveCount(activeSampleAds().length);
    },
  },
  {
    screen: "launch-an-ad",
    state: "step-1-filtered",
    path: `/marketing/campaigns/new?topic=${FIRST_TOPIC}`,
    hasArt: true,
    ready: async (page) => {
      await expect(page.getByRole("heading", { level: 1, name: "Choose an ad" })).toBeVisible();
      await expect(page.locator("[data-ad-card]")).toHaveCount(
        sampleTopicCounts().get(FIRST_TOPIC) ?? -1,
      );
    },
  },
  {
    screen: "launch-an-ad",
    state: "step-2-first-campaign",
    path: `/marketing/campaigns/new?step=2&ad=${SAMPLE_ADS.firstHome.id}`,
    hasArt: true,
    ready: async (page) => {
      await expect(page.getByRole("heading", { level: 1, name: "Set it up" })).toBeVisible();
      // The area is still empty: this is the first campaign, and nothing has been saved.
      await expect(
        page.getByRole("list", { name: "Places this ad shows" }).getByRole("listitem"),
      ).toHaveCount(0);
    },
  },
  {
    screen: "brand",
    state: "empty-account",
    path: "/brand",
    ready: expectOneTitle,
  },
  {
    screen: "partners",
    state: "empty",
    path: "/partners",
    ready: async (page) => {
      await expect(
        page.getByText("Your ads show only you. Realtor partners never appear in paid ads.", {
          exact: true,
        }),
      ).toBeVisible();
      await expectOneTitle(page);
    },
  },
  { screen: "settings", state: "default", path: "/settings", ready: expectOneTitle },
  {
    screen: "settings-connections",
    state: "empty-account",
    path: "/settings/connections",
    ready: expectOneTitle,
  },
  {
    screen: "homeowners",
    state: "empty-account",
    path: "/homeowners",
    ready: expectAHeading,
  },
]);

/** Every signed-in page a brand-new account can open that has no campaign in it (009G-AC-009). */
export const EVERY_PAGE_WITHOUT_A_CAMPAIGN: readonly string[] = Object.freeze([
  ...NEW_ACCOUNT_PAGES.map((entry) => entry.path),
  "/settings/account",
  "/settings/routing",
  "/settings/billing",
]);
