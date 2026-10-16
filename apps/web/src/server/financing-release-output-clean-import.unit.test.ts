import { access, copyFile, mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { canonicalCampaignHash, calculateFinancingComparison } from "@oalo/application";
import {
  FinancingCampaignManifestSchema,
  FinancingReleaseResolvedSourceSchema,
} from "@oalo/contracts";
import { findVocabularyHits } from "../copy/forbidden-vocabulary.js";
import {
  isMappedErrorCode,
  UNKNOWN_ERROR_MESSAGE,
  userMessageForCode,
  userMessageSentence,
} from "../features/http/user-messages.js";

const resultSchema = z.object({
  source: FinancingReleaseResolvedSourceSchema,
  manifestHash: z.string(),
  evidenceHash: z.string(),
});

describe("public financing fixture in a source-only checkout", () => {
  it("imports an isolated source copy without dist and invokes the real calculator and canonical hash", async () => {
    const root = await mkdtemp(join(tmpdir(), "oalo-financing-clean-import-"));
    try {
      const outputPath = join(root, "apps/web/src/server/financing-release-output-fixture.js");
      const sourcePath = join(root, "packages/db/test/financing-release-fixture.mjs");
      for (const [origin, destination] of [
        [resolve("apps/web/src/server/financing-release-output-fixture.js"), outputPath],
        [resolve("packages/db/test/financing-release-fixture.mjs"), sourcePath],
      ] as const) {
        await mkdir(dirname(destination), { recursive: true });
        await copyFile(origin, destination);
      }
      await expect(access(join(root, "packages/application/dist/index.js"))).rejects.toThrow();
      const loaded: unknown = await import(pathToFileURL(outputPath).href);
      if (
        typeof loaded !== "object" ||
        loaded === null ||
        !("outputFixture" in loaded) ||
        typeof loaded.outputFixture !== "function" ||
        !("longOutputFixture" in loaded) ||
        typeof loaded.longOutputFixture !== "function"
      )
        throw new Error("Fixture exports are missing");
      for (const [value, count] of [
        [loaded.outputFixture(3), 3],
        [loaded.longOutputFixture(), 5],
      ] as const) {
        const parsed = resultSchema.parse(value);
        const manifest = FinancingCampaignManifestSchema.parse(
          parsed.source.sourceVersion.manifest,
        );
        expect(manifest.financing.scenarios).toHaveLength(count);
        expect(manifest.calculated).toEqual(calculateFinancingComparison(manifest.financing));
        expect(manifest.calculated.scenarios[0]!.baseLoanMinor).toBe(32000000);
        expect(parsed.manifestHash).toBe(canonicalCampaignHash(manifest));
        expect(parsed.evidenceHash).toBe(canonicalCampaignHash(parsed.source.authority));
      }
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
  it("gives missing or changed report details a safe next step without an internal reference", () => {
    expect(isMappedErrorCode("INVALID")).toBe(true);
    const message = userMessageForCode("INVALID");
    expect(message).not.toBe(UNKNOWN_ERROR_MESSAGE);
    expect(message.what).toBe("Some report details are missing or have changed.");
    expect(message.whatToDo).toBe("Open the saved report, check its details and try again.");
    expect(findVocabularyHits(userMessageSentence("INVALID"))).toEqual([]);
  });
});
