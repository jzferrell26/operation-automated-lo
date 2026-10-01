import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative, resolve } from "node:path";

import { describe, expect, it } from "vitest";

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

const repositoryRoot = resolve(import.meta.dirname, "../../../../../..");

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
];

const READS_A_VERSIONS_IMAGES = /\.images\b|\bimageCount\b|\bpropertyImage\w*|\bimages\s*[:=[]/u;
const IMPORTS_THE_SENTENCE = /campaign-image-messages\.js/u;

/** The files that read images and never import the sentence. Pure, so it can be tried on a plant. */
function imageSummariesWithoutTheSentence(
  sources: Readonly<Record<string, string>>,
): readonly string[] {
  return Object.entries(sources)
    .filter(([, text]) => READS_A_VERSIONS_IMAGES.test(text) && !IMPORTS_THE_SENTENCE.test(text))
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
});

/**
 * Finding P1 of the 2026-10-01 writing review, the half that holds for screens that do not exist
 * yet.
 *
 * The rule above makes a screen say something when there is no image. It lets a screen take the
 * count sentences straight from the messages module and hand them a number, and a number cannot
 * say whether the images are photos: the only image a saved version can hold today is the picture
 * the system stamped on it before 008b, which is not a photo of the property. So the two count
 * sentences belong to the summary component alone, which looks at each image and decides. Every
 * other screen shows images through that component.
 */

const SUMMARY_COMPONENT = "apps/web/src/features/campaigns/components/property-photo-summary.tsx";
const COUNTS_IMAGES_ITSELF = /\bpropertyPhotoCountSentence\b|\bplaceholderPictureSentence\b/u;

/** The files other than the summary that write a count of images in words. Pure, so it can be tried on a plant. */
function filesCountingImagesThemselves(
  sources: Readonly<Record<string, string>>,
): readonly string[] {
  return Object.entries(sources)
    .filter(([file, text]) => file !== SUMMARY_COMPONENT && COUNTS_IMAGES_ITSELF.test(text))
    .map(([file]) => file)
    .sort();
}

describe("the sentences that count a version's images", () => {
  it("are used by the property photo summary and by no screen of its own", async () => {
    const sources = await collectScreenSources();

    expect(Object.keys(sources)).toContain(SUMMARY_COMPONENT);
    expect(filesCountingImagesThemselves(sources)).toEqual([]);
  });

  /** A guard that cannot fail is not a guard: plant a screen that counts, and two that do not. */
  it("reports a screen that counts images in words, and spares the summary and its users", () => {
    expect(
      filesCountingImagesThemselves({
        "apps/web/src/features/campaigns/components/counting.tsx":
          'import { propertyPhotoCountSentence } from "../../../copy/campaign-image-messages.js";\n' +
          "export const n = (campaign) => propertyPhotoCountSentence(campaign.manifest.images.length);",
        [SUMMARY_COMPONENT]:
          "export const s = (c) => propertyPhotoCountSentence(c) + placeholderPictureSentence(c);",
        "apps/web/src/features/campaigns/components/delegating.tsx":
          'import { PropertyPhotoSummary } from "./property-photo-summary.js";\n' +
          "export const n = (campaign) => <PropertyPhotoSummary images={campaign.manifest.images} />;",
      }),
    ).toEqual(["apps/web/src/features/campaigns/components/counting.tsx"]);
  });
});
