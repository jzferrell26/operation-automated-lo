import { AxeBuilder } from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import {
  expectNoExternalRequests,
  guardLocalOrigin,
  seededCredentials,
  signInExisting,
} from "./helpers/guided-setup-journey.js";
import { chooseThemeFromTheHeader } from "./helpers/review-session.js";

/**
 * PRD-009a, the review halves of 009A-AC-004, 009, 011, and 013, signed in as the seeded creator.
 *
 * The creator holds `reports:read` and not `settings:read` (`CAPABILITIES_BY_ROLE` in
 * `apps/web/src/server/runtime-authentication.ts`), so one person shows both sides of 009A-AC-009:
 * Homeowner reports opens, and Settings is the same label as text with its reason.
 *
 * `/homeowners` needs a real session, which is why its 009A-AC-004 check lives here and not in the
 * synthetic `tests/browser/ui-foundation-ux.spec.ts`.
 */

const THE_SIX = [
  "Home",
  "Campaigns",
  "Brand",
  "Realtor partners",
  "Homeowner reports",
  "Settings",
] as const;

async function signIn(page: Page): Promise<void> {
  const { creatorEmail, password } = seededCredentials();
  await page.setViewportSize({ width: 1440, height: 900 });
  await signInExisting(page, creatorEmail, password);
}

test("the review top bar holds six labels, Help, and an account that names only the person", async ({
  page,
}) => {
  test.setTimeout(180_000);
  const guard = await guardLocalOrigin(page);
  await signIn(page);
  await page.goto("/overview");

  const banner = page.getByRole("banner");
  await expect(banner).toHaveCount(1);
  const menu = banner.getByRole("navigation", { name: "Main" });
  await expect(menu.getByRole("listitem")).toHaveCount(6);
  for (const [index, label] of THE_SIX.entries()) {
    await expect(menu.getByRole("listitem").nth(index)).toContainText(label);
  }
  await expect(menu.getByRole("link", { name: "Homeowner reports" })).toHaveAttribute(
    "href",
    "/homeowners",
  );
  // The creator cannot open Settings: the label stays, as text that goes nowhere.
  await expect(menu.getByRole("link", { name: "Settings" })).toHaveCount(0);
  await expect(menu.getByText("Settings", { exact: true })).toBeVisible();
  await expect(banner.getByRole("button", { name: "Help", exact: true })).toBeVisible();

  // 009A-AC-013: no shell-wide banner, and the account says who is signed in and nothing else.
  await expect(page.getByLabel("Not connected yet: HighLevel, Meta, and Stripe")).toHaveCount(0);
  await expect(page.locator("aside")).toHaveCount(0);
  await banner.getByRole("button", { name: /^Your account: / }).click();
  const account = page.getByRole("dialog", { name: "Your account" });
  await expect(account.getByRole("button", { name: "Sign out" })).toBeVisible();
  await expect(account.getByRole("radiogroup", { name: "Appearance theme" })).toBeVisible();
  expect(await account.textContent()).not.toMatch(/connected|HighLevel|Meta|Stripe/u);
  await page.keyboard.press("Escape");
  expectNoExternalRequests(guard);
});

for (const path of ["/overview", "/brand", "/partners", "/settings", "/homeowners"] as const) {
  test(`${path} renders the one action blue, 16px body text, and the shared Dark surfaces (review)`, async ({
    page,
  }) => {
    test.setTimeout(180_000);
    const guard = await guardLocalOrigin(page);
    await signIn(page);
    await page.goto(path);
    await expect(page.locator("html")).toHaveAttribute("data-tenant-accent", /\S/u);

    const read = () =>
      page.evaluate(() => {
        const scope =
          [...document.querySelectorAll<HTMLElement>('[data-product-shell="true"]')].at(-1) ??
          document.querySelector("main") ??
          document.body;
        const token = (name: string) =>
          getComputedStyle(scope).getPropertyValue(name).trim().toLowerCase();
        return {
          action: token("--ac-primary"),
          canvas: token("--sf-canvas"),
          card: token("--sf-card"),
          sunken: token("--sf-sunken"),
          bodySize: getComputedStyle(document.body).fontSize,
        };
      });

    await chooseThemeFromTheHeader(page, "light");
    expect(await read()).toMatchObject({ action: "#005fcc", bodySize: "16px" });
    await chooseThemeFromTheHeader(page, "dark");
    expect(await read()).toMatchObject({
      action: "#3566d6",
      canvas: "#14161b",
      card: "#1b1e25",
      sunken: "#22262f",
      bodySize: "16px",
    });
    expectNoExternalRequests(guard);
  });
}

/**
 * 009A-AC-011 in review. The one-row, no-overlap, and no-sideways-scroll checks run at every frame.
 *
 * Until PRD-009b removed the guided setup's "Finish setup" chip from the Help slot, a person who put
 * the walkthrough aside carried a wider account cluster, and at 1180 the menu could meet it, so the
 * one-row and no-overlap checks were deferred whenever the chip was present. The chip is gone, so
 * nothing is deferred.
 */
test("the review top bar holds its shape at the four frames, axe-clean in Light and Dark", async ({
  page,
}) => {
  test.setTimeout(300_000);
  const guard = await guardLocalOrigin(page);
  await signIn(page);

  for (const theme of ["light", "dark"] as const) {
    for (const frame of [
      { name: "1440", width: 1440, height: 900 },
      { name: "1180", width: 1180, height: 900 },
      { name: "768", width: 768, height: 1024 },
      { name: "390", width: 390, height: 844 },
    ]) {
      await page.setViewportSize({ width: frame.width, height: frame.height });
      await page.goto("/overview");
      await chooseThemeFromTheHeader(page, theme);
      const banner = page.getByRole("banner");
      await expect(banner.getByRole("button", { name: "Finish setup" })).toHaveCount(0);

      if (frame.width >= 1180) {
        const menuBox = await banner.getByRole("navigation", { name: "Main" }).boundingBox();
        const accountBox = await banner
          .getByRole("button", { name: /^Your account: / })
          .boundingBox();
        const helpBox = await banner
          .getByRole("button", { name: "Help", exact: true })
          .boundingBox();
        if (menuBox && accountBox && helpBox) {
          expect(menuBox.x + menuBox.width).toBeLessThanOrEqual(Math.min(accountBox.x, helpBox.x));
          expect(
            Math.abs(menuBox.y + menuBox.height / 2 - (accountBox.y + accountBox.height / 2)),
          ).toBeLessThan(4);
        }
      } else if (frame.width < 720) {
        await expect(banner.getByRole("navigation", { name: "Main" })).toBeHidden();
        await banner.getByRole("button", { name: "Menu" }).click();
        const sheet = page.getByRole("dialog", { name: "Menu" });
        await expect(sheet.getByRole("link").or(sheet.getByText("Settings"))).not.toHaveCount(0);
        await page.keyboard.press("Escape");
        await expect(banner.getByRole("button", { name: "Menu" })).toBeFocused();
      }

      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
        `no sideways scroll at ${frame.name} in ${theme}`,
      ).toBe(true);
      const results = await new AxeBuilder({ page }).analyze();
      expect(
        results.violations.map((violation) => `${violation.id} (${violation.nodes.length})`),
        `axe at ${frame.name} in ${theme}`,
      ).toEqual([]);
    }
  }

  expectNoExternalRequests(guard);
});
