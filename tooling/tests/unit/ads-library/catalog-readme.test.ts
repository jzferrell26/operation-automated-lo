import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { AdsLibraryEntrySchema, adsLibraryCatalogSchema } from "@oalo/contracts";

/**
 * PRD-009c D7, 009C-AC-014 (record check). The catalog README says how an ad is added, versioned,
 * and retired, and states the facts that make the owner's merge the approval record. The template
 * entry stays a valid real entry, so copying it never starts from something the schema refuses.
 */

const catalogFolder = resolve(
  import.meta.dirname,
  "../../../../apps/web/src/features/ads-library/catalog",
);

async function readme(): Promise<string> {
  return readFile(join(catalogFolder, "README.md"), "utf8");
}

describe("the ads library catalog README and template (009C-AC-014)", () => {
  it("states the approval record, the review setting, the intake channel, and the public-repository rule", async () => {
    const text = await readme();
    for (const statement of [
      "The owner's own merge is the approval record.",
      "requires 0 approving reviews",
      "in a session or a private channel, never through a public issue",
      "no text from an outside account ever supplies an `approval` block",
      "No lender name and no lender policy text",
      "An existing `(id, version)` is never edited",
      "needs lender review before the owner merges it",
      "compliance-and-risk.md:74",
      "catalog-lock.mjs",
      "1080 by 1080",
      "1080 by 842",
    ]) {
      expect(text, statement).toContain(statement);
    }
    // MTK-007: no en dash (U+2013) and no em dash (U+2014) in prose.
    expect(text).not.toMatch(new RegExp(`[${String.fromCodePoint(0x2013, 0x2014)}]`, "u"));
  });

  it("keeps the template a valid real entry that the real catalog would accept", async () => {
    const template: unknown = JSON.parse(
      await readFile(join(catalogFolder, "catalog.template.json"), "utf8"),
    );
    const entry = AdsLibraryEntrySchema.parse(template);
    expect(entry.sample).toBe(false);
    expect(adsLibraryCatalogSchema("real").safeParse([template]).success).toBe(true);
  });
});
