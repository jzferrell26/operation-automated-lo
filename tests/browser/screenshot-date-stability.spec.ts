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

test("rolling list dates cannot resize adjacent columns and their real values are restored", async ({
  page,
}) => {
  await page.setContent(`<main data-campaigns-page><section data-campaign-table><table style="font:14px Arial"><tbody>
    <tr><td>First-time buyers</td><td>Until <time datetime="2026-10-16">Oct 16</time></td>
    <td>Ready for approval</td><td><time datetime="2026-10-02T14:00:00Z">Oct 2</time></td></tr>
    </tbody></table></section><ul data-campaign-cards><li>Until <time datetime="2026-10-16">Oct 16</time></li></ul>
    <p id="outside-list">Other event <time datetime="2030-12-25">Dec 25, 2030</time></p></main>`);
  const reference = await page.locator("main").screenshot();
  const times = page.locator("[data-campaign-table] time, [data-campaign-cards] time");
  await times.evaluateAll((elements) => {
    for (const element of elements) element.textContent = "Sep 30, 2030";
  });
  const actual = await page.locator("main").screenshot();
  expect(actual.equals(reference)).toBe(false);
  const normalized = await withStableCampaignScheduleDates(page, async () => {
    await expect(page.locator("#outside-list")).toHaveText("Other event Dec 25, 2030");
    await expect(times.first()).toHaveAttribute("datetime", "2026-10-16");
    return page.locator("main").screenshot();
  });
  expect(normalized.equals(reference)).toBe(true);
  for (const time of await times.all()) await expect(time).toHaveText("Sep 30, 2030");
  await expect(page.locator("[data-review-original-schedule-label]")).toHaveCount(0);
});

test("failed list captures restore dates and malformed content is not normalized away", async ({
  page,
}) => {
  await page.setContent(`<main data-campaigns-page><ul data-campaign-cards><li>
    <time datetime="2030-12-25">Dec 25, 2030</time></li></ul></main>`);
  await expect(
    withStableCampaignScheduleDates(page, async () => {
      throw new Error("Capture failed");
    }),
  ).rejects.toThrow("Capture failed");
  await expect(page.locator("time")).toHaveText("Dec 25, 2030");
  await page.locator("time").evaluate((element) => {
    element.textContent = "Unexpected status";
  });
  await expect(withStableCampaignScheduleDates(page, async () => undefined)).rejects.toThrow(
    "single readable date label",
  );
  await expect(page.locator("time")).toHaveText("Unexpected status");
});
