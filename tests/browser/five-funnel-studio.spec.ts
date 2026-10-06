import { expect, test } from "@playwright/test";
import { AxeBuilder } from "@axe-core/playwright";
import { FUNNELS } from "../../apps/web/src/features/funnels/catalog.js";

for (const width of [1440, 390]) {
  for (const funnel of FUNNELS) {
    test(`${funnel.kind} saves field edits and renders every step at ${width}`, async ({
      page,
    }, testInfo) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(`/marketing/campaigns/funnels/${funnel.kind}`);
      await expect(page.getByRole("heading", { name: funnel.name, level: 1 })).toBeVisible();
      const headlines = {
        "live-webinar": "Your path to homeownership. Explained live.",
        "on-demand": "A smarter starting point. On your schedule.",
        buyer: "A clear plan for the place you'll call home.",
        refinance: "Make your mortgage part of your next chapter.",
        "lead-magnet": "Good questions. Better next steps.",
      };
      const headline = headlines[funnel.kind];
      await page.getByLabel("Main headline", { exact: true }).fill(headline);
      await expect(page.locator("[data-funnel-surface] h2").first()).toHaveText(headline);
      await page.getByRole("button", { name: "Save changes", exact: true }).click();
      await expect(page.getByRole("status")).toHaveText("Changes saved");
      await page.reload();
      await expect(page.getByLabel("Main headline", { exact: true })).toHaveValue(headline);
      await page.goto(`/marketing/campaigns/funnels/${funnel.kind}/preview`);
      await expect(page.locator("[data-funnel-surface]")).toBeVisible();
      if (width === 1440) {
        const box = await page.locator("[data-funnel-surface]").boundingBox();
        expect(box?.width).toBeGreaterThan(1000);
      }
      for (const step of funnel.steps) {
        await page
          .getByRole("navigation", { name: "Funnel pages" })
          .getByRole("button", { name: step.label, exact: true })
          .click();
        await expect(page.locator("[data-funnel-surface]")).toHaveAttribute("data-step", step.id);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        );
        const axe = await new AxeBuilder({ page }).analyze();
        expect(axe.violations).toEqual([]);
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.screenshot({
          path: testInfo.outputPath(`${funnel.kind}-${step.id}-${width}.png`),
          fullPage: true,
        });
      }
      expect(errors).toEqual([]);
    });
  }
}

test("five cards, real photo upload, saved media and no client-defined layout", async ({
  page,
}, testInfo) => {
  await page.goto("/marketing/campaigns/funnels");
  await expect(
    page.getByRole("heading", { name: "Five funnels. Already designed." }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Edit funnel", exact: true })).toHaveCount(5);
  await page.screenshot({ path: testInfo.outputPath("funnel-catalog.png"), fullPage: true });
  await page.goto("/marketing/campaigns/funnels/live-webinar");
  await page.getByLabel("Edit section").selectOption("photos");
  const data = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 960;
    canvas.height = 720;
    const ctx = canvas.getContext("2d")!;
    const gradient = ctx.createLinearGradient(0, 0, 960, 720);
    gradient.addColorStop(0, "#153c59");
    gradient.addColorStop(1, "#4e948c");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 960, 720);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 52px sans-serif";
    ctx.fillText("YOUR WEBINAR", 80, 200);
    ctx.font = "26px sans-serif";
    ctx.fillText("Original test artwork", 80, 250);
    return canvas.toDataURL("image/png").split(",")[1]!;
  });
  const uploaded = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/funnels/photo") && response.request().method() === "POST",
  );
  await page.getByLabel("Replace cover photo", { exact: true }).setInputFiles({
    name: "original-test-artwork.png",
    mimeType: "image/png",
    buffer: Buffer.from(data, "base64"),
  });
  expect((await uploaded).status()).toBe(200);
  await expect(page.getByLabel("Cover photo description", { exact: true })).toBeVisible();
  await page
    .getByLabel("Cover photo description", { exact: true })
    .fill("Original webinar artwork for testing");
  await page
    .getByLabel("I have permission to use these photos in this funnel.", { exact: true })
    .check();
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Changes saved");
  await page.reload();
  await expect(page.locator("[data-funnel-surface] img").first()).toHaveAttribute(
    "alt",
    "Original webinar artwork for testing",
  );
  const originalPhoto = await page.locator("[data-funnel-surface] img").first().getAttribute("src");
  await page.getByLabel("Main headline", { exact: true }).fill("Your next homebuying chapter");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Changes saved");
  expect(await page.locator("[data-funnel-surface] img").first().getAttribute("src")).toBe(
    originalPhoto,
  );
  await expect(
    page.locator("[contenteditable], textarea[name='html'], [draggable='true']"),
  ).toHaveCount(0);
});

test("a preview never claims a registration and its calendar is explicitly a preview", async ({
  page,
}) => {
  await page.goto("/marketing/campaigns/funnels/live-webinar");
  await page.getByLabel("Edit section").selectOption("details");
  await page.getByLabel("Event starts (your device time zone)").fill("2030-10-12T15:00");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Changes saved");
  const writes: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST") writes.push(request.url());
  });
  await page
    .getByRole("navigation", { name: "Funnel pages" })
    .getByRole("button", { name: "Confirmation", exact: true })
    .click();
  await expect(page.getByRole("link", { name: /^Google Calendar/u })).toHaveAttribute(
    "href",
    /calendar\.google\.com\/calendar\/render\?/u,
  );
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Apple / Outlook (.ics)", exact: true }).click();
  expect((await download).suggestedFilename()).toBe("webinar-preview.ics");
  expect(writes).toEqual([]);
});

for (const theme of ["light", "dark"] as const) {
  for (const width of [1440, 1180, 768, 390]) {
    test(`field-only editor at ${width} in ${theme} has readable controls and a working form preview`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.addInitScript(
        (value) => localStorage.setItem("oalo:theme-preference", value),
        theme,
      );
      await page.goto("/marketing/campaigns/funnels/live-webinar");
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      await expect(page.getByLabel("Main headline", { exact: true })).toBeVisible();
      const replaceCover = page
        .locator("[data-funnel-surface]")
        .getByRole("button", { name: "Replace cover photo", exact: true });
      await replaceCover.click();
      await expect(page.getByLabel("Edit section")).toHaveValue("photos");
      await expect(page.getByLabel("Replace cover photo", { exact: true })).toBeFocused();
      await page.getByLabel("Edit section").selectOption("message");
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.screenshot({
        path: testInfo.outputPath(`editor-${width}-${theme}.png`),
        fullPage: true,
      });
      await page
        .locator("[data-funnel-surface]")
        .getByRole("button", { name: "Reserve my spot", exact: true })
        .first()
        .click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      await expect(dialog.getByLabel("Email address", { exact: true })).toBeDisabled();
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      await dialog.getByRole("button", { name: "Continue preview" }).click();
      await expect(page.locator("[data-funnel-surface]")).toHaveAttribute(
        "data-step",
        "confirmation",
      );
      await expect(page.locator("[data-funnel-surface] h2").first()).toBeFocused();
    });
  }
}
