import { expect, test, type Page } from "@playwright/test";

import {
  REVIEW_FRAMES,
  expectAxeClean,
  expectNoHorizontalOverflow,
  expectTargetsAreLargeEnough,
  expectThemeResolved,
  settleForScreenshot,
  useStoredTheme,
} from "./helpers/design-quality.js";
import { campaignRefOf, saveACampaign, SAMPLE_ADS } from "./helpers/launch-an-ad.js";
import {
  POPULATED_CAMPAIGNS,
  withAPopulatedCampaignWorkspace,
} from "./helpers/populated-campaign-workspace.js";
import { withAnEmptyCampaignWorkspace } from "./helpers/empty-campaign-workspace.js";

/**
 * PRD-009e, in a browser: the Campaigns list and the campaign page (009E-AC-001 to 007, 009, 011).
 *
 * These are the synthetic server's pages. The database-backed half (the approver's recorded name, the
 * versions of a campaign, another location's answer) runs in the review project, in
 * `review/review-campaign-page.spec.ts`. Every address here is relative, so the spec runs against
 * whichever server the project starts.
 */

/** Where a request that is not for this application would go; the page asks for none. */
async function noExternalRequests(page: Page): Promise<string[]> {
  const origin = new URL(page.url() === "about:blank" ? "http://127.0.0.1" : page.url()).origin;
  const outside: string[] = [];
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.protocol.startsWith("http") && url.hostname !== new URL(origin).hostname) {
      outside.push(route.request().url());
      await route.abort();
      return;
    }
    await route.continue();
  });
  return outside;
}

const THEMES = ["light", "dark"] as const;

test.describe("the Campaigns list (009E-AC-009)", () => {
  test("is a table from 720px up and cards below it, with the six columns and no overflow", async ({
    page,
  }) => {
    test.setTimeout(240_000);
    await withAPopulatedCampaignWorkspace(page, async () => {
      for (const [width, layout] of [
        [1440, "table"],
        [1180, "table"],
        [768, "table"],
        [720, "table"],
        [719, "cards"],
        [390, "cards"],
      ] as const) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto("/marketing/campaigns");
        // The page streams in behind a loading screen; wait for it before counting anything.
        await expect(page.getByRole("heading", { level: 1, name: "Campaigns" })).toBeVisible();
        const table = page.locator("[data-campaign-table]");
        const cards = page.locator("[data-campaign-cards]");
        if (layout === "table") {
          await expect(table, `${String(width)}px`).toBeVisible();
          await expect(cards, `${String(width)}px`).toBeHidden();
          const headers = table.getByRole("columnheader");
          await expect(headers).toHaveText([
            "Ad",
            "Topic",
            "Runs",
            "Where it shows",
            "Status",
            "Last change",
          ]);
          // Every column is inside the card the table sits in: nothing is cut off at the edge.
          const fits = await table.evaluate((wrapper) => {
            const inner = wrapper.querySelector("table");
            return inner !== null && inner.scrollWidth <= wrapper.clientWidth + 1;
          });
          expect(fits, `${String(width)}px: the table fits its card`).toBe(true);
          await expect(table.locator("[data-campaign-row]")).toHaveCount(
            POPULATED_CAMPAIGNS.length,
          );
        } else {
          await expect(cards, `${String(width)}px`).toBeVisible();
          await expect(table, `${String(width)}px`).toBeHidden();
          await expect(cards.getByRole("listitem")).toHaveCount(POPULATED_CAMPAIGNS.length);
        }
        await expectNoHorizontalOverflow(page);
      }
    });
  });

  test("lists the newest change first, each ad's name as the link, with one primary action and no search", async ({
    page,
  }) => {
    test.setTimeout(240_000);
    await withAPopulatedCampaignWorkspace(page, async () => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto("/marketing/campaigns");
      const main = page.getByRole("main");

      await expect(main.getByRole("heading", { level: 1, name: "Campaigns" })).toBeVisible();
      const tabs = main.getByRole("navigation", { name: "Campaigns sections" });
      await expect(tabs.getByRole("link", { name: "Your campaigns" })).toHaveAttribute(
        "aria-current",
        "page",
      );
      await expect(tabs.getByRole("link", { name: "Ads library" })).toHaveAttribute(
        "href",
        "/marketing/campaigns/library",
      );
      await expect(main.getByRole("link", { name: "Launch an ad" })).toHaveCount(1);
      await expect(main.locator("input, select, [role='search']")).toHaveCount(0);
      const rows = main.locator("[data-campaign-table] [data-campaign-row]");
      for (const [index, campaign] of [...POPULATED_CAMPAIGNS].reverse().entries()) {
        const row = rows.nth(index);
        await expect(row.getByRole("link", { name: campaign.ad.name })).toBeVisible();
        await expect(row).toContainText(campaign.verdict);
        // The thumbnail is decorative: an empty alternative, and hidden from a screen reader.
        await expect(row.locator("img")).toHaveAttribute("alt", "");
        await expect(row.getByText("Sample ad")).toBeVisible();
      }
      // The first row opens its campaign.
      await rows.first().getByRole("link").first().click();
      await expect(page).toHaveURL(/\/marketing\/campaigns\/campaign_[A-Za-z0-9]+$/u);
    });
  });

  for (const theme of THEMES) {
    test(`meets the accessibility and target-size bar in ${theme}, at the narrowest and widest frames`, async ({
      page,
    }) => {
      test.setTimeout(240_000);
      await withAPopulatedCampaignWorkspace(page, async () => {
        await useStoredTheme(page, theme);
        for (const frame of [REVIEW_FRAMES[0], REVIEW_FRAMES[3]]) {
          await page.setViewportSize({ width: frame.width, height: frame.height });
          await page.goto("/marketing/campaigns");
          await expectThemeResolved(page, theme);
          await settleForScreenshot(page);
          await expectAxeClean(page);
          await expectTargetsAreLargeEnough(page);
        }
      });
    });
  }

  test("says there are no campaigns yet, with the one primary action inside the empty state", async ({
    page,
  }) => {
    await withAnEmptyCampaignWorkspace(async () => {
      await page.goto("/marketing/campaigns");
      const empty = page.locator(".oalo-async-state[data-state='empty']");

      await expect(empty.getByRole("heading", { name: "No campaigns yet" })).toBeVisible();
      await expect(
        empty.getByText("Pick an ad from the library to set up your first one."),
      ).toBeVisible();
      await expect(page.getByRole("main").getByRole("link", { name: "Launch an ad" })).toHaveCount(
        1,
      );
      await expect(empty.getByRole("link", { name: "Launch an ad" })).toHaveAttribute(
        "href",
        "/marketing/campaigns/new",
      );
    });
  });
});

