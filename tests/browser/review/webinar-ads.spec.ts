import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { z } from "zod";
import { FUNNELS } from "../../../apps/web/src/features/funnels/catalog.js";
import {
  FunnelDraftSchema,
  FunnelSaveResponseSchema,
} from "../../../apps/web/src/features/funnels/model.js";
import {
  WebinarReviewSchema,
  WebinarSavedSchema,
} from "../../../apps/web/src/features/webinar-ads/preparation-model.js";
import {
  REVIEW_FRAMES,
  expectAxeClean,
  expectNoHorizontalOverflow,
  settleForScreenshot,
  warmFullPageCapture,
} from "../helpers/design-quality.js";
import { chooseThemeFromTheHeader } from "./helpers/review-session.js";
import {
  expectNoExternalRequests,
  guardLocalOrigin,
  seededCredentials,
  signInExisting,
} from "./helpers/guided-setup-journey.js";
import { saveBrandDetails } from "./helpers/saved-brand.js";
import { signInForReviewPreparation } from "./helpers/signin-session.js";

// Actual disposable PostgreSQL, account sessions, native publication and campaign commands.
// No route is mocked. Video URLs are fixture destinations, not uptime or conversion proof.
let creatorContext: BrowserContext, approverContext: BrowserContext, creator: Page, approver: Page;
let publicationId: string;
let creatorGuard: { external: string[] }, approverGuard: { external: string[] };
const artifactDir = join(process.cwd(), "test-results/product-review-frames/webinar-ads");
async function post(page: Page, path: string, body: unknown) {
  return page.evaluate(
    async ({ path, body }) => {
      const token =
        document.querySelector('meta[name="oalo-csrf-token"]')?.getAttribute("content") ?? "";
      const response = await fetch(path, {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        redirect: "error",
        headers: { "content-type": "application/json", "x-csrf-token": token },
        body: JSON.stringify(body),
      });
      return { status: response.status, body: (await response.json()) as unknown };
    },
    { path, body },
  );
}
test.describe.serial("real saved webinar ads", () => {
  test.beforeAll(async ({ browser }) => {
    test.setTimeout(120_000);
    await mkdir(artifactDir, { recursive: true });
    creatorContext = await browser.newContext({ ignoreHTTPSErrors: true });
    approverContext = await browser.newContext({ ignoreHTTPSErrors: true });
    creator = await creatorContext.newPage();
    approver = await approverContext.newPage();
    creatorGuard = await guardLocalOrigin(creator);
    approverGuard = await guardLocalOrigin(approver);
    const credentials = seededCredentials();
    await signInForReviewPreparation(creator, credentials.creatorEmail, () =>
      signInExisting(creator, credentials.creatorEmail, credentials.password),
    );
    await signInForReviewPreparation(approver, credentials.approverEmail, () =>
      signInExisting(approver, credentials.approverEmail, credentials.password),
    );
    await saveBrandDetails(creator);
    const draftResponse = await creator.request.get("/api/funnels");
    expect(draftResponse.status()).toBe(200);
    const drafts = z
      .object({ drafts: z.array(FunnelDraftSchema) })
      .parse(await draftResponse.json()).drafts;
    const definition = FUNNELS.find((value) => value.kind === "on-demand");
    if (definition === undefined) throw new Error("Missing on-demand fixture definition");
    const prepared = await post(creator, "/api/funnels", {
      kind: "on-demand",
      templateVersion: "1.0.0",
      requestId: randomUUID(),
      expectedRevision: drafts.find((value) => value.kind === "on-demand")?.revision ?? null,
      fields: {
        ...definition.defaults,
        headline: "Homebuying essentials for your next chapter",
        videoUrl: "https://www.youtube.com/watch?v=webinar-fixture",
        bookingUrl: "https://calendly.com/",
        sales: {
          ...definition.defaults.sales,
          privacyUrl: "https://www.consumerfinance.gov/privacy/",
          quoteText: "",
          quoteName: "",
        },
      },
    });
    expect(prepared.status, JSON.stringify(prepared.body)).toBe(200);
    const draft = FunnelSaveResponseSchema.parse(prepared.body).draft;
    const published = await post(creator, "/api/funnels/publication", {
      kind: "on-demand",
      expectedRevision: draft.revision,
      reviewed: true,
    });
    expect(published.status, JSON.stringify(published.body)).toBe(200);
    publicationId = z.object({ publication: z.object({ id: z.uuid() }) }).parse(published.body)
      .publication.id;
  });
  test.afterAll(async () => {
    if (creator !== undefined && publicationId !== undefined)
      expect(
        (await post(creator, "/api/funnels/publication", { id: publicationId, action: "revoke" }))
          .status,
      ).toBe(200);
    if (creatorGuard !== undefined) expectNoExternalRequests(creatorGuard);
    if (approverGuard !== undefined) expectNoExternalRequests(approverGuard);
    await creatorContext?.close();
    await approverContext?.close();
  });
  for (const frame of REVIEW_FRAMES)
    for (const theme of ["light", "dark"] as const) {
      test(`persists, reloads, reviews and downloads exact images at ${frame.width}px in ${theme}`, async () => {
        test.setTimeout(150_000);
        await creator.setViewportSize({ width: frame.width, height: frame.height });
        await approver.setViewportSize({ width: frame.width, height: frame.height });
        await creator.goto("/marketing/campaigns/webinar");
        await chooseThemeFromTheHeader(creator, theme);
        const surface = creator.locator("[data-webinar-preparation]");
        await surface
          .getByRole("button", { name: /^Use this creative\s*:\s*Your first home, a clear plan$/u })
          .click();
        await surface.getByRole("combobox", { name: "Published webinar" }).focus();
        await creator.keyboard.press("Home");
        await creator.keyboard.press("Enter");
        await expect(surface.getByRole("combobox", { name: "Published webinar" })).toContainText(
          "Homebuying essentials",
        );
        await surface.getByLabel("Requested end date (UTC)").fill("2090-01-01");
        await surface.getByLabel("Total budget (USD)").fill("5000");
        await surface.getByLabel("Cities or states").fill("Austin, TX; Texas");
        await surface.getByLabel("Facebook headline").fill("Plan for your first home");
        await expectNoHorizontalOverflow(creator);
        await expectAxeClean(creator);
        await surface.getByRole("button", { name: "Review setup" }).click();
        await settleForScreenshot(creator);
        await warmFullPageCapture(creator);
        await creator.screenshot({
          path: join(artifactDir, `setup-${frame.width}-${theme}.png`),
          fullPage: true,
        });
        const pendingResponse = creator.waitForResponse(
          (response) =>
            response.url().endsWith("/api/campaigns/webinar-ads") &&
            response.request().method() === "POST",
        );
        await surface.getByRole("button", { name: "Save and check" }).click();
        const response = await pendingResponse;
        expect(response.status()).toBe(201);
        const saved = WebinarSavedSchema.parse(await response.json());
        await creator.waitForURL("**" + saved.detailHref);
        await expect(creator.locator('[data-campaign-page="webinar-ad"]')).toBeVisible();
        await creator.reload();
        const reviewResponse = await creator.request.get(
          `/api/campaigns/webinar-ads/${saved.campaignRef}/${saved.campaignVersionRef}`,
        );
        expect(reviewResponse.status()).toBe(200);
        const review = WebinarReviewSchema.parse(await reviewResponse.json());
        expect(review.current).toEqual({ available: true });
        expect(review.manifest.destination.publicationId).toBe(publicationId);
        expect(review.effectiveEndsAt).toBe(saved.effectiveEndsAt);
        expect(Date.parse(saved.effectiveEndsAt)).toBeLessThan(
          Date.parse("2090-01-01T23:59:59.000Z"),
        );
        await expect(
          creator.getByRole("heading", { name: "Plan for your first home", level: 1 }),
        ).toBeVisible();
        await expect(creator.getByRole("button", { name: "Launch unavailable" })).toBeDisabled();
        for (const image of review.manifest.images) {
          const bytesResponse = await creator.request.get(review.art[image.shape]);
          expect(bytesResponse.status()).toBe(200);
          expect(
            createHash("sha256")
              .update(await bytesResponse.body())
              .digest("hex"),
          ).toBe(image.contentSha256);
          const downloading = creator.waitForEvent("download");
          await creator.getByRole("link", { name: `Download ${image.shape} branded PNG` }).click();
          const downloadedPath = join(
            artifactDir,
            `download-${frame.width}-${theme}-${image.shape}.png`,
          );
          await (await downloading).saveAs(downloadedPath);
          expect(
            createHash("sha256")
              .update(await readFile(downloadedPath))
              .digest("hex"),
          ).toBe(image.contentSha256);
        }
        await expectNoHorizontalOverflow(creator);
        await expectAxeClean(creator);
        await settleForScreenshot(creator);
        await warmFullPageCapture(creator);
        await creator.screenshot({
          path: join(artifactDir, `review-${frame.width}-${theme}.png`),
          fullPage: true,
        });
        await approver.goto(saved.detailHref);
        await chooseThemeFromTheHeader(approver, theme);
        const decisionResponse = approver.waitForResponse(
          (value) =>
            value.url().endsWith("/api/campaigns/approve") && value.request().method() === "POST",
        );
        await approver.getByRole("button", { name: "Approve this version", exact: true }).click();
        await approver.getByRole("button", { name: "Yes, approve", exact: true }).click();
        expect((await decisionResponse).status()).toBe(200);
        await approver.reload();
        await expect(approver.getByText("Approval recorded", { exact: true })).toBeVisible();
        await expect(
          approver.getByRole("button", { name: "Approve this version", exact: true }),
        ).toHaveCount(0);
        await expectNoHorizontalOverflow(approver);
        await expectAxeClean(approver);
        await settleForScreenshot(approver);
        await warmFullPageCapture(approver);
        await approver.screenshot({
          path: join(artifactDir, `approved-${frame.width}-${theme}.png`),
          fullPage: true,
        });
      });
    }
});
