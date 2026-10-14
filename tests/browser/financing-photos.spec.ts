import { createHash, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { AxeBuilder } from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { z } from "zod";
import {
  REVIEW_FRAMES,
  settleForScreenshot,
  warmFullPageCapture,
  expectTextAtTheTypeSteps,
} from "./helpers/design-quality.js";

const digest = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const Uploaded = z
  .object({
    mediaRef: z.string().regex(/^media_[a-f0-9]{32}$/u),
    sha256: z.string().regex(/^[a-f0-9]{64}$/u),
  })
  .passthrough();
const Saved = z
  .object({
    campaignRef: z.string(),
    campaignVersionRef: z.string(),
    providerPublicationAuthorized: z.literal(false),
  })
  .strict();
const frameRoot = join(process.cwd(), "test-results/product-review-frames/financing-photos");

// Original fictional house illustrations are purpose-built upload fixtures, not licensed references.
async function image(index: number) {
  return sharp(
    Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600"><rect width="900" height="600" fill="#c3dded"/><rect y="425" width="900" height="175" fill="#72955c"/><rect x="180" y="225" width="540" height="260" fill="${index ? "#eed6b4" : "#e9e7df"}"/><path d="M130 250L450 70L770 250Z" fill="#45566c"/><rect x="390" y="320" width="120" height="165" fill="#42617e"/><g fill="#a6c9df" stroke="#fdfdfd" stroke-width="14"><rect x="240" y="285" width="95" height="90"/><rect x="565" y="285" width="95" height="90"/></g><path d="M400 485L500 485L565 600L335 600Z" fill="#ded5c7"/></svg>`,
    ),
  )
    .jpeg()
    .toBuffer();
}

