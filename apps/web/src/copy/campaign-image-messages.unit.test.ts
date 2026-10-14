import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative, resolve } from "node:path";

import { describe, expect, it } from "vitest";
import { WebinarAdCampaignManifestSchema } from "@oalo/contracts";
import { webinarReviewFixture } from "../features/webinar-ads/review.test-support.js";

import { NO_PROPERTY_PHOTO_ATTACHED } from "./campaign-image-messages.js";
import { findVocabularyHits } from "./forbidden-vocabulary.js";

/**
 * PRD-008b 008B-AC-003, the half that holds for screens that do not exist yet.
 *
 * A search on 2026-10-01 found no signed-in screen that summarises the images on a campaign
 * version: the campaign detail, the create result, the campaign list, and the creative library all
 * leave images out. This keeps it that way, or makes the next screen honest. A source file under
 * the signed-in screens that reads a version's images has to take its wording from
 * `campaign-image-messages.ts`, where the empty-list sentence lives, so a screen cannot summarise
 * images and say nothing when there are none.
 */

const repositoryRoot = resolve(import.meta.dirname, "../../../..");

const SCREEN_ROOTS: readonly string[] = ["apps/web/src/features", "apps/web/src/app"];

/** Directories the signed-in screens never render, each with its reason. */
const SKIPPED_PREFIXES: readonly Readonly<{ path: string; because: string }>[] = [
  {
    path: "apps/web/src/features/dashboard-preview",
    because: "The local demo, which only synthetic mode renders.",
  },
  {
    path: "apps/web/src/fixtures",
    because: "Synthetic demo data, which is where the placeholder asset is allowed to live.",
  },
  {
    path: "apps/web/src/features/ads-library/server",
    because:
      "PRD-009c server code. It reads an ads library entry's art files and builds a version's two library images; it renders no screen and summarises no images. A screen that shows them lives outside this folder and is still guarded.",
  },
];