test.describe("the campaign page (009E-AC-001 to 007)", () => {
  test("shows the header, results, ad, approval, versions, and support details, at every frame", async ({
    page,
  }) => {
    test.setTimeout(240_000);
    const outside = await noExternalRequests(page);
    await withAnEmptyCampaignWorkspace(async () => {
      await page.setViewportSize({ width: 1440, height: 900 });
      const campaignRef = await saveACampaign(page, {
        ad: SAMPLE_ADS.firstHome,
        place: "Austin, TX",
      });

      for (const frame of REVIEW_FRAMES) {
        await page.setViewportSize({ width: frame.width, height: frame.height });
        await page.goto(`/marketing/campaigns/${campaignRef}`);
        const main = page.getByRole("main");

        await expect(main.getByText("From the ads library, First-time buyers")).toBeVisible();
        await expect(
          main.getByRole("heading", { level: 1, name: SAMPLE_ADS.firstHome.name }),
        ).toBeVisible();
        await expect(main.getByText(/^Runs from launch until .*, in Austin, TX/u)).toBeVisible();

        // The two actions, and the launch button's one sentence directly under them.
        const launch = main.getByRole("button", { name: "Launch on Facebook" });
        await expect(launch).toBeDisabled();
        await expect(main.getByRole("link", { name: "Make a new version" })).toBeVisible();
        const reasonId = await launch.getAttribute("aria-describedby");
        await expect(page.locator(`[id="${reasonId ?? ""}"]`)).toContainText(
          "Launching on Facebook isn't turned on yet, and it needs Meta connected. See what's needed for Meta.",
        );

        // The results card comes first and counts nothing yet.
        const results = main.getByRole("region", { name: "Results" });
        await expect(results.getByText("Not live yet")).toHaveCount(4);
        expect(await results.innerText()).not.toMatch(/\d/u);

        // The ad, with the brand band and the sample label; the approval; the versions.
        const ad = main.getByRole("region", { name: "The ad" });
        await expect(ad.getByText("Version 1")).toBeVisible();
        await expect(ad.getByText("Sample ad")).toBeVisible();
        await expect(ad.getByText("Headline unchanged. Ad text unchanged")).toBeVisible();
        await expect(ad.getByText("Austin, TX and everything within 15 miles")).toBeVisible();
        await expect(main.getByRole("region", { name: "Approval" })).toContainText(
          "Nobody has approved this version yet.",
        );
        await expect(main.getByRole("region", { name: "Versions" })).toContainText("Version 1");

        // The support details are collapsed, and nothing outside them shows a reference.
        const details = main.locator("details[data-support-details]");
        await expect(details).toHaveCount(1);
        expect(await details.evaluate((node) => (node as HTMLDetailsElement).open)).toBe(false);
        const outsideDetails = await main.evaluate((node) => {
          const clone = node.cloneNode(true) as HTMLElement;
          clone.querySelectorAll("[data-support-details]").forEach((child) => child.remove());
          return clone.innerText;
        });
        expect(outsideDetails).not.toMatch(/campaign_|campaignversion_|sample-first-home/u);

        await expectNoHorizontalOverflow(page);
      }
    });
    expect(outside).toEqual([]);
  });

  for (const theme of THEMES) {
    test(`meets the accessibility and target-size bar in ${theme}`, async ({ page }) => {
      test.setTimeout(240_000);
      await withAnEmptyCampaignWorkspace(async () => {
        await useStoredTheme(page, theme);
        await page.setViewportSize({ width: 1440, height: 900 });
        const campaignRef = await saveACampaign(page, {
          ad: SAMPLE_ADS.preApproval,
          place: "Austin, TX",
          headline: "Rates as low as 3.5% this week",
        });
        for (const frame of [REVIEW_FRAMES[0], REVIEW_FRAMES[3]]) {
          await page.setViewportSize({ width: frame.width, height: frame.height });
          await page.goto(`/marketing/campaigns/${campaignRef}`);
          await expectThemeResolved(page, theme);
          await settleForScreenshot(page);
          // The checks sent this version back with plain fixes, which the page lists.
          await expect(page.getByRole("region", { name: "What to fix" })).toBeVisible();
          await expectAxeClean(page);
          await expectTargetsAreLargeEnough(page);
        }
      });
    });
  }

  test("opens step 2 prefilled with the same ad and words from Make a new version", async ({
    page,
  }) => {
    test.setTimeout(240_000);
    await withAnEmptyCampaignWorkspace(async () => {
      await page.setViewportSize({ width: 1440, height: 900 });
      const campaignRef = await saveACampaign(page, {
        ad: SAMPLE_ADS.firstHome,
        place: "Austin, TX",
        headline: "Your first home starts with a plan",
      });
      await page.goto(`/marketing/campaigns/${campaignRef}`);

      await page.getByRole("link", { name: "Make a new version" }).click();

      await expect(page.getByRole("heading", { level: 1, name: "Set it up" })).toBeVisible();
      expect(campaignRefOf(page.url())).toBe(campaignRef);
      await expect(page.getByLabel("Headline", { exact: false })).toHaveValue(
        "Your first home starts with a plan",
      );
      await expect(
        page
          .getByRole("list", { name: "Places this ad shows" })
          .getByRole("listitem")
          .filter({ hasText: "Austin, TX" }),
      ).toHaveCount(1);
    });
  });
});

