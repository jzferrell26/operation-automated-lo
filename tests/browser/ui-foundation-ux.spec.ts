import { AxeBuilder } from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

import { evidencePath, writeEvidenceSummary } from "./helpers/ui-foundation-evidence.js";

const applicationOrigin = "http://127.0.0.1:3100";
const regenerateEvidence = process.env["OALO_REGENERATE_UI_EVIDENCE"] === "true";
const screenshots: string[] = [];

type ThemeSample = Readonly<{
  phase: string;
  theme: string | null;
  colorScheme: string;
}>;

async function guardSyntheticLocalPage(page: Page) {
  const externalRequests: string[] = [];
  const hydrationMessages: string[] = [];
  const pageErrors: string[] = [];

  await page.route("**/*", async (route) => {
    const url = route.request().url();
    if (new URL(url).origin !== applicationOrigin) {
      externalRequests.push(url);
      await route.abort();
      return;
    }
    await route.continue();
  });
  page.on("console", (message) => {
    if (/hydration|hydrated|did not match|server rendered html/iu.test(message.text())) {
      hydrationMessages.push(message.text());
    }
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  return { externalRequests, hydrationMessages, pageErrors };
}

/** PRD-009a: the theme choice lives in the account control, so it is opened, used, and closed. */
function accountControl(page: Page): Locator {
  return page.getByRole("banner").getByRole("button", { name: /^Your account: / });
}

async function openAccount(page: Page): Promise<Locator> {
  const panel = page.getByRole("dialog", { name: "Your account" });
  if (!(await panel.isVisible())) {
    await accountControl(page).click();
  }
  await expect(panel).toBeVisible();
  return panel;
}

async function chooseTheme(page: Page, theme: "Light" | "Dark" | "System") {
  const panel = await openAccount(page);
  await panel.getByRole("radio", { name: theme }).click();
  if (theme !== "System") {
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme.toLowerCase());
  }

  /* The segmented control moves its fill and its label colour over
   * `--motion-base`. axe reads computed colour, so sampling before the
   * transition settles reports a blended pair that exists for 180ms and is not
   * a token. Wait for the control to come to rest, with a ceiling above
   * `--motion-slow` for the case where no transition runs at all.
   */
  await panel.getByRole("radiogroup", { name: "Appearance theme" }).evaluate(
    (group) =>
      new Promise<void>((resolve) => {
        const settle = () => {
          window.clearTimeout(ceiling);
          resolve();
        };
        const ceiling = window.setTimeout(settle, 400);
        group.addEventListener("transitionend", settle, { once: true });
      }),
  );
  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
}

async function assertAxeClean(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  expect(
    results.violations,
    results.violations
      .map((violation) => `${violation.id}: ${violation.help} (${violation.nodes.length})`)
      .join("\n"),
  ).toEqual([]);
}

async function assertGuardClean(guard: Awaited<ReturnType<typeof guardSyntheticLocalPage>>) {
  expect(guard.externalRequests).toEqual([]);
  expect(guard.hydrationMessages).toEqual([]);
  expect(guard.pageErrors).toEqual([]);
}

async function expectNoHorizontalScroll(page: Page, frame: string) {
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    `the page does not scroll sideways at ${frame}`,
  ).toBe(true);
}

/** Installs the first-paint probe: what `data-theme` and the colour scheme were before React ran. */
async function sampleTheFirstPaint(page: Page, stored: string | null) {
  await page.addInitScript((value) => {
    if (value !== null) window.localStorage.setItem("oalo:theme-preference", value);
    const samples: ThemeSample[] = [];
    Object.defineProperty(window, "__oaloThemeSamples", { value: samples });
    const capture = (phase: string) => {
      const root = document.documentElement;
      samples.push({
        phase,
        theme: root?.getAttribute("data-theme") ?? null,
        colorScheme: root ? getComputedStyle(root).colorScheme : "",
      });
    };
    capture("init-script");
    requestAnimationFrame(() => capture("first-animation-frame"));
  }, stored);
}

async function readTheFirstPaint(page: Page): Promise<readonly ThemeSample[]> {
  return page.evaluate(
    () => (window as Window & { __oaloThemeSamples?: ThemeSample[] }).__oaloThemeSamples ?? [],
  );
}