const READS_A_VERSIONS_IMAGES = /\.images\b|\bimageCount\b|\bpropertyImage\w*|\bimages\s*[:=[]/u;
const IMPORTS_THE_SENTENCE = /campaign-image-messages\.js/u;

const WEBINAR_REVIEW = "apps/web/src/features/webinar-ads/review.tsx";
const WEBINAR_FIXTURE = "apps/web/src/features/webinar-ads/review.test-support.ts";

function possiblePropertyImageReads(file: string, source: string): string {
  // CSS class selection is not a version's image data, on any screen.
  let text = source.replace(/(?<![\w.])styles\.images\b/gu, "styles.pictureLayout");
  // CTR-002's webinar variant requires exactly tall + square. Remove only this typed consumer's
  // map expression. Any other image read in the same source, including legacy campaign data,
  // remains guarded. The schema and mixed-consumer plants below make this distinction falsifiable.
  if (
    file === WEBINAR_REVIEW &&
    /\bpage:\s*WebinarAdCampaignPage\b/u.test(text) &&
    /const\s*\{\s*review\s*\}\s*=\s*page/u.test(text) &&
    /const\s*\{\s*manifest\s*\}\s*=\s*review/u.test(text)
  ) {
    text = text.replace(/(?<![\w.])manifest\.images\.map\b/gu, "webinarPictures.map");
  }
  // This one helper constructs a schema-parsed webinar DTO; it renders no image summary.
  // Remove only its first literal image field, not any later read or additional image field.
  if (
    file === WEBINAR_FIXTURE &&
    /function\s+webinarReviewFixture\(\):\s*WebinarAdCampaignPage/u.test(text) &&
    /const\s+manifest\s*=\s*WebinarAdCampaignManifestSchema\.parse\(/u.test(text)
  ) {
    text = text.replace(/\bimages(?=\s*:\s*\[)/u, "webinarPictures");
  }
  return text;
}

/** The files that read images and never import the sentence. Pure, so it can be tried on a plant. */
function imageSummariesWithoutTheSentence(
  sources: Readonly<Record<string, string>>,
): readonly string[] {
  return Object.entries(sources)
    .filter(
      ([file, text]) =>
        READS_A_VERSIONS_IMAGES.test(possiblePropertyImageReads(file, text)) &&
        !IMPORTS_THE_SENTENCE.test(text),
    )
    .map(([file]) => file)
    .sort();
}

async function collectScreenSources(): Promise<Readonly<Record<string, string>>> {
  const sources: Record<string, string> = {};
  for (const root of SCREEN_ROOTS) {
    const entries = await readdir(join(repositoryRoot, root), {
      withFileTypes: true,
      recursive: true,
    });
    for (const entry of entries) {
      if (!entry.isFile() || ![".ts", ".tsx"].includes(extname(entry.name))) continue;
      if (/\.(?:test|spec)\.[cm]?[jt]sx?$/u.test(entry.name)) continue;
      const full = join(entry.parentPath, entry.name);
      const path = relative(repositoryRoot, full).replaceAll("\\", "/");
      if (SKIPPED_PREFIXES.some((skipped) => path.startsWith(`${skipped.path}/`))) continue;
      sources[path] = await readFile(full, "utf8");
    }
  }
  return sources;
}

describe("signed-in screens that read the images on a campaign version", () => {
  it("take the empty-list sentence from the image messages module", async () => {
    const sources = await collectScreenSources();

    expect(Object.keys(sources).length).toBeGreaterThan(100);
    expect(imageSummariesWithoutTheSentence(sources)).toEqual([]);
  });

  /** A guard that cannot fail is not a guard: plant one screen that reads images and says nothing. */
  it("reports a screen that reads images without the sentence, and spares one that has it", () => {
    expect(
      imageSummariesWithoutTheSentence({
        "apps/web/src/features/campaigns/components/silent.tsx":
          "export const n = (campaign) => campaign.manifest.images.length;",
        "apps/web/src/features/campaigns/components/honest.tsx":
          'import { NO_PROPERTY_PHOTO_ATTACHED } from "../../../copy/campaign-image-messages.js";\n' +
          "export const n = (campaign) => campaign.manifest.images.length || NO_PROPERTY_PHOTO_ATTACHED;",
        "apps/web/src/features/campaigns/components/unrelated.tsx":
          "export const n = () => 'a screen that never mentions the subject';",
      }),
    ).toEqual(["apps/web/src/features/campaigns/components/silent.tsx"]);
  });

  it("recognizes only the strict webinar tuple and still rejects legacy reads in that same file", async () => {
    const review = await readFile(join(repositoryRoot, WEBINAR_REVIEW), "utf8");
    const fixture = await readFile(join(repositoryRoot, WEBINAR_FIXTURE), "utf8");
    expect(
      imageSummariesWithoutTheSentence({ [WEBINAR_REVIEW]: review, [WEBINAR_FIXTURE]: fixture }),
    ).toEqual([]);
    for (const legacyRead of [
      "campaign.manifest.images.length",
      "manifest.images.length",
      "imageCount",
      "propertyImages.length",
    ]) {
      expect(
        imageSummariesWithoutTheSentence({
          [WEBINAR_REVIEW]: `${review}\nconst silent = ${legacyRead};`,
        }),
      ).toEqual([WEBINAR_REVIEW]);
    }
    expect(
      imageSummariesWithoutTheSentence({
        [WEBINAR_FIXTURE]: `${fixture}\nconst silent = campaign.manifest.images.length;`,
      }),
    ).toEqual([WEBINAR_FIXTURE]);
    expect(
      imageSummariesWithoutTheSentence({
        [WEBINAR_REVIEW]: review.replace("page: WebinarAdCampaignPage", "page: LegacyCampaignPage"),
      }),
    ).toEqual([WEBINAR_REVIEW]);
    expect(imageSummariesWithoutTheSentence({ "other.tsx": review })).toEqual(["other.tsx"]);
    expect(
      imageSummariesWithoutTheSentence({ "layout.tsx": "const layout = styles.images;" }),
    ).toEqual([]);
  });

  it("rejects empty or malformed webinar pictures instead of requiring a property-photo fallback", () => {
    const manifest = webinarReviewFixture().review.manifest;
    expect(manifest.images.map((image) => image.shape)).toEqual(["tall", "square"]);
    const [tall, square] = manifest.images;
    for (const images of [
      [],
      [tall],
      [tall, square, square],
      [square, tall],
      [tall, { ...square, shape: "unknown" }],
    ]) {
      expect(WebinarAdCampaignManifestSchema.safeParse({ ...manifest, images }).success).toBe(
        false,
      );
    }
  });
});

describe("the sentence a screen says when a version holds no image", () => {
  it("says that no property photo is attached yet, in the user's language", () => {
    expect(NO_PROPERTY_PHOTO_ATTACHED).toBe("No property photo is attached yet.");
    expect(findVocabularyHits(NO_PROPERTY_PHOTO_ATTACHED)).toEqual([]);
  });
});
