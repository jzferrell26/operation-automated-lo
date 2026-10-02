import { expect, test, type Page } from "@playwright/test";

import { expectAxeClean } from "../helpers/design-quality.js";
import { SAMPLE_ADS, saveACampaign, saveAndCheck } from "../helpers/launch-an-ad.js";
import {
  expectNoExternalRequests,
  guardLocalOrigin,
  seededCredentials,
  signInExisting,
} from "./helpers/guided-setup-journey.js";
import { saveBrandDetails } from "./helpers/saved-brand.js";

/**
 * PRD-009e, against a real database in the review project: the campaign page's approval names the
 * decider (009E-AC-004), lists every version and opens an older one read-only (009E-AC-005), and
 * answers a version that never was exactly as it answers an unknown reference.
 *
 * It sorts after `review-campaign-decision.spec.ts`, which also leaves a campaign against the seeded
 * creator and a decision against the seeded approver; this spec makes its own campaign and does not
 * read anyone else's. The seeded approver's display name is "Review approver"
 * (`tooling/scripts/database/seed-review-location.mjs`), and that is the name the approval must
 * carry: read from the approver's own session on the server, never typed into the request.
 */

const APPROVAL_SENTENCE =
  /Approved by Review approver, approver, on [A-Z][a-z]{2} \d{1,2}, \d{4}\./u;

async function approvalRegion(page: Page) {
  return page.getByRole("region", { name: "Approval" });
}

test("the campaign page names who approved, lists every version, and opens an older one read-only", async ({
  browser,
}) => {
  test.setTimeout(300_000);
  const { approverEmail, creatorEmail, password } = seededCredentials();

  // The creator saves a campaign, and sees what it is before anybody has decided on it.
  const creatorContext = await browser.newContext();
  const creator = await creatorContext.newPage();
  const creatorGuard = await guardLocalOrigin(creator);
  await creator.setViewportSize({ width: 1440, height: 900 });
  await signInExisting(creator, creatorEmail, password);
  // The seed saves no Brand, so without this the version has no NMLS number, step 3 reads "Needs
  // changes", and the page offers no hand-off (008B-AC-011). See `saveBrandDetails`.
  await saveBrandDetails(creator);
  const campaignRef = await saveACampaign(creator, {
    ad: SAMPLE_ADS.firstHome,
    place: "Austin, TX",
  });
  const campaignUrl = `/marketing/campaigns/${campaignRef}`;

  await creator.goto(campaignUrl);
  const creatorMain = creator.getByRole("main");
  await expect(creatorMain.getByText("From the ads library, First-time buyers")).toBeVisible();
  await expect(
    creatorMain.getByRole("heading", { level: 1, name: SAMPLE_ADS.firstHome.name }),
  ).toBeVisible();
  await expect(await approvalRegion(creator)).toContainText(
    "Nobody has approved this version yet.",
  );
  await expect(creatorMain.locator("[data-hand-off]")).toBeVisible();
  await expect(creatorMain.getByRole("button", { name: "Launch on Facebook" })).toBeDisabled();
  await expect(creatorMain.getByRole("link", { name: "Make a new version" })).toBeVisible();
  const versions = creatorMain.getByRole("region", { name: "Versions" });
  await expect(versions).toContainText("Version 1");
  await expect(versions).toContainText("Saved on");
  await expect(versions).toContainText("by you");
  await expectAxeClean(creator);

  // The approver decides on it, and the page says who decided, by name, beside the role.
  const approverContext = await browser.newContext();
  const approver = await approverContext.newPage();
  const approverGuard = await guardLocalOrigin(approver);
  await approver.setViewportSize({ width: 1440, height: 900 });
  await signInExisting(approver, approverEmail, password);
  await approver.goto(campaignUrl);
  await approver.getByRole("button", { name: "Approve this version" }).click();
  await approver.getByRole("button", { name: "Yes, approve" }).click();
  await expect(await approvalRegion(approver)).toContainText(APPROVAL_SENTENCE, {
    timeout: 30_000,
  });
  await expect(await approvalRegion(approver)).toContainText(
    "The approval covers this version and these words only. A new version needs its own approval.",
  );
  // Nothing is left to approve, so the control is gone and the chip says so.
  await expect(approver.getByRole("button", { name: "Approve this version" })).toHaveCount(0);
  await expect(
    approver.getByRole("main").locator("[data-campaign-standing='approved']"),
  ).toBeVisible();

  // The name is the one recorded at decision time, so the creator reads the same sentence.
  await creator.goto(campaignUrl);
  await expect(await approvalRegion(creator)).toContainText(APPROVAL_SENTENCE);

  // The creator makes a new version: it joins the same campaign, and the approved one stays as it was.
  await creator.getByRole("link", { name: "Make a new version" }).click();
  await expect(creator.getByRole("heading", { level: 1, name: "Set it up" })).toBeVisible();
  await creator.getByLabel("Headline", { exact: false }).fill("Your first home starts with a plan");
  expect(await saveAndCheck(creator)).toBe(campaignRef);
  await creator.goto(campaignUrl);
  const versionList = creator.getByRole("region", { name: "Versions" });
  const rows = versionList.getByRole("listitem");
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0)).toContainText("Version 2");
  await expect(rows.nth(0)).toContainText("Ready for approval");
  await expect(rows.nth(1)).toContainText("Version 1");
  await expect(rows.nth(1)).toContainText("Approved");
  await expect(rows.nth(1)).toContainText(
    /Approved on [A-Z][a-z]{2} \d{1,2}, \d{4} by Review approver, approver/u,
  );
  // The page is on version 2, and the ad card is labelled with it. Four elements say "Version 2":
  // that label, the versions list's row, the card's "library version 2" fact, and the support
  // details' "version 2". So the label is read inside the card the page names for it, whole, and the
  // page's own attribute says which version it is showing.
  await expect(creator.locator("[data-campaign-page]")).toHaveAttribute("data-version-no", "2");
  await expect(
    creator.getByRole("region", { name: "The ad" }).getByText("Version 2", { exact: true }),
  ).toBeVisible();

  // Version 1 opens read-only at its own address, with the approval it received.
  await rows
    .nth(1)
    .getByRole("link", { name: /Open\s+Version 1/u })
    .click();
  await expect(creator).toHaveURL(new RegExp(`${campaignUrl}/versions/1$`, "u"));
  const older = creator.getByRole("main");
  await expect(older.getByText(/You're looking at an older version/u)).toBeVisible();
  await expect(await approvalRegion(creator)).toContainText(APPROVAL_SENTENCE);
  await expect(older.getByRole("button", { name: "Approve this version" })).toHaveCount(0);
  await expect(older.getByRole("button", { name: "Launch on Facebook" })).toHaveCount(0);
  await expect(older.getByRole("link", { name: "Make a new version" })).toHaveCount(0);
  await expect(older.getByRole("link", { name: "See the latest version" })).toHaveAttribute(
    "href",
    campaignUrl,
  );
  await expectAxeClean(creator);

  // The newest version has the campaign's own address, and a version that never was is not found.
  await creator.goto(`${campaignUrl}/versions/2`);
  await expect(creator).toHaveURL(new RegExp(`${campaignUrl}$`, "u"));
  await creator.goto(`${campaignUrl}/versions/3`);
  await expect(creator.getByRole("main")).toContainText("This page could not be found");
  await creator.goto(`${campaignUrl}/versions/0`);
  await expect(creator.getByRole("main")).toContainText("This page could not be found");

  expectNoExternalRequests(creatorGuard);
  expectNoExternalRequests(approverGuard);
  await creatorContext.close();
  await approverContext.close();
});
