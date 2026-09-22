import { expect, test, type Page } from "@playwright/test";
import { AxeBuilder } from "@axe-core/playwright";

test.beforeEach(async ({ baseURL }, info) => {
  test.skip(info.project.name !== "dashboard-preview", "Uses the demo setup runtime");
  expect(baseURL).toBeDefined();
});
async function visit(page: Page, path: string) {
  await page.goto(path, { waitUntil: "networkidle" });
  await expect(page.locator("main h1")).toBeVisible();
}
async function choice(page: Page, label: string, value: string | RegExp) {
  await page.getByRole("combobox", { name: label, exact: true }).click();
  await page.getByRole("option", { name: value, exact: typeof value === "string" }).click();
}
async function pauseGuide(page: Page) {
  const pause = page.getByRole("button", { name: "Pause walkthrough", exact: true });
  if (await pause.isVisible()) await pause.click();
}

test("first-use onboarding saves real steps, resumes, and finishes after explicit campaign approval", async ({
  page,
}, info) => {
  await visit(page, "/overview");
  await expect(page.getByRole("heading", { name: "Welcome to AutomatedLO." })).toBeVisible();
  await page.getByRole("button", { name: "Set up my workspace" }).click();
  await expect(page).toHaveURL(/\/onboarding$/u);
  await page.getByLabel("Your name").fill("Alex Test");
  await page.getByLabel("Company name").fill("Guided Demo Lending");
  await page.getByLabel("Email address", { exact: true }).fill("alex@example.test");
  await page.getByLabel("Market area").fill("Dallas, TX");
  await page.getByRole("button", { name: "Save & continue" }).click();
  await expect(page.getByRole("heading", { name: "Make it sound like you." })).toBeVisible();
  await page.getByRole("button", { name: "Pause setup", exact: true }).click();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Welcome to AutomatedLO." })).toHaveCount(0);
  await page.getByRole("button", { name: "Help & setup", exact: true }).click();
  await page.getByRole("button", { name: "Resume setup", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Make it sound like you." })).toBeVisible();
  await page.getByLabel("Brand tagline").fill("Your next home starts with a conversation.");
  await page.getByRole("button", { name: "Save & continue" }).click();
  await choice(page, "Realtor partner", /^Add a new partner/u);
  await page.getByLabel("Partner name").fill("Robin Demo");
  await page.getByLabel("Brokerage").fill("Fictional Homes");
  await page.getByLabel("Partner email").fill("robin@example.test");
  await page.getByRole("button", { name: "Save & continue" }).click();
  await choice(page, "Starting stage", "Contacted");
  await page.getByRole("button", { name: "Save & continue" }).click();
  await expect(page.getByText("Live setup needed", { exact: true })).toHaveCount(3);
  await page.getByRole("button", { name: "Continue with demo" }).click();
  await page.getByRole("button", { name: "Create my first campaign" }).click();
  await expect(page.getByRole("dialog", { name: "Start with the property" })).toBeVisible();
  await expect(page.getByLabel("Realtor name", { exact: true })).toHaveValue("Robin Demo");
  await expect(page.getByLabel("Where the ad runs", { exact: true })).toHaveValue("Dallas, TX");
  await pauseGuide(page);
  await page.getByRole("button", { name: "Use example property" }).click();
  await expect(page.getByLabel("Realtor name", { exact: true })).toHaveValue("Robin Demo");
  await page.getByRole("button", { name: "Save & review campaign" }).click();
  await page.getByRole("link", { name: "Open campaign", exact: true }).click();
  await expect(page.getByRole("button", { name: "Publish campaign", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Approve campaign", exact: true }).click();
  await page.getByRole("button", { name: "Confirm approval", exact: true }).click();
  await expect(page.getByRole("button", { name: "Approval recorded" })).toBeVisible();
  await page.getByRole("link", { name: "Continue my setup", exact: true }).click();
  await page.getByRole("button", { name: "Continue to final review", exact: true }).click();
  await page.getByRole("button", { name: "Finish setup", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Your demo workspace is set up." })).toBeVisible();
  await page.screenshot({ path: info.outputPath("onboarding-complete.png"), fullPage: true });
  await page.reload();
  await expect(page.getByRole("heading", { name: "Your demo workspace is set up." })).toBeVisible();
  await visit(page, "/partners");
  await expect(page.getByRole("heading", { name: "Robin Demo", exact: true })).toBeVisible();
  await visit(page, "/settings/routing");
  await expect(page.getByRole("combobox", { name: "Starting stage" })).toHaveText("Contacted");
});

test("setup cannot finish without the saved steps or advance after storage failure", async ({
  page,
}) => {
  await visit(page, "/onboarding");
  await page.getByRole("button", { name: /Final review/u }).click();
  await expect(page.getByRole("button", { name: "Finish setup", exact: true })).toBeDisabled();
  await page
    .getByRole("button", { name: /Your profile/u })
    .first()
    .click();
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("Disabled", "QuotaExceededError");
    };
  });
  await page.getByRole("button", { name: "Save & continue" }).click();
  await expect(page.getByRole("heading", { name: "Start with your business." })).toBeVisible();
  await expect(
    page.getByText("Your changes could not be saved. Check this browser's storage and try again.", {
      exact: true,
    }),
  ).toBeVisible();
});

test("dropdown keyboard, long-list scrolling, popup position and modal ownership", async ({
  page,
}, info) => {
  await visit(page, "/marketing/campaigns/new");
  const state = page.getByRole("combobox", { name: "State", exact: true });
  await state.focus();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("End");
  await expect(page.getByRole("option", { name: "Wyoming (WY)" })).toBeInViewport();
  await page.keyboard.press("Escape");
  await expect(state).toHaveText("Choose a state");
  await page.keyboard.type("tex");
  await page.keyboard.press("Enter");
  await expect(state).toHaveText("Texas (TX)");
  await visit(page, "/settings/routing");
  const trigger = page.getByRole("combobox", { name: "Starting stage", exact: true });
  await trigger.focus();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await expect(trigger).toHaveText("New");
  await page.keyboard.press("Escape");
  await expect(trigger).toHaveText("New");
  await choice(page, "Starting stage", "Appointment");
  await page.getByRole("button", { name: "Save routing", exact: true }).click();
  await page.reload();
  await expect(trigger).toHaveText("Appointment");
  for (const theme of ["Light", "Dark"]) {
    await page.getByRole("button", { name: "Appearance", exact: true }).click();
    await page.getByRole("radio", { name: theme, exact: true }).click();
    await page.keyboard.press("Escape");
    await trigger.click();
    const bounds = await page.getByRole("listbox").boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.y).toBeGreaterThanOrEqual(0);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(1000);
    const audit = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(audit.violations).toEqual([]);
    await page.screenshot({
      path: info.outputPath(`${theme.toLowerCase()}-dropdown.png`),
      fullPage: true,
    });
    await page.keyboard.press("Escape");
  }
  await visit(page, "/leads");
  await page.getByRole("button", { name: "Morgan Ellis", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("combobox").click();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeVisible();
  await expect(page.getByRole("listbox")).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
});

test("campaign sections and walkthrough targets stay clear at desktop, tablet, and mobile sizes", async ({
  page,
}, info) => {
  test.setTimeout(180000);
  for (const width of [1440, 1180, 768, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    await visit(page, "/marketing/campaigns/new");
    const welcome = page.getByRole("button", { name: "Explore first", exact: true });
    if (await welcome.isVisible()) await welcome.click();
    await page.getByRole("button", { name: "Help & setup", exact: true }).click();
    await page.getByRole("button", { name: "Walk me through this page", exact: true }).click();
    for (let index = 0; index < 6; index++) {
      const panel = page.locator('[data-product-walkthrough="true"]');
      await expect(panel).toBeVisible();
      const target = page.locator('[data-guided-setup-highlight="true"]');
      await expect(target).toHaveCount(1);
      await expect
        .poll(
          async () =>
            target.evaluate((element) => {
              const r = element.getBoundingClientRect();
              const pane = document
                .querySelector('[data-product-walkthrough="true"]')!
                .getBoundingClientRect();
              const header = document
                .querySelector("[data-shell-sticky-header]")!
                .getBoundingClientRect();
              const overlap =
                r.left < pane.right &&
                r.right > pane.left &&
                r.top < pane.bottom &&
                r.bottom > pane.top;
              return r.top >= header.bottom && r.bottom <= innerHeight && !overlap;
            }),
          { message: `${width} step ${index + 1} target is not covered` },
        )
        .toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      if (index === 4)
        await page.screenshot({
          path: info.outputPath(`budget-guide-${width}.png`),
          fullPage: false,
        });
      await panel
        .getByRole("button", { name: index === 5 ? "Finish walkthrough" : "Next", exact: true })
        .click();
    }
    await expect(page.locator('[data-product-walkthrough="true"]')).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.querySelectorAll('[data-guided-setup-highlight="true"]').length,
      ),
    ).toBe(0);
    await page.getByRole("link", { name: "03 Budget", exact: true }).click();
    const card = page.locator("#campaign-budget");
    const title = card.getByRole("heading", { name: "Budget & reach", exact: true });
    await expect(title).toBeVisible();
    const rect = await card.boundingBox();
    const textRect = await title.boundingBox();
    expect(textRect!.y).toBeGreaterThan(rect!.y + 10);
    await page.getByRole("combobox", { name: "State", exact: true }).focus();
    await page.keyboard.press("ArrowDown");
    await expect(page.getByRole("option", { name: "Alabama (AL)" })).toBeInViewport();
    await page.keyboard.press("Escape");
  }
});

test("walkthrough pause and replay preserve unsaved form input and saved business records", async ({
  page,
}) => {
  await visit(page, "/settings");
  await page.getByLabel("Company name").fill("Keep this unsaved edit");
  await page.getByRole("button", { name: "Help & setup", exact: true }).click();
  await page.getByRole("button", { name: "Walk me through this page", exact: true }).click();
  const panel = page.locator('[data-product-walkthrough="true"]');
  await panel.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByLabel("Company name")).toHaveValue("Keep this unsaved edit");
  await pauseGuide(page);
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await page.reload();
  await expect(page.getByLabel("Company name")).toHaveValue("Keep this unsaved edit");
  await page.getByRole("button", { name: "Help & setup", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Resume walkthrough", exact: true })
    .click();
  await expect(
    panel.getByRole("heading", { name: "Choose your market", exact: true }),
  ).toBeVisible();
  await pauseGuide(page);
  await page.getByRole("button", { name: "Help & setup", exact: true }).click();
  await page.getByRole("button", { name: "Profile & brand", exact: true }).click();
  await expect(
    panel.getByRole("heading", { name: "Make the workspace yours", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Company name")).toHaveValue("Keep this unsaved edit");
});

test("onboarding and an open guide remain accessible in light, dark, and mobile layouts", async ({
  page,
}, info) => {
  test.setTimeout(180000);
  for (const theme of ["Light", "Dark"] as const) {
    await visit(page, "/onboarding");
    await page.getByRole("button", { name: "Appearance", exact: true }).click();
    await page.getByRole("radio", { name: theme, exact: true }).click();
    await page.keyboard.press("Escape");
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      for (const step of [
        /Your profile/u,
        /Your brand/u,
        /Realtor partner/u,
        /Lead routing/u,
        /Your connections/u,
      ]) {
        await page
          .getByRole("complementary", { name: "Setup progress" })
          .getByRole("button", { name: step })
          .click();
        const result = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze();
        expect(
          result.violations.map((item) => ({
            id: item.id,
            nodes: item.nodes.map((node) => ({
              target: node.target,
              summary: node.failureSummary,
            })),
          })),
          `${theme} ${width} ${step}`,
        ).toEqual([]);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        );
        if (String(step).includes("Your profile"))
          await page.screenshot({
            path: info.outputPath(`setup-${theme.toLowerCase()}-${width}.png`),
            fullPage: true,
          });
      }
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await visit(page, "/marketing/campaigns/new");
    await page.getByRole("button", { name: "Help & setup", exact: true }).click();
    await page.getByRole("button", { name: "Walk me through this page", exact: true }).click();
    await expect(page.locator('[data-guided-setup-highlight="true"]')).toHaveCount(1);
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(result.violations).toEqual([]);
    await pauseGuide(page);
  }
});

test("every Help walkthrough points to an existing control without performing its action", async ({
  page,
}) => {
  test.setTimeout(180000);
  await visit(page, "/marketing/campaigns/new");
  await page.getByRole("button", { name: "Use example property" }).click();
  await page.getByRole("button", { name: "Save & review campaign" }).click();
  await page.getByRole("link", { name: "Open campaign", exact: true }).click();
  const reviewPath = new URL(page.url()).pathname;
  for (const [name, startPath] of [
    ["Your dashboard", "/overview"],
    ["Profile & brand", "/settings"],
    ["Realtor partners", "/partners"],
    ["Leads & pipeline", "/leads/pipeline"],
    ["Create a campaign", "/marketing/campaigns/new"],
    ["Reports & downloads", "/reports"],
    ["Account connections", "/settings/connections"],
    ["Review & approval", reviewPath],
  ]) {
    await visit(page, startPath!);
    await page.getByRole("button", { name: "Help & setup", exact: true }).click();
    await page
      .getByRole("dialog", { name: "Help & setup", exact: true })
      .getByRole("button", { name, exact: true })
      .click();
    const panel = page.locator('[data-product-walkthrough="true"]');
    for (let index = 0; index < 8; index++) {
      await expect(panel).toBeVisible();
      await expect(
        page.locator('[data-guided-setup-highlight="true"]'),
        `${name} step ${index + 1}`,
      ).toHaveCount(1);
      await expect(panel.getByRole("button", { name: "Let me try", exact: true })).toBeEnabled();
      const last = panel.getByRole("button", { name: "Finish walkthrough", exact: true });
      if (await last.isVisible()) {
        await last.click();
        break;
      }
      await panel.getByRole("button", { name: "Next", exact: true }).click();
    }
    await expect(panel).toHaveCount(0);
  }
  await visit(page, reviewPath);
  await expect(page.getByRole("button", { name: "Approve campaign", exact: true })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Publish campaign", exact: true })).toBeDisabled();
});
