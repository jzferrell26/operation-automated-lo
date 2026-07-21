import { AxeBuilder } from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { evidencePath, writeEvidenceSummary } from "./helpers/ui-foundation-evidence.js";

const applicationOrigin = "http://127.0.0.1:3100";
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

async function chooseTheme(page: Page, theme: "Light" | "Dark") {
  await page.getByRole("radio", { name: theme }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", theme.toLowerCase());
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

test("first paint applies the stored Dark theme before hydration", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("oalo:theme-preference", "dark");
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
  });
  const guard = await guardSyntheticLocalPage(page);

  await page.goto("/overview");
  await expect(page.getByRole("radiogroup", { name: "Appearance theme" })).toBeVisible();
  const samples = await page.evaluate(
    () => (window as Window & { __oaloThemeSamples?: ThemeSample[] }).__oaloThemeSamples ?? [],
  );
  const firstResolved = samples.find((sample) => sample.theme !== null);
  const firstFrame = samples.find((sample) => sample.phase === "first-animation-frame");

  expect(firstResolved?.theme).toBe("dark");
  expect(firstFrame).toMatchObject({ theme: "dark", colorScheme: "dark" });
  expect(samples.some((sample) => sample.theme === "light")).toBe(false);
  await assertGuardClean(guard);
});

test("UIF-009 supports CSS compact and explicit collapsed navigation", async ({ page }) => {
  const guard = await guardSyntheticLocalPage(page);
  await page.setViewportSize({ width: 1180, height: 900 });
  await page.goto("/overview");

  const sidebar = page.getByLabel("Primary workspace");
  await expect(sidebar).not.toHaveAttribute("data-collapsed", "true");
  expect((await sidebar.boundingBox())?.width).toBe(80);
  const compactLinks = page
    .getByRole("navigation", { name: "Product navigation" })
    .getByRole("link");
  await expect(compactLinks).toHaveCount(9);
  for (const link of await compactLinks.all()) {
    await expect(link).toHaveAttribute("aria-label", /\S/u);
    await expect(link).toHaveAttribute("title", /\S/u);
  }

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.reload();
  await page.getByRole("button", { name: "Collapse navigation" }).click();
  await expect(sidebar).toHaveAttribute("data-collapsed", "true");
  await expect.poll(async () => Math.round((await sidebar.boundingBox())?.width ?? 0)).toBe(80);
  for (const link of await compactLinks.all()) {
    await expect(link).toHaveAttribute("aria-label", /\S/u);
    await expect(link).toHaveAttribute("title", /\S/u);
  }
  await assertGuardClean(guard);
});

