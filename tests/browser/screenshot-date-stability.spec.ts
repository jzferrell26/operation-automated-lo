import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { readableDay } from "../../apps/web/src/features/campaigns/launch-model.js";
import { withStableCampaignScheduleDates } from "./helpers/design-quality.js";

test("launch summary capture preserves the original Inter date wrapping", async ({ page }) => {
  const font = (await readFile("apps/web/public/fonts/InterVariable.woff2")).toString("base64");
  await page.setContent(`<style>
    @font-face {font-family:ReviewInter;src:url(data:font/woff2;base64,${font}) format('woff2');font-weight:100 900}
    main {font:500 14px/21px ReviewInter} dl,dd {margin:0}
    dd {overflow-wrap:anywhere;text-wrap:pretty}
    dl>div {display:grid;grid-template-columns:128px 246px;gap:12px}
    time {font-variant-numeric:tabular-nums;white-space:nowrap}
    </style><main data-launch-step="3"><dl><div><dt>Dates</dt><dd>From launch until <time datetime="2026-10-30">Fri, Oct 30, 2026</time></dd></div></dl></main>`);
  await page.evaluate(() => document.fonts.ready);
  const geometry = () =>
    page.locator("time").evaluate((date) => {
      const parent = date.parentElement;
      if (parent === null) throw new Error("Expected schedule value");
      const prefix = document.createRange();
      prefix.selectNodeContents(parent.firstChild ?? parent);
      return {
        offset: date.getBoundingClientRect().top - parent.getBoundingClientRect().top,
        width: date.getBoundingClientRect().width,
        valueWidth: parent.getBoundingClientRect().width,
        font: getComputedStyle(date).font,
        text: date.textContent,
        prefixWidth: prefix.getBoundingClientRect().width,
      };
    });
  expect((await geometry()).offset).toBeLessThan(21);
  await withStableCampaignScheduleDates(page, async () => {
    // The unchanged Linux original has a125px mask on the second21px line, not an inline date.
    const actual = await geometry();
    expect(actual.offset, JSON.stringify(actual)).toBeGreaterThanOrEqual(21);
    expect(actual.offset).toBeLessThan(42);
    expect(actual.width).toBeGreaterThanOrEqual(125);
    expect(actual.width).toBeLessThan(134);
    await expect(page.locator("time")).toHaveAttribute("datetime", "2026-10-30");
    await expect(page.locator("dd")).toContainText("From launch until");
  });
  await expect(page.locator("time")).toHaveText("Fri, Oct 30, 2026");
  await expect(page.locator("[data-review-original-schedule-label]")).toHaveCount(0);
});

test("rolling launch-review summary dates preserve the original wrapping in every decision state", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 300 });
  for (const state of ["needs-changes", "ready", "approved", "sent-back", "retired"]) {
    await page.setContent(`<main data-launch-step="3" data-review-state="${state}">
      <dl style="font:16px Arial;width:230px"><div><dt>Dates</dt><dd>From launch until <time datetime="2026-11-18">Wed, Nov 18, 2026</time></dd></div></dl>
      <p id="unrelated">Other event <time datetime="2030-12-25">Dec 25, 2030</time></p></main>`);
    const date = page.locator("dl time");
    const render = () => page.locator("main").screenshot({ animations: "disabled" });
    const reference = await render();
    await date.evaluate((element) => {
      element.setAttribute("datetime", "2026-10-30");
      element.textContent = "Fri, Oct 30, 2026";
    });
    expect((await render()).equals(reference)).toBe(false);
    const normalized = await withStableCampaignScheduleDates(page, async () => {
      await expect(date).toHaveAttribute("datetime", "2026-10-30");
      await expect(page.locator("#unrelated")).toHaveText("Other event Dec 25, 2030");
      return render();
    });
    expect(normalized.equals(reference), state).toBe(true);
    await expect(date).toHaveText("Fri, Oct 30, 2026");
    await expect(page.locator("[data-review-original-schedule-label]")).toHaveCount(0);
    await expect(
      withStableCampaignScheduleDates(page, async () => {
        throw new Error("Intentional summary capture failure");
      }),
    ).rejects.toThrow("Intentional summary capture failure");
    await expect(date).toHaveText("Fri, Oct 30, 2026");
    await page.locator("dt").evaluate((element) => {
      element.textContent = "Dates changed";
    });
    expect((await withStableCampaignScheduleDates(page, render)).equals(reference)).toBe(false);
  }
});

test("launch-review date capture refuses malformed content before changing the page", async ({
  page,
}) => {
  await page.setContent(`<main data-launch-step="3"><dl><div><dd>
    <time datetime="2026-10-30"><strong>Fri, Oct 30, 2026</strong></time>
    </dd></div></dl></main>`);
  let captured = false;
  await expect(
    withStableCampaignScheduleDates(page, async () => {
      captured = true;
    }),
  ).rejects.toThrow("single readable date label");
  expect(captured).toBe(false);
  await expect(page.locator("time strong")).toHaveText("Fri, Oct 30, 2026");
});

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

