import { AxeBuilder } from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/** PRD-010 A+B: actual save/generation handlers and local store; no mocked outputs or network saves. */
for (const width of [1440, 1180, 768, 390]) {
  for (const theme of ["light", "dark"] as const) {
    test(`property campaign prepares and generates at ${width}px in ${theme}`, async ({
      page,
    }, testInfo) => {
      test.setTimeout(60_000);
      const pageErrors: string[] = [];
      page.on("pageerror", (error) => pageErrors.push(error.message));
      await page.setViewportSize({ width, height: 1000 });
      await page.addInitScript(
        (selected) => window.localStorage.setItem("oalo:theme-preference", selected),
        theme,
      );
      const response = await page.goto("/marketing/campaigns/property");
      expect(response?.status()).toBe(200);
      await expect(
        page.getByRole("heading", { name: "Create a property campaign", level: 1 }),
      ).toBeVisible();
      await expect(
        page.getByText("Local demonstration. Use made-up property details only."),
      ).toBeVisible();
      await expect(page.getByRole("button", { name: "Save campaign draft" })).toBeEnabled();
      await page.screenshot({
        path: testInfo.outputPath(`property-form-${width}.png`),
        fullPage: true,
      });
      expect((await new AxeBuilder({ page }).include("main").analyze()).violations).toEqual([]);

      const address = `${width} Example Street, Dallas`;
      await page.getByLabel("Property address", { exact: true }).fill(address);
      await page
        .getByLabel("Property description", { exact: true })
        .fill("Synthetic property used to verify a complete draft save and reload.");
      await page.getByRole("combobox", { name: "State", exact: true }).click();
      await page.getByRole("option", { name: "Texas", exact: true }).click();
      await page.getByRole("combobox", { name: "Realtor partner", exact: true }).click();
      await page
        .getByRole("option", { name: "Jordan Sample, Example Realty", exact: true })
        .click();
      await page.getByLabel("Starts", { exact: true }).fill("2030-06-12T18:00");
      await page.getByLabel("Ends", { exact: true }).fill("2030-06-12T20:00");
      for (const checkbox of await page.getByRole("checkbox").all())
        await expect(checkbox).not.toBeChecked();

      const savedResponse = page.waitForResponse(
        (result) =>
          result.url().endsWith("/api/campaigns/property") && result.request().method() === "POST",
      );
      await page.getByRole("button", { name: "Save campaign draft" }).click();
      expect((await savedResponse).status()).toBe(200);
      await expect(page).toHaveURL(/\/marketing\/campaigns\/campaign_[a-f0-9]{32}$/u);
      await expect(page.getByRole("heading", { level: 1, name: address })).toBeVisible();
      // The first save also navigates through an RSC stream. Let it finish before testing reload.
      await page.waitForLoadState("networkidle");
      await page.reload();
      await expect(page.getByRole("heading", { level: 1, name: address })).toBeVisible();
      await expect(page.getByText("Jordan Sample, Example Realty", { exact: true })).toBeVisible();
      await expect(page.getByText("Not generated", { exact: true })).toBeVisible();
      await expect(page.getByText("Not verified", { exact: true })).toBeVisible();
      await expect(page.getByRole("button", { name: /approve|publish|launch/iu })).toHaveCount(0);
      expect((await new AxeBuilder({ page }).include("main").analyze()).violations).toEqual([]);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
      await page.screenshot({
        path: testInfo.outputPath(`property-saved-${width}.png`),
        fullPage: true,
      });

      const generatedResponse = page.waitForResponse(
        (result) =>
          result.url().endsWith("/api/campaigns/property/package") &&
          result.request().method() === "POST",
      );
      await page.getByRole("button", { name: "Generate draft materials", exact: true }).click();
      expect((await generatedResponse).status()).toBe(200);
      await expect(page.getByRole("heading", { name: "Draft materials ready" })).toBeVisible();
      // Both the panel and the journey update from the confirmed package, without a second
      // server refresh. A deliberate reload below independently proves durable readback.
      await expect(page.locator('[data-property-package-stage="materials"]')).toContainText(
        "Private drafts ready",
      );
      await page.waitForLoadState("networkidle");
      await page.reload();
      await expect(page.getByRole("heading", { name: "Draft materials ready" })).toBeVisible();
      const qr = page.getByRole("img", { name: /Draft QR code for this campaign/ });
      await expect(qr).toBeVisible();
      expect(
        await qr.evaluate((image) => image instanceof HTMLImageElement && image.naturalWidth > 0),
      ).toBe(true);
      await qr.screenshot({ path: testInfo.outputPath("preview-qr.png") });
      expect((await new AxeBuilder({ page }).include("main").analyze()).violations).toEqual([]);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
      await expect(page.getByRole("heading", { level: 1, name: address })).toBeInViewport();
      await page.screenshot({
        path: testInfo.outputPath(`package-ready-${width}-${theme}.png`),
        fullPage: true,
      });

      const popupPromise = page.waitForEvent("popup");
      await page.getByRole("link", { name: /^Open property page draft/ }).click();
      const preview = await popupPromise;
      await preview.setViewportSize({ width, height: 1000 });
      await preview.waitForLoadState("domcontentloaded");
      await expect(preview.getByRole("heading", { name: address, level: 1 })).toBeVisible();
      await expect(
        preview.getByText("DRAFT / INTERNAL REVIEW ONLY", { exact: true }),
      ).toBeVisible();
      expect((await new AxeBuilder({ page: preview }).analyze()).violations).toEqual([]);
      expect(
        await preview.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
      await preview.screenshot({
        path: testInfo.outputPath("property-page-preview.png"),
        fullPage: true,
      });
      await preview.close();

      const downloadPromise = page.waitForEvent("download");
      await page.getByRole("link", { name: "Download draft flyer", exact: true }).click();
      await (await downloadPromise).saveAs(testInfo.outputPath("draft-flyer.pdf"));
      const textHref = await page
        .getByRole("link", { name: /^Open campaign copy/ })
        .getAttribute("href");
      const copyResponse = await page.request.get(textHref!);
      expect(copyResponse.status()).toBe(200);
      const text = await copyResponse.text();
      expect(text).toContain(address);
      expect(text).toContain("SOCIAL POST DRAFT");
      expect(text).toContain("EMAIL DRAFT");
      expect(text).toContain("SMS DRAFT");
      await expect(page.getByRole("button", { name: /approve|publish|launch/iu })).toHaveCount(0);
      expect(pageErrors).toEqual([]);
    });
  }
}
