import { expect, type Page } from "@playwright/test";

/**
 * Saves the "Your details" card of the Brand page: the person's NMLS number, the company's, and
 * optionally the name on the ad.
 *
 * A library ad carries the signed-in person's own saved Brand, read on the server (009D-AC-024), and
 * a person with no NMLS number saved fails the checks with `NMLS_NUMBER_REQUIRED`. So step 3 reads
 * "Needs changes" and the page offers no hand-off, because nothing about a version that needs
 * changes can be approved yet (008B-AC-011). A real loan officer saves the Brand before the first
 * ad, and a review spec that saves a campaign must do the same. The two seeded people
 * (`tooling/scripts/database/seed-review-location.mjs`) have no Brand: the seed inserts no
 * preference row, so the name and company the page starts from are the account's own and the NMLS
 * numbers are empty.
 *
 * It saves only this card. The ad settings card (title, colour, disclosure line, lead form wording)
 * starts from defaults that pass the checks, so a spec that is not about them leaves them alone.
 */
export async function saveBrandDetails(
  page: Page,
  options: Readonly<{ name?: string }> = {},
): Promise<void> {
  await page.goto("/brand", { waitUntil: "networkidle" });
  const main = page.getByRole("main");
  if (options.name !== undefined) {
    await main.getByLabel("Loan officer name", { exact: false }).fill(options.name);
  }
  await main.getByLabel("Your NMLS number", { exact: false }).fill("1234567");
  await main.getByLabel("Company NMLS number", { exact: false }).fill("7654321");
  await main.getByRole("button", { name: "Save your details", exact: true }).click();
  await expect(main.getByText("Your changes are saved.").first()).toBeVisible();
}