test("1180 and 390 layouts preserve the required Overview priorities", async ({ page }) => {
  const guard = await guardSyntheticLocalPage(page);
  await page.setViewportSize({ width: 1180, height: 900 });
  await page.goto("/overview");
  for (const heading of ["Business Pulse", "Active Work", "Attention Queue"]) {
    await expect(page.getByRole("heading", { name: heading, exact: true })).toBeAttached();
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  const readiness = page.getByText("Attention Required", { exact: true }).last();
  const quickActions = page.getByRole("heading", { name: "Quick actions", exact: true });
  const businessPulse = page.getByRole("heading", { name: "Business Pulse", exact: true });
  const attention = page.getByRole("heading", { name: "Attention Queue", exact: true });
  const moreActions = page.getByRole("heading", { name: "More quick actions", exact: true });
  const prioritySection = businessPulse.locator("xpath=ancestor::section");
  const priorityActions = quickActions
    .locator("xpath=ancestor::section")
    .locator("button, a[href]");

  await expect(priorityActions).toHaveCount(2);
  await expect(prioritySection.locator("article")).toHaveCount(4);
  const verticalOrder = await Promise.all(
    [readiness, quickActions, businessPulse, attention, moreActions].map(async (locator) =>
      locator.evaluate((element) => element.getBoundingClientRect().top + window.scrollY),
    ),
  );
  expect(verticalOrder).toEqual([...verticalOrder].sort((left, right) => left - right));
  await assertGuardClean(guard);
});

test("mobile drawer traps focus, locks scroll, closes on Escape, and restores focus", async ({
  page,
}) => {
  const guard = await guardSyntheticLocalPage(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/overview");
  const trigger = page.getByRole("button", { name: "Open navigation" });
  await trigger.focus();
  await trigger.press("Enter");

  const drawer = page.getByRole("dialog", { name: "Workspace navigation" });
  await expect(drawer).toBeVisible();
  await expect(page.locator("body")).toHaveCSS("overflow", "hidden");
  await expect(page.getByRole("button", { name: "Close navigation" }).last()).toBeFocused();
  const focusables = drawer.locator(
    "a[href], button:not([disabled]), [tabindex]:not([tabindex='-1'])",
  );
  const last = focusables.last();
  await last.focus();
  await page.keyboard.press("Tab");
  await expect(focusables.first()).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();
  await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");
  await expect(trigger).toBeFocused();
  await assertGuardClean(guard);
});

test("keyboard focus, target size, checklist order, and reduced motion meet the UX contract", async ({
  page,
}) => {
  const guard = await guardSyntheticLocalPage(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/onboarding");

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

  const checklistHeadings = await page.locator("[data-tour^='onboarding-'] h3").allTextContents();
  expect(checklistHeadings).toEqual([
    "Install and permissions",
    "Brand and compliance",
    "HighLevel routing",
    "Meta connection",
    "Team responsibilities",
    "Dependency recheck",
    "Synthetic lead",
    "Results review",
    "Launch Ready",
  ]);
  const animated = await page.locator("main *").evaluateAll((elements) =>
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

for (const route of ["overview", "onboarding"] as const) {
  for (const theme of ["Light", "Dark"] as const) {
    for (const viewport of [
      { width: 1180, height: 900 },
      { width: 390, height: 844 },
    ] as const) {
      test(`${route} ${theme} ${viewport.width}x${viewport.height} is axe-clean and captured`, async ({
        page,
      }) => {
        const guard = await guardSyntheticLocalPage(page);
        await page.setViewportSize(viewport);
        await page.goto(`/${route}`);
        await chooseTheme(page, theme);
        await assertAxeClean(page);
        const fileName = `${route}-${theme.toLowerCase()}-${viewport.width}x${viewport.height}.png`;
        await page.screenshot({ path: evidencePath(fileName) });
        screenshots.push(fileName);
        await assertGuardClean(guard);
      });
    }
  }
}

test("open drawer and Overview state gallery are captured", async ({ page }) => {
  const guard = await guardSyntheticLocalPage(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/overview");
  await chooseTheme(page, "Light");
  await page.getByRole("button", { name: "Open navigation" }).click();
  await assertAxeClean(page);
  await page.screenshot({ path: evidencePath("overview-light-mobile-drawer-open-390x844.png") });
  screenshots.push("overview-light-mobile-drawer-open-390x844.png");

  await page.setViewportSize({ width: 1180, height: 900 });
  await page.goto("/overview");
  await chooseTheme(page, "Dark");
  await page.getByRole("banner").evaluate((element) => {
    element.style.position = "static";
  });
  const gallery = page
    .getByRole("heading", { name: "Overview edge-state matrix" })
    .locator("xpath=ancestor::section");
  await gallery.scrollIntoViewIfNeeded();
  await gallery.screenshot({ path: evidencePath("overview-dark-state-gallery-1180x900.png") });
  screenshots.push("overview-dark-state-gallery-1180x900.png");
  await assertGuardClean(guard);
});

test.afterAll(() => {
  writeEvidenceSummary({
    generatedAt: new Date().toISOString(),
    syntheticOnly: true,
    externalRequestsAllowed: false,
    screenshots: [...screenshots].sort(),
    viewportContracts: ["1180x900", "390x844"],
  });
});