test.describe("an older version's address (009E-AC-005)", () => {
  test("answers not found for a number that is not a positive integer or a version that never was, and sends the newest to the campaign", async ({
    page,
  }) => {
    test.setTimeout(240_000);
    await withAnEmptyCampaignWorkspace(async () => {
      await page.setViewportSize({ width: 1440, height: 900 });
      const campaignRef = await saveACampaign(page, {
        ad: SAMPLE_ADS.firstHome,
        place: "Austin, TX",
      });

      // The app answers a missing page with its own not-found screen (the shell has already begun
      // streaming by then, so the status line alone cannot tell), so every address below must show
      // exactly what an unknown reference shows, and none of the campaign.
      const main = page.getByRole("main");
      await page.goto("/marketing/campaigns/campaign_neverSavedAnywhere001");
      await expect(main).toContainText("This page could not be found");
      for (const typed of ["0", "-1", "1.5", "abc", "01", "99"]) {
        await page.goto(`/marketing/campaigns/${campaignRef}/versions/${typed}`);
        await expect(main, `version ${typed}`).toContainText("This page could not be found");
        await expect(main, `version ${typed}`).not.toContainText("Version");
      }

      // The newest version has the campaign's own address.
      await page.goto(`/marketing/campaigns/${campaignRef}/versions/1`);
      await expect(page).toHaveURL(new RegExp(`/marketing/campaigns/${campaignRef}$`, "u"));
    });
  });
});
