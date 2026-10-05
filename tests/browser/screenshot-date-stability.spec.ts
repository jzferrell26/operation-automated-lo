import { expect, test } from "@playwright/test";
import { readableDay } from "../../apps/web/src/features/campaigns/launch-model.js";
import { withStableCampaignScheduleDates } from "./helpers/design-quality.js";

/** Isolated harness regression, not a new product screenshot baseline or a mocked campaign flow. */
test("a rolling campaign date cannot move adjacent copy in its screenshot", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 300 });
  await page.setContent(`<!doctype html><html lang="en"><body>
    <main data-campaign-page="library-ad"><header>
      <p style="font:16px Arial;width:358px">Set to run from launch until <time datetime="2026-10-16">Fri, Oct 16, 2026</time>, in Austin, TX. $25 a day, up to $350 in total.</p>
    </header><p id="outside">Permission required <time datetime="2026-10-05">Oct 5, 2026</time></p></main>
    </body></html>`);
  const date = page.locator("header time");
  const render = () => page.locator("main").screenshot({ animations: "disabled" });
  const reference = await render();

  for (const iso of ["2026-10-19", "2027-09-01", "2030-12-25"]) {
    const label = readableDay(iso);
    await date.evaluate(
      (element, value) => {
        element.setAttribute("datetime", value.iso);
        element.textContent = value.label;
      },
      { iso, label },
    );
    expect((await render()).equals(reference)).toBe(false);
    const normalized = await withStableCampaignScheduleDates(page, async () => {
      await expect(date).toHaveAttribute("datetime", iso);
      await expect(page.locator("#outside")).toHaveText("Permission required Oct 5, 2026");
      return render();
    });
    expect(normalized.equals(reference)).toBe(true);
    await expect(date).toHaveText(label);
    await expect(date).toHaveAttribute("datetime", iso);
    await expect(page.locator("[data-review-original-schedule-label]")).toHaveCount(0);
  }

  // A real typography regression still changes the image; no surrounding sentence is masked.
  await page.locator("header p").evaluate((element) => {
    if (element instanceof HTMLElement) element.style.fontSize = "20px";
  });
  const changed = await withStableCampaignScheduleDates(page, render);
  expect(changed.equals(reference)).toBe(false);
});

test("a failed screenshot restores the actual schedule label", async ({ page }) => {
  await page.setContent(`<main data-campaign-page="library-ad"><header>
    <time datetime="2026-10-19">Mon, Oct 19, 2026</time></header></main>`);
  await expect(
    withStableCampaignScheduleDates(page, async () => {
      throw new Error("Intentional capture failure");
    }),
  ).rejects.toThrow("Intentional capture failure");
  await expect(page.locator("time")).toHaveText("Mon, Oct 19, 2026");
  await expect(page.locator("time")).toHaveAttribute("datetime", "2026-10-19");
  await expect(page.locator("[data-review-original-schedule-label]")).toHaveCount(0);
});

test("date stabilization refuses unexpected header markup instead of erasing it", async ({
  page,
}) => {
  await page.setContent(`<main data-campaign-page="library-ad"><header>
    <time datetime="2026-10-19"><strong>Mon, Oct 19, 2026</strong></time></header></main>`);
  let captured = false;
  await expect(
    withStableCampaignScheduleDates(page, async () => {
      captured = true;
    }),
  ).rejects.toThrow("single readable date label");
  expect(captured).toBe(false);
  await expect(page.locator("time strong")).toHaveText("Mon, Oct 19, 2026");
});