for (const { width, height } of REVIEW_FRAMES)
  for (const theme of ["light", "dark"] as const) {
    test(`saved financing photographs at ${width}px in ${theme}`, async ({ page }) => {
      test.setTimeout(120_000);
      await mkdir(frameRoot, { recursive: true });
      const errors: string[] = [];
      const externalRequests: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("request", (request) => {
        const url = new URL(request.url());
        if (/^https?:$/u.test(url.protocol) && url.origin !== "http://127.0.0.1:3100")
          externalRequests.push(url.origin);
      });
      await page.setViewportSize({ width, height });
      await page.addInitScript(
        (selected) => localStorage.setItem("oalo:theme-preference", selected),
        theme,
      );
      await page.goto("/marketing/campaigns/financing");
      // Confirm the interactive client has hydrated before selecting the file, which React must retain.
      await page.getByRole("combobox", { name: "State", exact: true }).click();
      await page.getByRole("option", { name: "Texas", exact: true }).click();
      const media: { mediaRef: string; altText: string; sha256: string }[] = [];
      for (let i = 0; i < 2; i++) {
        const altText =
          `Original fictional house fixture ${i + 1}, a porch and two windows. ${"Detailed property view. ".repeat(8)}`.trim();
        await page.getByLabel("Choose a property photograph").setInputFiles({
          name: `fictional-house-${i + 1}.jpg`,
          mimeType: "image/jpeg",
          buffer: await image(i),
        });
        await page.getByRole("combobox", { name: "Photograph usage rights" }).click();
        await page.getByRole("option", { name: "I own the photograph", exact: true }).click();
        await page
          .getByRole("checkbox", {
            name: "I confirm these rights allow this photograph in this account's private financing materials",
          })
          .check();
        await page.getByLabel("Photograph description (alt text)", { exact: true }).fill(altText);
        const response = page.waitForResponse(
          (r) => r.url().endsWith("/financing/media") && r.request().method() === "POST",
        );
        await page.getByRole("button", { name: "Upload photograph", exact: true }).click();
        const uploadedResponse = await response;
        const uploadBody = await uploadedResponse.json();
        expect(uploadedResponse.status(), JSON.stringify(uploadBody)).toBe(201);
        const uploaded = Uploaded.parse(uploadBody);
        media.push({ mediaRef: uploaded.mediaRef, sha256: uploaded.sha256, altText });
        await expect(
          page.getByText(`${i + 1} of 6 photographs placed.`, { exact: true }),
        ).toBeVisible();
      }
      await page.getByRole("button", { name: "Use photograph 2 as hero", exact: true }).click();
      media.reverse();
      await expect(page.getByText("Photograph 1 (hero)", { exact: true })).toBeVisible();
      const photographSetup = page.locator("[data-financing-media-input]");
      const placedPhotographs = photographSetup.locator("img");
      await expect(placedPhotographs).toHaveCount(2);
      for (let i = 0; i < 2; i++) {
        await expect
          .poll(() =>
            placedPhotographs.nth(i).evaluate((node) => (node as HTMLImageElement).naturalWidth),
          )
          .toBe(900);
      }
      expect(
        (await new AxeBuilder({ page }).include("[data-financing-media-input]").analyze())
          .violations,
      ).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      expect(
        await photographSetup
          .getByRole("heading", { name: "Property photographs", exact: true })
          .evaluate((node) => getComputedStyle(node).fontSize),
      ).toBe("19px");
      await settleForScreenshot(page);
      await warmFullPageCapture(page);
      await page.evaluate(() => scrollTo(0, 0));
      await page.screenshot({
        path: join(frameRoot, `photos-setup-${width}-${theme}.png`),
        fullPage: true,
      });
      const scenarioCount = width === 1180 ? 5 : 3;
      const address = `${width} Fictional House Lane, Dallas`;
      const quote = {
        noteRateMilliPercent: 6000,
        aprMilliPercent: 6250,
        source: "Original synthetic lender fixture",
        quotedAt: "2020-01-01T00:00:00.000Z",
        expiresAt: "2090-01-01T00:00:00.000Z",
        confirmed: true,
      };
      const response = await page.request.post("/api/campaigns/property/financing", {
        data: {
          requestId: randomUUID(),
          schemaVersion: 2,
          address,
          stateCode: "TX",
          description: "Original fictional property fixture. ".repeat(30),
          partnerId: "00000000-0000-4000-8000-000000000001",
          propertyPermissionConfirmed: false,
          realtorPermissionConfirmed: false,
          propertyFacts: {
            listPriceMinor: 42_000_000,
            bedrooms: 3,
            bathroomsHundredths: 250,
            floorAreaSqFt: 1800,
            confirmed: true,
          },
          propertyMedia: media.map(({ mediaRef, altText }) => ({ mediaRef, altText })),
          financing: {
            purchasePriceMinor: 40_000_000,
            housing: {
              propertyTaxMinor: 45_000,
              homeownersInsuranceMinor: 15_000,
              hoaMinor: 5000,
              otherMinor: 0,
            },
            scenarios: Array.from({ length: scenarioCount }, (_, i) => ({
              id: randomUUID(),
              label: `Option ${i + 1}, ${"a longer original name ".repeat(4)}`,
              program: "conventional",
              structure: "fixed-purchase",
              termMonths: 360,
              downPaymentBps: 2000,
              quote,
              upfrontFee: { amountMinor: 0, treatment: "none" },
              monthlyMortgageInsuranceMinor: 0,
              costs: [],
              costsComplete: true,
              sellerCreditMinor: 0,
              lenderCreditMinor: 0,
              depositMinor: 0,
              assumptions: "Original fictional comparison; no actual pricing or approval.",
            })),
          },
        },
      });
      expect(response.status()).toBe(200);
      const saved = Saved.parse(await response.json());
      await page.goto(`/marketing/campaigns/${saved.campaignRef}`);
      await expect(page.getByRole("heading", { name: address, exact: true })).toBeVisible();
      await page.reload();
      const photos = page.locator("[data-financing-report] img");
      await expect(photos).toHaveCount(2);
      for (let i = 0; i < 2; i++) {
        await photos.nth(i).scrollIntoViewIfNeeded();
        await expect(photos.nth(i)).toHaveAttribute("alt", media[i]!.altText);
        await expect(photos.nth(i)).toHaveAttribute("width", "900");
        await expect
          .poll(() => photos.nth(i).evaluate((node) => (node as HTMLImageElement).naturalWidth))
          .toBe(900);
        const bytes = await (
          await page.request.get((await photos.nth(i).getAttribute("src")) ?? "")
        ).body();
        expect(digest(bytes)).toBe(media[i]!.sha256);
      }
      await expect(page.getByText("$420,000.00", { exact: true })).toBeVisible();
      await expect(page.getByText("$400,000.00", { exact: true }).first()).toBeVisible();
      expect((await new AxeBuilder({ page }).include("main").analyze()).violations).toEqual([]);
      await expectTextAtTheTypeSteps(page);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await settleForScreenshot(page);
      await warmFullPageCapture(page);
      await page.screenshot({
        path: join(frameRoot, `report-${width}-${theme}.png`),
        fullPage: true,
      });
      await page.evaluate(() => scrollTo(0, 0));
      await page.screenshot({ path: join(frameRoot, `hero-${width}-${theme}.png`) });
      const pdf = await page.request.get(
        `/api/campaigns/property/financing/${saved.campaignRef}/${saved.campaignVersionRef}/flyer`,
      );
      expect(pdf.status()).toBe(200);
      expect((await pdf.body()).subarray(0, 5).toString()).toBe("%PDF-");
      await writeFile(join(frameRoot, `report-${width}-${theme}.pdf`), await pdf.body());
      const popup = page.waitForEvent("popup");
      await page.getByRole("link", { name: "Open site preview", exact: false }).click();
      const site = await popup;
      await site.setViewportSize({ width, height });
      await site.waitForLoadState("load");
      await expect(site.locator("img")).toHaveCount(2);
      for (let i = 0; i < 2; i++) {
        const data = await site.locator("img").nth(i).getAttribute("src");
        expect(digest(Buffer.from(data!.split(",")[1]!, "base64"))).toBe(media[i]!.sha256);
        await expect
          .poll(() =>
            site
              .locator("img")
              .nth(i)
              .evaluate((node) => (node as HTMLImageElement).naturalWidth),
          )
          .toBe(900);
      }
      expect((await new AxeBuilder({ page: site }).analyze()).violations).toEqual([]);
      expect(await site.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      // The private artifact has its own fixed stylesheet, not the authenticated UI token layer.
      await site.evaluate(async () => {
        scrollTo(0, 0);
        await document.fonts.ready;
      });
      await site.waitForLoadState("networkidle");
      await warmFullPageCapture(site);
      await site.screenshot({
        path: join(frameRoot, `site-${width}-${theme}.png`),
        fullPage: true,
      });
      await site.close();
      expect(errors).toEqual([]);
      expect(externalRequests).toEqual([]);
    });
  }