test("first paint applies the stored Dark theme before hydration", async ({ page }) => {
  await sampleTheFirstPaint(page, "dark");
  const guard = await guardSyntheticLocalPage(page);

  await page.goto("/overview");
  await expect(page.getByRole("banner")).toBeVisible();
  const samples = await readTheFirstPaint(page);
  const firstResolved = samples.find((sample) => sample.theme !== null);
  const firstFrame = samples.find((sample) => sample.phase === "first-animation-frame");

  expect(firstResolved?.theme).toBe("dark");
  expect(firstFrame).toMatchObject({ theme: "dark", colorScheme: "dark" });
  expect(samples.some((sample) => sample.theme === "light")).toBe(false);
  await assertGuardClean(guard);
});

/**
 * PRD-009a, 009A-AC-008, and design D-5. With nothing stored and the device set to dark, the head
 * script paints Light, so there is no flash and no Dark first visit. Choosing System stores
 * `system`, follows a live device change, and survives a reload; Light and Dark persist.
 */
test("a first visit on a dark device paints Light, and System is stored and followed", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await sampleTheFirstPaint(page, null);
  const guard = await guardSyntheticLocalPage(page);

  await page.goto("/overview");
  await expect(page.getByRole("banner")).toBeVisible();
  const samples = await readTheFirstPaint(page);
  expect(samples.find((sample) => sample.theme !== null)?.theme).toBe("light");
  expect(samples.find((sample) => sample.phase === "first-animation-frame")).toMatchObject({
    theme: "light",
    colorScheme: "light",
  });
  expect(samples.some((sample) => sample.theme === "dark")).toBe(false);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  expect(await page.evaluate(() => localStorage.getItem("oalo:theme-preference"))).toBeNull();

  await chooseTheme(page, "System");
  expect(await page.evaluate(() => localStorage.getItem("oalo:theme-preference"))).toBe("system");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

  await page.reload();
  expect(await page.evaluate(() => localStorage.getItem("oalo:theme-preference"))).toBe("system");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  await chooseTheme(page, "Light");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await chooseTheme(page, "Dark");
  await page.emulateMedia({ colorScheme: "light" });
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await assertGuardClean(guard);
});

/**
 * Amended on 2026-10-01 by PRD-009b: Home replaced the CRM overview, so the priorities this test
 * held (the numbers, what you have going on, what needs attention) are gone with those sections. What
 * Home promises is its composition: the start card first, then "Get set up", then the two short
 * lists, in that order at 390 and as two columns at 1180 (D1).
 */
