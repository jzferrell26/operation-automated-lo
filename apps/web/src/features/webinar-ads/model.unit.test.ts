import { createHash } from "node:crypto";
import { lstat, readFile, realpath } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { describe, expect, it } from "vitest";
import { AdsLibraryEntrySchema } from "@oalo/contracts";
import { libraryAdRefusalFor } from "@oalo/application";
import { evaluateLibraryAdWords } from "../../../../../packages/domain/src/library-ad-words.js";
import { inspectAdsLibraryArt } from "../ads-library/server/art-file.js";
import { loadAdsLibrary } from "../ads-library/server/catalog-loader.js";
import { WEBINAR_ADS } from "./catalog.js";
import {
  WebinarAdSchema,
  WebinarPackSchema,
  WEBINAR_GOALS,
  webinarEditorHref,
  webinarReviewCopy,
} from "./model.js";

describe("original pending webinar pack", () => {
  it("keeps shared white-band disclosures in artifact ink despite host preview paragraph styling", async () => {
    const css = await readFile(
      resolve("apps/web/src/features/campaigns/components/ad-creative.module.css"),
      "utf8",
    );
    // Two component classes beat a preview's `.preview p` rule without changing artifact colours.
    expect(css).toMatch(
      /\.band \.disclosure\s*\{\s*color: var\(--ad-band-ink, var\(--tx-strong\)\);\s*\}/u,
    );
  });
  it("has exactly fifteen unique creatives and three per existing webinar learning goal", () => {
    expect(WebinarPackSchema.parse(WEBINAR_ADS)).toHaveLength(15);
    expect(new Set(WEBINAR_ADS.map((ad) => ad.id)).size).toBe(15);
    for (const goal of Object.keys(WEBINAR_GOALS))
      expect(WEBINAR_ADS.filter((ad) => ad.goal === goal)).toHaveLength(3);
    expect(WebinarPackSchema.safeParse(WEBINAR_ADS.slice(1)).success).toBe(false);
    expect(WebinarPackSchema.safeParse([...WEBINAR_ADS.slice(1), WEBINAR_ADS[1]]).success).toBe(
      false,
    );
  });
  it("keeps default words within approved-library word limits and conservative educational checks", () => {
    for (const ad of WEBINAR_ADS) {
      expect(
        evaluateLibraryAdWords(
          {
            headline: ad.headline,
            primaryText: ad.primaryText,
            name: "",
            title: "",
            company: "",
            disclosureLine: "Equal Housing Opportunity.",
            leadFormWording: "Contact me about mortgage education.",
          },
          [],
        ),
        ad.id,
      ).toEqual([]);
      expect(ad.learningConnection).toContain("webinar");
    }
  });
  it("refuses approval fields, active status, markup and art paths outside the creative", () => {
    const ad = WEBINAR_ADS[0];
    expect(
      WebinarAdSchema.safeParse({
        ...ad,
        approval: { approvedBy: "jzferrell26", approvedOn: "2026-10-13" },
      }).success,
    ).toBe(false);
    expect(WebinarAdSchema.safeParse({ ...ad, status: "active" }).success).toBe(false);
    expect(
      WebinarAdSchema.safeParse({ ...ad, headline: "<script>alert(1)</script>" }).success,
    ).toBe(false);
    for (const path of [
      "/webinar-ads/../private.png",
      "https://example.com/art.png",
      "/ads-library/real/v1/tall.png",
      WEBINAR_ADS[1]?.art.tall.path,
    ]) {
      expect(
        WebinarAdSchema.safeParse({ ...ad, art: { ...ad?.art, tall: { ...ad?.art.tall, path } } })
          .success,
      ).toBe(false);
    }
  });
  it("has thirty distinct bounded PNGs with exact dimensions, no metadata and matching digests", async () => {
    const root = await realpath(resolve("apps/web/public/webinar-ads"));
    const digests = new Set<string>();
    for (const ad of WEBINAR_ADS) {
      for (const shape of ["tall", "square"] as const) {
        const file = resolve("apps/web/public", `.${ad.art[shape].path}`);
        expect((await realpath(file)).startsWith(`${root}${sep}`)).toBe(true);
        const stat = await lstat(file);
        expect(stat.isFile() && !stat.isSymbolicLink()).toBe(true);
        const bytes = await readFile(file);
        expect(bytes.length).toBeLessThanOrEqual(1048576);
        const inspection = inspectAdsLibraryArt(bytes);
        expect(inspection.ok).toBe(true);
        if (!inspection.ok) throw new Error("Invalid PNG");
        expect(inspection.type).toBe("png");
        expect(inspection.width).toBe(1080);
        expect(inspection.height).toBe(shape === "tall" ? 1080 : 842);
        expect(inspection.metadata).toEqual([]);
        const digest = createHash("sha256").update(bytes).digest("hex");
        expect(digest).toBe(ad.art[shape].sha256);
        digests.add(digest);
      }
    }
    expect(digests.size).toBe(30);
  });
  it("is absent from launch catalog and refused by the actual approval rule", async () => {
    const library = await loadAdsLibrary({ environment: { OALO_ENVIRONMENT: "production" } });
    for (const ad of WEBINAR_ADS) {
      expect(AdsLibraryEntrySchema.safeParse(ad).success).toBe(false);
      expect(library.find(ad.id, ad.version)).toBeUndefined();
      expect(
        libraryAdRefusalFor(
          {
            id: ad.id,
            version: ad.version,
            tallSha256: ad.art.tall.sha256,
            squareSha256: ad.art.square.sha256,
          },
          library.standingOf(ad),
        ),
      ).toBe("missing");
    }
  });
  it("copies user words with honest review notes and only allows known webinar editor links", () => {
    const ad = WEBINAR_ADS[0];
    if (!ad) throw new Error("Missing creative");
    const copy = webinarReviewCopy(ad, "A personal plan", "Explore the process.", "on-demand");
    expect(copy).toContain("Headline: A personal plan");
    expect(copy).toContain("Webinar: On-demand");
    expect(copy).toContain("Pending owner and lender review");
    expect(copy).toContain("No webinar destination is bound");
    expect(webinarEditorHref("live-webinar")).toBe("/marketing/campaigns/funnels/live-webinar");
    expect(webinarEditorHref("on-demand")).toBe("/marketing/campaigns/funnels/on-demand");
  });
});