const timestampFixture = `<main style="font:16px Arial;width:358px">
  <section data-campaign-page="library-ad">
    <section data-approval-section><div><p>Approved by Dana Reyes, workspace owner, on <time datetime="2026-10-04T14:00:00Z">Oct 4, 2026</time>.</p></div></section>
    <section data-versions><div><ol><li><p>Saved on <time datetime="2026-10-04T13:00:00Z">Oct 4, 2026</time> by you</p><p>Approved by Dana on <time datetime="2026-10-04T14:00:00Z">Oct 4, 2026</time>.</p></li></ol></div></section>
  </section>
  <section data-launch-step="3" data-review-state="approved"><section data-decision-card="approved"><p>Approved by Dana Reyes on <time datetime="2026-10-04T14:00:00Z">Oct 4, 2026</time>. The approval covers this version only.</p></section></section>
  <section data-launch-step="3" data-review-state="retired"><section data-decision-card="retired"><p>Retired on <time datetime="2026-10-04">Oct 4, 2026</time>.</p></section></section>
  <section data-campaign-page="earlier-flow"><section data-versions><div><ol><li><p>Saved on <time datetime="2026-10-04T13:00:00Z">Oct 4, 2026</time></p></li></ol></div></section></section>
  <p id="unrelated">Other event <time datetime="2030-12-25">Dec 25, 2030</time></p>
</main>`;

const timestampSelector =
  "[data-campaign-page='library-ad'] time, [data-review-state='approved'] time";

test("rolling approval and version timestamps keep capture geometry without changing their records", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.setContent(timestampFixture);
  const dates = page.locator(timestampSelector);
  await expect(dates).toHaveCount(4);
  const render = () => page.locator("main").screenshot({ animations: "disabled" });
  const reference = await render();
  const unchanged = await page
    .locator("[data-review-state='retired'], [data-campaign-page='earlier-flow'], #unrelated")
    .evaluateAll((elements) => elements.map((element) => element.outerHTML));

  for (const [label, iso] of [
    ["Oct 13, 2026", "2026-10-13T14:00:00Z"],
    ["Sep 30, 2030", "2030-09-30T14:00:00Z"],
    ["Dec 25, 2040", "2040-12-25T14:00:00Z"],
  ] as const) {
    await dates.evaluateAll(
      (elements, value) => {
        for (const element of elements) {
          element.textContent = value.label;
          element.setAttribute("datetime", value.iso);
        }
      },
      { label, iso },
    );
    expect((await render()).equals(reference)).toBe(false);
    const datetimeBefore = await dates.evaluateAll((elements) =>
      elements.map((element) => element.getAttribute("datetime")),
    );
    const captured = await withStableCampaignScheduleDates(page, async () => {
      for (const date of await dates.all()) await expect(date).toHaveText("Oct 4, 2026");
      expect(
        await dates.evaluateAll((elements) =>
          elements.map((element) => element.getAttribute("datetime")),
        ),
      ).toEqual(datetimeBefore);
      expect(
        await page
          .locator("[data-review-state='retired'], [data-campaign-page='earlier-flow'], #unrelated")
          .evaluateAll((elements) => elements.map((element) => element.outerHTML)),
      ).toEqual(unchanged);
      return render();
    });
    expect(captured.equals(reference)).toBe(true);
    for (const date of await dates.all()) await expect(date).toHaveText(label);
    expect(
      await dates.evaluateAll((elements) =>
        elements.map((element) => element.getAttribute("datetime")),
      ),
    ).toEqual(datetimeBefore);
    await expect(page.locator("[data-review-original-schedule-label]")).toHaveCount(0);
  }

  await page.locator("[data-decision-card='approved'] p").evaluate((element) => {
    if (element instanceof HTMLElement) element.style.fontSize = "20px";
  });
  expect((await withStableCampaignScheduleDates(page, render)).equals(reference)).toBe(false);
});

test("failed timestamp captures restore every label and reject malformed nodes before mutation", async ({
  page,
}) => {
  await page.setContent(timestampFixture);
  const before = await page.locator("main").innerHTML();
  await expect(
    withStableCampaignScheduleDates(page, async () => {
      throw new Error("Timestamp capture failed");
    }),
  ).rejects.toThrow("Timestamp capture failed");
  expect(await page.locator("main").innerHTML()).toBe(before);

  await page.locator("[data-decision-card='approved'] time").evaluate((element) => {
    element.innerHTML = "<strong>Oct 4, 2026</strong>";
  });
  const malformed = await page.locator("main").innerHTML();
  await expect(withStableCampaignScheduleDates(page, async () => undefined)).rejects.toThrow(
    "single readable date label",
  );
  expect(await page.locator("main").innerHTML()).toBe(malformed);

  await page.setContent(timestampFixture);
  await page.locator("[data-approval-section] time").evaluate((element) => {
    element.removeAttribute("datetime");
  });
  const missingTimestamp = await page.locator("main").innerHTML();
  await expect(withStableCampaignScheduleDates(page, async () => undefined)).rejects.toThrow(
    "single readable date label",
  );
  expect(await page.locator("main").innerHTML()).toBe(missingTimestamp);
});

test("unexpected existing normalization markers are refused and preserved", async ({ page }) => {
  await page.setContent(timestampFixture);
  await page.locator("[data-approval-section] time").evaluate((element) => {
    element.setAttribute("data-review-original-schedule-label", "Owned by another capture");
  });
  const before = await page.locator("main").innerHTML();
  await expect(withStableCampaignScheduleDates(page, async () => undefined)).rejects.toThrow(
    "single readable date label",
  );
  expect(await page.locator("main").innerHTML()).toBe(before);
});