test("1180 and 390 layouts keep Home's cards in their order", async ({ page }) => {
  const guard = await guardSyntheticLocalPage(page);
  await page.setViewportSize({ width: 1180, height: 900 });
  await page.goto("/overview");
  for (const name of ["Launch an ad", "Get set up", "Running now"]) {
    await expect(page.getByRole("region", { name })).toBeAttached();
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  const startCard = page.getByRole("region", { name: "Launch an ad" });
  const setup = page.getByRole("region", { name: "Get set up" });
  const running = page.getByRole("region", { name: "Running now" });

  // One primary action, "Choose an ad", leads the page; the checklist's three actions are secondary.
  await expect(page.locator("main [data-home-primary]")).toHaveCount(1);
  await expect(setup.getByRole("link")).toHaveCount(3);
  const verticalOrder = await Promise.all(
    [startCard, setup, running].map(async (locator) =>
      locator.evaluate((element) => element.getBoundingClientRect().top + window.scrollY),
    ),
  );
  expect(verticalOrder).toEqual([...verticalOrder].sort((left, right) => left - right));
  await assertGuardClean(guard);
});

/*
 * PRD-009a and design `00-direction.md` section 2.1: the light top bar at the four frames.
 *
 * Superseded on 2026-10-01 by PRD-009 (D-2): UIF-009's collapsible rail and its compact icon rail,
 * the mobile drawer, and the 768 rail. Their claims move onto the bar: one row at 1440 and 1180
 * with the menu clear of the account cluster, two rows at 768, a Menu sheet at 390, no sideways
 * scroll anywhere, and axe at zero in Light and Dark at every frame.
 */
const FRAMES = [
  { name: "1440", width: 1440, height: 900 },
  { name: "1180", width: 1180, height: 900 },
  { name: "768", width: 768, height: 1024 },
  { name: "390", width: 390, height: 844 },
] as const;

const THE_SIX = [
  "Home",
  "Campaigns",
  "Brand",
  "Realtor partners",
  "Homeowner reports",
  "Settings",
] as const;

type Box = Readonly<{ x: number; y: number; width: number; height: number }>;

async function boxOf(locator: Locator): Promise<Box> {
  const box = await locator.boundingBox();
  expect(box, "the element has a box").not.toBeNull();
  return box ?? { x: 0, y: 0, width: 0, height: 0 };
}

function centerY(box: Box): number {
  return box.y + box.height / 2;
}

async function topBarParts(page: Page) {
  const banner = page.getByRole("banner");
  const menu = banner.getByRole("navigation", { name: "Main" });
  return {
    banner,
    menu,
    lastItem: menu.getByRole("listitem").last(),
    wordmark: banner.getByRole("link", { name: "Automated LO" }),
    help: banner.getByRole("button", { name: "Help" }),
    account: accountControl(page),
  };
}

for (const theme of ["Light", "Dark"] as const) {
  test(`the top bar holds its shape at 1440, 1180, 768, and 390 in ${theme} (009A-AC-011)`, async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const guard = await guardSyntheticLocalPage(page);

    for (const frame of FRAMES) {
      await page.setViewportSize({ width: frame.width, height: frame.height });
      await page.goto("/overview");
      await chooseTheme(page, theme);
      const { menu, lastItem, wordmark, help, account } = await topBarParts(page);
      const helpBox = await boxOf(help);
      const accountBox = await boxOf(account);
      const clusterLeft = Math.min(helpBox.x, accountBox.x);

      if (frame.width >= 1180) {
        const menuBox = await boxOf(menu);
        const lastBox = await boxOf(lastItem);
        const wordmarkBox = await boxOf(wordmark);
        for (const part of [menuBox, wordmarkBox, helpBox]) {
          expect(
            Math.abs(centerY(part) - centerY(accountBox)),
            `one row at ${frame.name}`,
          ).toBeLessThan(4);
        }
        expect(
          menuBox.x + menuBox.width,
          `the menu clears the account at ${frame.name}`,
        ).toBeLessThanOrEqual(clusterLeft);
        expect(
          lastBox.x + lastBox.width,
          `the last item clears the account at ${frame.name}`,
        ).toBeLessThanOrEqual(clusterLeft);
      } else if (frame.width >= 720) {
        const menuBox = await boxOf(menu);
        const wordmarkBox = await boxOf(wordmark);
        expect(Math.abs(centerY(wordmarkBox) - centerY(accountBox))).toBeLessThan(4);
        expect(menuBox.y, "the six links take the second row at 768").toBeGreaterThanOrEqual(
          Math.max(wordmarkBox.y + wordmarkBox.height, accountBox.y + accountBox.height) - 1,
        );
        const lastBox = await boxOf(lastItem);
        expect(lastBox.x + lastBox.width).toBeLessThanOrEqual(frame.width);
      } else {
        await expect(menu).toBeHidden();
        const menuButton = page.getByRole("banner").getByRole("button", { name: "Menu" });
        await expect(menuButton).toBeVisible();
        await menuButton.click();
        const sheet = page.getByRole("dialog", { name: "Menu" });
        await expect(sheet).toBeVisible();
        await expect(
          sheet.getByRole("navigation", { name: "Main menu" }).getByRole("link"),
        ).toHaveText([...THE_SIX]);
        expect(
          await sheet.evaluate((element) => element.contains(document.activeElement)),
          "focus moves into the sheet",
        ).toBe(true);
        await assertAxeClean(page);
        await page.keyboard.press("Escape");
        await expect(sheet).toBeHidden();
        await expect(menuButton).toBeFocused();
      }

      await expectNoHorizontalScroll(page, frame.name);
      await assertAxeClean(page);
      if (regenerateEvidence) {
        const fileName = `top-bar-${theme.toLowerCase()}-${frame.width}x${frame.height}.png`;
        await page.screenshot({ path: evidencePath(fileName) });
        screenshots.push(fileName);
      }
    }

    await assertGuardClean(guard);
  });
}

