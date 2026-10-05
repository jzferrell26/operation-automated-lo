import { AxeBuilder } from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/** PRD-010 Batch A: real browser and real local store, synthetic data only, no mocked save endpoint. */
for (const width of [1440, 390]) {
  test(`property preparation saves and reloads at ${width}px`, async ({ page }, testInfo) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    await page.setViewportSize({ width, height: 1000 });
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
    await page.getByRole("option", { name: "Jordan Sample, Example Realty", exact: true }).click();
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
    expect(pageErrors).toEqual([]);
  });
}
