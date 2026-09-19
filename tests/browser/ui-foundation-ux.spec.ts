import { AxeBuilder } from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

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

async function chooseTheme(page: Page, theme: "Light" | "Dark") {
  await page.getByRole("radio", { name: theme }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", theme.toLowerCase());

  /* The segmented control moves its fill and its label colour over
   * `--motion-base`. axe reads computed colour, so sampling before the
   * transition settles reports a blended pair that exists for 180ms and is not
   * a token. Wait for the control to come to rest, with a ceiling above
   * `--motion-slow` for the case where no transition runs at all.
   */
  await page.getByRole("radiogroup", { name: "Appearance theme" }).evaluate(
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
  for (const heading of ["Your numbers", "What you have going on", "Needs your attention"]) {
    await expect(page.getByRole("heading", { name: heading, exact: true })).toBeAttached();
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  const readiness = page.getByText("Still to do", { exact: true }).last();
  const quickActions = page.getByRole("heading", { name: "Quick actions", exact: true });
  const businessPulse = page.getByRole("heading", { name: "Your numbers", exact: true });
  const attention = page.getByRole("heading", { name: "Needs your attention", exact: true });
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
  // PRD-006b D5. The nine steps and their order are unchanged; each one is now named the way a
  // loan officer would name it, and the schema pins the new titles per position.
  expect(checklistHeadings).toEqual([
    "Install and access",
    "Brand and compliance",
    "HighLevel routing",
    "Meta connection",
    "Who does what",
    "Check everything again",
    "Send a test lead",
    "Look at the result",
    "Ready to launch",
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

/* PRD-006d, 006D-AC-017: the tablet frame from design brief section 14 joins the
 * matrix. The brief's tablet rules are a collapsible rail and single-column
 * forms, asserted separately below.
 */
const TABLET_FRAME = { width: 768, height: 1024 } as const;

for (const route of ["overview", "onboarding"] as const) {
  for (const theme of ["Light", "Dark"] as const) {
    for (const viewport of [
      { width: 1180, height: 900 },
      TABLET_FRAME,
      { width: 390, height: 844 },
    ] as const) {
      test(`${route} ${theme} ${viewport.width}x${viewport.height} is axe-clean`, async ({
        page,
      }) => {
        const guard = await guardSyntheticLocalPage(page);
        await page.setViewportSize(viewport);
        await page.goto(`/${route}`);
        await chooseTheme(page, theme);
        await assertAxeClean(page);
        if (regenerateEvidence) {
          const fileName = `${route}-${theme.toLowerCase()}-${viewport.width}x${viewport.height}.png`;
          await page.screenshot({ path: evidencePath(fileName) });
          screenshots.push(fileName);
        }
        await assertGuardClean(guard);
      });
    }
  }
}

test("the 768 tablet frame uses the collapsible rail and single-column content", async ({
  page,
}) => {
  const guard = await guardSyntheticLocalPage(page);
  await page.setViewportSize(TABLET_FRAME);

  for (const route of ["overview", "onboarding", "brand"] as const) {
    await page.goto(`/${route}`);

    // Design brief section 14: tablet uses a collapsible navigation rail, not
    // the mobile top bar and drawer.
    const sidebar = page.getByLabel("Primary workspace");
    await expect(sidebar).toBeVisible();
    expect((await sidebar.boundingBox())?.width).toBe(80);
    await expect(page.getByRole("button", { name: "Open navigation" })).toBeHidden();

    // Section 14: no horizontal overflow, and a constrained width puts the
    // page into a single column.
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
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

test("open drawer and Overview state gallery meet accessibility contracts", async ({ page }) => {
  const guard = await guardSyntheticLocalPage(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/overview");
  await chooseTheme(page, "Light");
  await page.getByRole("button", { name: "Open navigation" }).click();
  await assertAxeClean(page);
  if (regenerateEvidence) {
    await page.screenshot({ path: evidencePath("overview-light-mobile-drawer-open-390x844.png") });
    screenshots.push("overview-light-mobile-drawer-open-390x844.png");
  }

  await page.setViewportSize({ width: 1180, height: 900 });
  await page.goto("/overview");
  await chooseTheme(page, "Dark");
  await page.getByRole("banner").evaluate((element) => {
    element.style.position = "static";
  });
  const gallery = page
    .getByRole("heading", { name: "How this page looks in every state" })
    .locator("xpath=ancestor::section");
  await gallery.scrollIntoViewIfNeeded();
  if (regenerateEvidence) {
    await gallery.screenshot({ path: evidencePath("overview-dark-state-gallery-1180x900.png") });
    screenshots.push("overview-dark-state-gallery-1180x900.png");
  }
  await assertGuardClean(guard);
});

test("synthetic acceptance surfaces preserve history, checklist, and authorization boundaries", async ({
  page,
}) => {
  const guard = await guardSyntheticLocalPage(page);
  await page.setViewportSize({ width: 1180, height: 900 });

  await page.goto("/onboarding");
  await page.getByRole("button", { name: "Close this tip" }).click();
  await expect(page.getByRole("region", { name: "Connect your accounts" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Ready to launch" })).toBeVisible();

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

  await page.goto("/reports");
  const authorized = page.locator("[data-location-state='authorized']");
  const restricted = page.locator("[data-location-state='restricted']");
  await expect(authorized.getByRole("link")).toHaveCount(2);
  await expect(restricted.getByRole("link")).toHaveCount(0);
  await page.getByLabel("Activity").selectOption("Campaign review");
  await page.getByLabel("Minutes").fill("25");
  await page.getByRole("button", { name: "Add entry" }).click();
  await expect(page.getByRole("status")).toContainText("Nothing was saved");

  await assertGuardClean(guard);
});

for (const route of [
  "brand",
  "settings/connections",
  "marketing/campaigns/synthetic-open-house-001",
  "reports",
] as const) {
  test(`${route} is accessible and responsive in Light and Dark themes`, async ({ page }) => {
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
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
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
  // PRD-006b D8. The version reference is still there, inside the collapsed support region, which
  // is closed by default: that is the point, so it is asserted as present rather than as visible.
  await expect(page.getByText("Details for support")).toBeVisible();
  await expect(page.getByText("Version ID")).toBeAttached();
  await expect(page.getByText("brand-v3", { exact: true })).toBeAttached();
  await expect(page.locator('[data-profile-field-state="missing"]')).toHaveCount(2);
  await expect(page.getByText("Approved spring newsletter")).toBeVisible();
  await page.getByRole("button", { name: "Use this for Voice" }).click();
  await expect(page.getByRole("status")).toContainText("1 suggestion added to your draft");
  await expect(page.getByText("brand-v3", { exact: true })).toBeAttached();

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

test("delivered approval table, alertdialog, and drawer modal resolve semantic Light and Dark surfaces", async ({
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
  await page.getByRole("button", { name: "Open navigation" }).click();
  const drawer = page.getByRole("dialog", { name: "Workspace navigation" });
  await expect(drawer).toHaveCSS("background-color", /rgb/u);
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
    viewportContracts: ["1180x900", "390x844"],
  });
});