/** PRD-009a, 009A-AC-012: every control in the bar is a 44px target at every frame. */
test("every interactive control in the bar is at least 44px tall at every frame", async ({
  page,
}) => {
  const guard = await guardSyntheticLocalPage(page);

  for (const frame of FRAMES) {
    await page.setViewportSize({ width: frame.width, height: frame.height });
    await page.goto("/overview");
    const short = await page
      .getByRole("banner")
      .locator("a[href]:visible, button:visible, [tabindex='0']:visible")
      .evaluateAll((elements) =>
        elements
          .map((element) => ({
            name: element.getAttribute("aria-label") ?? element.textContent?.trim() ?? "unnamed",
            height: element.getBoundingClientRect().height,
          }))
          .filter(({ height }) => height < 44),
      );
    expect(short, `controls under 44px tall at ${frame.name}`).toEqual([]);
  }

  await assertGuardClean(guard);
});

/**
 * The sheet primitive's cascade. Its mobile `.sheet` rule (0,1,0) used to lose to its
 * `[data-anchor]` rules (0,2,0), so at 390 the bar's three sheets opened as fixed panels at
 * `inset-block-start: 100%`, with their tops below the frame (measured 2026-10-01: a top of 856px in
 * an 844px frame). `toBeVisible` accepts a panel that is off screen, so the position is asserted:
 * at 390 each sheet is a bottom sheet across the full frame, and at 1180 Help still opens beneath
 * its own control.
 */
test("the bar's three sheets sit inside the frame at 390 and Help stays anchored at 1180", async ({
  page,
}) => {
  const guard = await guardSyntheticLocalPage(page);
  const banner = page.getByRole("banner");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/overview");
  for (const opener of [
    banner.getByRole("button", { name: "Menu" }),
    banner.getByRole("button", { name: "Help", exact: true }),
    accountControl(page),
  ]) {
    await opener.click();
    const sheet = page.getByRole("dialog");
    await expect(sheet).toBeVisible();
    const box = await boxOf(sheet);
    expect(box.x, "a bottom sheet starts at the frame's edge").toBeLessThanOrEqual(1);
    expect(box.width, "a bottom sheet spans the frame").toBeGreaterThanOrEqual(389);
    expect(box.y, "a bottom sheet starts inside the frame").toBeGreaterThanOrEqual(0);
    expect(box.y + box.height, "a bottom sheet ends at the frame's bottom").toBeCloseTo(844, 0);
    await page.keyboard.press("Escape");
    await expect(sheet).toBeHidden();
  }

  await page.setViewportSize({ width: 1180, height: 900 });
  await page.goto("/overview");
  const help = banner.getByRole("button", { name: "Help", exact: true });
  await help.click();
  const helpSheet = page.getByRole("dialog");
  await expect(helpSheet).toBeVisible();
  const helpBox = await boxOf(help);
  const sheetBox = await boxOf(helpSheet);
  expect(sheetBox.y, "Help's panel opens beneath its control").toBeGreaterThanOrEqual(
    helpBox.y + helpBox.height - 1,
  );
  expect(sheetBox.x + sheetBox.width, "and stays inside the frame").toBeLessThanOrEqual(1180);

  await assertGuardClean(guard);
});

/**
 * PRD-009a, 009A-AC-009. One header: the wordmark linking Home, the six-item "Main" menu in order,
 * Help, and the account control; the current page carries `aria-current` and a tint and a weight,
 * not colour alone; no left rail and no collapse toggle.
 */
