import { expect, test } from "@playwright/test";
test("standalone AVM creates a property valuation without a contact", async ({ page }, info) => {
  test.skip(info.project.name !== "dashboard-preview", "Requires the explicit sample workspace");
  await page.goto("/homeowners/new", { waitUntil: "networkidle" });
  await page.getByRole("combobox", { name: "Report type", exact: true }).click();
  await page
    .getByRole("option", { name: "Property valuation (no contact required)", exact: true })
    .click();
  await expect(page.getByLabel("Search homeowner contacts")).toHaveCount(0);
  await page.getByRole("button", { name: "Use fictional sample property" }).click();
  await page
    .getByLabel("I have confirmed the property address and authorize this valuation lookup.")
    .check();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Create report", exact: true }).click();
  await expect(page).toHaveURL(/\/homeowners\/home_[a-f0-9]{32}$/u);
  await expect(page.getByText("Property valuation report", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Hand off to HighLevel" })).toBeDisabled();
  await page.reload();
  await expect(page.getByText("Property valuation report", { exact: true })).toBeVisible();
});
