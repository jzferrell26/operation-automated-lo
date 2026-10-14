import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import {
  REVIEW_FRAMES,
  expectAxeClean,
  expectNoHorizontalOverflow,
  settleForScreenshot,
  useStoredTheme,
  warmFullPageCapture,
} from "./helpers/design-quality.js";
import { WEBINAR_CONTEXT_FIXTURE as contextFixture } from "../../apps/web/src/features/webinar-ads/preparation.test-support.js";

// Explicit synthetic context/refusal fixtures in a production-built local shell.
// This suite does not prove persistence, RSC campaign reads, approval or provider behavior.
for (const frame of REVIEW_FRAMES)
  for (const theme of ["light", "dark"] as const) {
    test(`webinar setup and exact uncertain retry at ${frame.width}px in ${theme}`, async ({
      page,
    }) => {
      test.setTimeout(90_000);
      const bodies: unknown[] = [],
        errors: string[] = [],
        consoleErrors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(message.text());
      });
      await page.route("**/api/campaigns/webinar-ads/context", (route) =>
        route.fulfill({ json: contextFixture }),
      );
      await page.route("**/api/campaigns/webinar-ads", (route) => {
        bodies.push(route.request().postDataJSON());
        return route.fulfill({
          status: 503,
          json: {
            error: "WEBINAR_SAVE_INCOMPLETE",
            incompleteSave: true,
            campaignRef: "campaign_webinar001",
            campaignVersionRef: "campaignversion_webinar001",
          },
        });
      });
      await page.setViewportSize({ width: frame.width, height: frame.height });
      await useStoredTheme(page, theme);
      await page.goto("/marketing/campaigns/webinar");
      const surface = page.locator("[data-webinar-preparation]");
      await expect(surface.getByRole("button", { name: /^Use this creative/u })).toHaveCount(15);
      await expectNoHorizontalOverflow(page);
      await expectAxeClean(page);
      const dir = join(process.cwd(), "test-results/product-review-frames/webinar-preparation");
      await mkdir(dir, { recursive: true });
      await settleForScreenshot(page);
      await warmFullPageCapture(page);
      await page.screenshot({
        path: join(dir, `choose-${frame.width}-${theme}.png`),
        fullPage: true,
      });
      await surface
        .getByRole("button", { name: /^Use this creative\s*:\s*Your first home, a clear plan$/u })
        .click();
      const selector = surface.getByRole("combobox", { name: "Published webinar" });
      await selector.focus();
      await page.keyboard.press("Home");
      const popup = page.getByRole("listbox", { name: "Published webinar" });
      await expect(popup).toBeVisible();
      await expect(selector).toBeFocused();
      await expectAxeClean(page);
      await page.keyboard.press("Enter");
      await expect(selector).toContainText("Your homebuying plan");
      await surface.getByLabel("Cities or states").fill("Austin, TX; Texas");
      await surface.getByLabel("Requested end date (UTC)").fill("2030-06-19");
      await surface.getByLabel("Facebook headline").fill("A clear plan for your first home");
      await expectNoHorizontalOverflow(page);
      await expectAxeClean(page);
      await settleForScreenshot(page);
      await warmFullPageCapture(page);
      await page.screenshot({
        path: join(dir, `form-${frame.width}-${theme}.png`),
        fullPage: true,
      });
      await selector.scrollIntoViewIfNeeded();
      await selector.focus();
      await page.keyboard.press("Home");
      await expect(popup).toBeVisible();
      await expect(selector).toBeFocused();
      const selectedOption = popup.getByRole("option", { name: "Your homebuying plan (Live)" });
      await expect(selectedOption).toHaveAttribute("aria-selected", "true");
      await expect(selectedOption).toHaveAttribute("data-active", "true");
      await expect(selector).toHaveAttribute(
        "aria-activedescendant",
        (await selectedOption.getAttribute("id"))!,
      );
      await expectNoHorizontalOverflow(page);
      await expectAxeClean(page);
      await expect
        .poll(async () => {
          const box = await popup.boundingBox();
          return (
            box !== null &&
            box.x >= 0 &&
            box.y >= 0 &&
            box.x + box.width <= frame.width &&
            box.y + box.height <= frame.height
          );
        })
        .toBe(true);
      await page.screenshot({
        path: join(dir, `keyboard-popup-${frame.width}-${theme}.png`),
        fullPage: false,
      });
      await page.keyboard.press("Escape");
      await expect(popup).toHaveCount(0);
      await expect(selector).toHaveAttribute("aria-expanded", "false");
      await expect(selector).toBeFocused();
      await surface.getByRole("button", { name: "Review setup" }).click();
      await settleForScreenshot(page);
      await warmFullPageCapture(page);
      await page.screenshot({
        path: join(dir, `setup-${frame.width}-${theme}.png`),
        fullPage: true,
      });
      await surface.getByRole("button", { name: "Save and check" }).click();
      await expect(surface.getByRole("alert")).toContainText("checks are unfinished");
      await expect(surface.getByRole("button", { name: "Edit setup" })).toBeDisabled();
      await page.reload();
      await expect(surface.getByRole("alert")).toContainText(
        "previous save is awaiting confirmation",
      );
      await surface.getByRole("button", { name: "Retry this exact save" }).click();
      await expect.poll(() => bodies.length).toBe(2);
      expect(bodies[1]).toEqual(bodies[0]);
      await expectNoHorizontalOverflow(page);
      await expectAxeClean(page);
      await settleForScreenshot(page);
      await warmFullPageCapture(page);
      await page.screenshot({
        path: join(dir, `retry-${frame.width}-${theme}.png`),
        fullPage: true,
      });
      expect(errors).toEqual([]);
      // The two explicit 503 fixtures are expected resource failures in Chromium.
      expect(
        consoleErrors.filter((error) => !/^Failed to load resource:.*503/u.test(error)),
      ).toEqual([]);
    });
  }