test("the header holds the wordmark, the six links, Help, and the account control", async ({
  page,
}) => {
  const guard = await guardSyntheticLocalPage(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/overview");

  await expect(page.getByRole("banner")).toHaveCount(1);
  const { menu, wordmark, help, account } = await topBarParts(page);
  await expect(wordmark).toHaveAttribute("href", "/overview");
  await expect(menu.getByRole("link")).toHaveText([...THE_SIX]);
  await expect(help).toBeVisible();
  await expect(account).toBeVisible();
  await expect(page.locator("aside")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /collapse|expand/iu })).toHaveCount(0);

  const current = menu.getByRole("link", { name: "Home", exact: true });
  await expect(current).toHaveAttribute("aria-current", "page");
  const marks = await menu.getByRole("link").evaluateAll((links) =>
    links.map((link) => ({
      current: link.getAttribute("aria-current"),
      background: getComputedStyle(link).backgroundColor,
      weight: getComputedStyle(link).fontWeight,
    })),
  );
  const [home, ...others] = marks;
  expect(home?.weight).toBe("600");
  for (const other of others) {
    expect(other.current).toBeNull();
    expect(other.weight).not.toBe(home?.weight);
    expect(other.background).not.toBe(home?.background);
  }

  const panel = await openAccount(page);
  await expect(panel.getByText("Alex Morgan")).toBeVisible();
  await expect(panel.getByRole("radiogroup", { name: "Appearance theme" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(account).toBeFocused();
  await assertGuardClean(guard);
});

/**
 * PRD-009a, 009A-AC-004. With `data-tenant-accent` set, the action blue is `#005fcc` and the body
 * text 16px on every menu page, each checked on its own; in Dark the pages that used to load the
 * product token file show the shared Dark surfaces, not that file's old Dark block.
 *
 * `/homeowners` needs a real session (`apps/web/src/server/homeowners/page-brand.ts` sends a
 * visitor without one to sign in), so the synthetic server cannot show it; the review project
 * checks it in `tests/browser/review/top-bar.spec.ts`.
 */
const ACCENT_PAGES = ["/overview", "/brand", "/partners", "/settings"] as const;

for (const path of ACCENT_PAGES) {
  test(`${path} renders the one action blue and 16px body text, and the shared Dark surfaces`, async ({
    page,
  }) => {
    const guard = await guardSyntheticLocalPage(page);
    await page.setViewportSize({ width: 1440, height: 900 });
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
          actionOnRoot: getComputedStyle(document.documentElement)
            .getPropertyValue("--ac-primary")
            .trim()
            .toLowerCase(),
          action: token("--ac-primary"),
          canvas: token("--sf-canvas"),
          card: token("--sf-card"),
          sunken: token("--sf-sunken"),
          bodySize: getComputedStyle(document.body).fontSize,
          scopeSize: token("--text-body-size"),
        };
      });

    await chooseTheme(page, "Light");
    expect(await read()).toMatchObject({
      actionOnRoot: "#005fcc",
      action: "#005fcc",
      bodySize: "16px",
      scopeSize: "1rem",
    });

    await chooseTheme(page, "Dark");
    expect(await read()).toMatchObject({
      action: "#3566d6",
      canvas: "#14161b",
      card: "#1b1e25",
      sunken: "#22262f",
      bodySize: "16px",
    });
    await assertGuardClean(guard);
  });
}

/**
 * PRD-009a, 009A-AC-007. Inter loads from the application origin and nothing else is fetched: the
 * route guard above aborts and records any request to another origin.
 */
test("Inter loads from the application origin on a signed-in page", async ({ page }) => {
  const guard = await guardSyntheticLocalPage(page);
  const fontResponse = page.waitForResponse((response) =>
    response.url().endsWith("/fonts/InterVariable.woff2"),
  );
  await page.goto("/overview");
  const response = await fontResponse;
  expect(new URL(response.url()).origin).toBe(applicationOrigin);
  expect(response.status()).toBe(200);

  const fonts = await page.evaluate(async () => {
    await document.fonts.ready;
    return {
      check: document.fonts.check("16px Inter"),
      faces: [...document.fonts]
        .filter((face) => face.family.replaceAll('"', "") === "Inter")
        .map((face) => face.status),
      bodyFamily: getComputedStyle(document.body).fontFamily,
    };
  });
  expect(fonts.check).toBe(true);
  expect(fonts.faces).toEqual(["loaded"]);
  expect(fonts.bodyFamily.startsWith("Inter")).toBe(true);
  await assertGuardClean(guard);
});

/**
 * PRD-009a and 009G-AC-010: the UX contract opens Home. Until 2026-10-01 it opened `/onboarding`,
 * which PRD-009f removes in the same merge, and also asserted that page's nine checklist headings;
 * those leave with the page. Focus, target size, and reduced motion are still asserted.
 */
test("keyboard focus, target size, and reduced motion meet the UX contract on Home", async ({
  page,
}) => {
  const guard = await guardSyntheticLocalPage(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/overview");

  await page.keyboard.press("Tab");
  const focused = page.locator(":focus");
  await expect(focused).toBeVisible();
  await expect(focused).toHaveCSS("outline-width", "2px");
  await expect(focused).toHaveCSS("outline-offset", "3px");

  const undersized = await page
    .locator("button:visible, a[href]:visible, [role='button']:visible")
    .evaluateAll((elements) =>
      elements
        .map((element) => ({
          name: element.getAttribute("aria-label") ?? element.textContent?.trim() ?? "unnamed",
          rect: element.getBoundingClientRect().toJSON(),
        }))
        .filter(({ rect }) => rect.width < 44 || rect.height < 44),
    );
  expect(undersized).toEqual([]);

  const animated = await page.locator("main *, header *").evaluateAll((elements) =>
    elements
      .map((element) => ({
        animation: getComputedStyle(element).animationName,
        transition: getComputedStyle(element).transitionDuration,
      }))
      .filter(
        ({ animation, transition }) =>
          animation !== "none" || !/^0(?:s|ms)(?:, 0(?:s|ms))*$/u.test(transition),
      ),
  );
  expect(animated).toEqual([]);
  await assertGuardClean(guard);
});

/* PRD-006d, 006D-AC-017, re-scoped on 2026-10-01 by PRD-009 (S-42, D-2): the 768 frame asserts the
 * two-row top bar and single-column forms instead of the collapsible rail.
 */
const TABLET_FRAME = { width: 768, height: 1024 } as const;

test("the 768 tablet frame uses the two-row top bar and single-column content", async ({
  page,
}) => {
  const guard = await guardSyntheticLocalPage(page);
  await page.setViewportSize(TABLET_FRAME);

  for (const route of ["overview", "brand"] as const) {
    await page.goto(`/${route}`);

    const { menu, wordmark } = await topBarParts(page);
    await expect(menu).toBeVisible();
    await expect(page.getByRole("banner").getByRole("button", { name: "Menu" })).toBeHidden();
    expect((await boxOf(menu)).y).toBeGreaterThan((await boxOf(wordmark)).y);

    // Section 14: no horizontal overflow, and a constrained width puts the
    // page into a single column.
    await expectNoHorizontalScroll(page, "768");
    const multiColumn = await page
      .locator("main :where(section, form, article, div)")
      .evaluateAll((elements) =>
        elements
          .filter((element) => {
            const columns = getComputedStyle(element).gridTemplateColumns;
            return columns.split(" ").filter((track) => track.endsWith("px")).length > 2;
          })
          .map((element) => element.className),
      );
    expect(multiColumn).toEqual([]);

    // Section 14: 44 by 44 targets survive the frame change.
    const undersized = await page
      .locator("button:visible, a[href]:visible, [role='button']:visible")
      .evaluateAll((elements) =>
        elements
          .map((element) => ({
            name: element.getAttribute("aria-label") ?? element.textContent?.trim() ?? "unnamed",
            rect: element.getBoundingClientRect().toJSON(),
          }))
          .filter(({ rect }) => rect.width < 44 || rect.height < 44),
      );
    expect(undersized).toEqual([]);
  }

  await assertGuardClean(guard);
});

/**
 * Amended on 2026-10-01 by PRD-009b: the Overview state gallery this test also photographed (the
 * design-reference cards under "How this page looks in every state") is retired with the CRM
 * overview, so only the open Menu sheet is checked and photographed.
 */
test("the open Menu sheet meets accessibility contracts", async ({ page }) => {
  const guard = await guardSyntheticLocalPage(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/overview");
  await chooseTheme(page, "Light");
  await page.getByRole("banner").getByRole("button", { name: "Menu" }).click();
  await expect(page.getByRole("dialog", { name: "Menu" })).toBeVisible();
  await assertAxeClean(page);
  if (regenerateEvidence) {
    await page.screenshot({ path: evidencePath("overview-light-menu-sheet-open-390x844.png") });
    screenshots.push("overview-light-menu-sheet-open-390x844.png");
  }

  await assertGuardClean(guard);
});

/**
 * Amended on 2026-10-01 by PRD-009: the `/onboarding` checklist and the `/reports` acceptance
 * surface leave with their pages (009f D1, D4), so their halves of this test go with them.
 */
test("synthetic acceptance surfaces preserve history and authorization boundaries", async ({
  page,
}) => {
  const guard = await guardSyntheticLocalPage(page);
  await page.setViewportSize({ width: 1180, height: 900 });

  await page.goto("/settings/connections");
  for (const group of ["Required", "Granted", "Missing", "Optional"]) {
    await expect(page.getByRole("heading", { name: group })).toBeVisible();
  }

  await page.goto("/marketing/campaigns/synthetic-open-house-001");
  await page.getByRole("button", { name: "Version 2", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Cedar Street open house, disclosure revision" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Start a new draft from this" }).click();
  await expect(page.getByText("New draft started from version 2")).toBeVisible();
  await expect(page.getByText("3 versions, none of them edited after the fact")).toBeVisible();
  await expect(page.getByRole("link", { name: "Open the approved page" })).toHaveAttribute(
    "href",
    "/public/synthetic-open-house-v3",
  );

  await assertGuardClean(guard);
});

for (const route of [
  "brand",
  "partners",
  "settings/connections",
  "marketing/campaigns/synthetic-open-house-001",
] as const) {
  test(`${route} is accessible and responsive in Light and Dark themes`, async ({ page }) => {
    test.setTimeout(60_000);
    const guard = await guardSyntheticLocalPage(page);

    for (const contract of [
      { theme: "Light" as const, viewport: { width: 1180, height: 900 } },
      { theme: "Light" as const, viewport: TABLET_FRAME },
      { theme: "Dark" as const, viewport: { width: 390, height: 844 } },
    ]) {
      await page.setViewportSize(contract.viewport);
      await page.goto(`/${route}`);
      await chooseTheme(page, contract.theme);
      await assertAxeClean(page);
      await expectNoHorizontalScroll(page, `${String(contract.viewport.width)}`);
    }

    await assertGuardClean(guard);
  });
}

test("canonical profile, creative delivery, Meta assets, approval scope, and launch confirmation remain synthetic", async ({
  page,
}) => {
  const guard = await guardSyntheticLocalPage(page);
  await page.setViewportSize({ width: 1180, height: 900 });

  await page.goto("/brand");
  // The scored review's F-13. The local demo shows the PRD-009 Brand page, the one a signed-in loan
  // officer sees, fed by the demo's own sample identity (the one its Launch an ad flow puts on its
  // ads). The old page's profile version, field states, and Voice suggestions are gone with it.
  await expect(page.getByRole("heading", { level: 1, name: "Brand" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Your details" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Your brand on ads" })).toBeVisible();
  await expect(page.getByLabel("Loan officer name")).toHaveValue("Alex Morgan");
  await expect(page.getByLabel("Title on your ads")).toHaveValue("Loan officer");
  await expect(page.getByLabel("Disclosure line")).toHaveValue("Equal Housing Opportunity.");
  // The demo writes nothing, so the fields are read only and both saves are disabled, each saying
  // so under its own buttons; the page stays synthetic.
  await expect(page.getByLabel("Loan officer name")).toBeDisabled();
  await expect(page.getByRole("button", { name: "Save your details" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Save ad settings" })).toBeDisabled();
  await expect(page.getByText("Your role has read-only access to these details.")).toHaveCount(2);

  await page.goto("/marketing/campaigns/synthetic-open-house-001");
  await expect(page.getByAltText("Open House feed creative preview")).toBeVisible();
  await expect(page.getByAltText("Open House story creative preview")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Download Open House feed creative" }),
  ).toHaveAttribute("download", "synthetic-open-house-feed-v3.svg");
  await expect(
    page.getByRole("link", { name: "Download Open House story creative" }),
  ).toHaveAttribute("download", "synthetic-open-house-story-v3.svg");
  for (const creative of [
    {
      linkName: "Download Open House feed creative",
      fileName: "synthetic-open-house-feed-v3.svg",
    },
    {
      linkName: "Download Open House story creative",
      fileName: "synthetic-open-house-story-v3.svg",
    },
  ]) {
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("link", { name: creative.linkName }).click(),
    ]);
    expect(download.suggestedFilename()).toBe(creative.fileName);
  }
  await expect(page.locator("[data-meta-asset-kind]")).toHaveCount(5);
  // PRD-006b D2. The account references are internal, so no screen prints one.
  await expect(page.getByText("synthetic-provider-instagram-001")).toHaveCount(0);
  await expect(page.getByRole("table")).toContainText("destination-v3");
  await expect(page.getByRole("table").getByRole("row")).toHaveCount(11);
  await expect(page.getByText("Austin metro geography class")).toBeVisible();
  await expect(page.getByText("ZIP targeting unavailable")).toBeVisible();
  await expect(page.getByText("USD 25 daily")).toBeVisible();
  await expect(page.getByText("2026-07-25")).toBeVisible();
  await expect(page.getByText("2026-07-27")).toBeVisible();

  await page.getByRole("button", { name: "Confirm the launch summary" }).click();
  const confirmation = page.getByRole("alertdialog", {
    name: "Confirm the exact synthetic launch summary",
  });
  await expect(confirmation).toBeVisible();
  await expect(confirmation).toContainText("Version 3 of this campaign");
  await confirmation.getByRole("button", { name: "Yes, that is right" }).click();
  await expect(
    page.getByText("You confirmed the launch summary. Nothing was launched."),
  ).toBeVisible();

  await assertGuardClean(guard);
});

test("delivered approval table, alertdialog, and the Menu sheet resolve semantic Light and Dark surfaces", async ({
  page,
}) => {
  const guard = await guardSyntheticLocalPage(page);
  await page.setViewportSize({ width: 1180, height: 900 });
  const samples: Array<{ dialog: string; table: string; theme: string }> = [];

  for (const theme of ["Light", "Dark"] as const) {
    await page.goto("/marketing/campaigns/synthetic-open-house-001");
    await chooseTheme(page, theme);
    const tableRegion = page.getByRole("region", {
      name: "Exactly what was approved",
    });
    await tableRegion.focus();
    expect(
      await tableRegion.evaluate((element) => getComputedStyle(element).outlineWidth),
    ).not.toBe("0px");
    await page.getByRole("button", { name: "Confirm the launch summary" }).click();
    const alertdialog = page.getByRole("alertdialog", {
      name: "Confirm the exact synthetic launch summary",
    });
    samples.push({
      theme: theme.toLowerCase(),
      table: await tableRegion.evaluate((element) => getComputedStyle(element).backgroundColor),
      dialog: await alertdialog.evaluate((element) => getComputedStyle(element).backgroundColor),
    });
    await alertdialog.getByRole("button", { name: "Cancel" }).click();
  }

  expect(samples).toHaveLength(2);
  expect(samples[0]?.table).not.toBe(samples[1]?.table);
  expect(samples[0]?.dialog).not.toBe(samples[1]?.dialog);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/overview");
  await page.getByRole("banner").getByRole("button", { name: "Menu" }).click();
  const sheet = page.getByRole("dialog", { name: "Menu" });
  await expect(sheet).toHaveCSS("background-color", /rgb/u);
  await assertGuardClean(guard);
});

test.afterAll(() => {
  if (!regenerateEvidence) {
    return;
  }

  writeEvidenceSummary({
    generatedAt: new Date().toISOString(),
    syntheticOnly: true,
    externalRequestsAllowed: false,
    screenshots: [...screenshots].sort(),
    viewportContracts: ["1440x900", "1180x900", "768x1024", "390x844"],
  });
});
