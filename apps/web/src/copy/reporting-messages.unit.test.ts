import { REPORTING_METRIC_KEYS } from "@oalo/application";
import { CampaignReportingRecordSchema, ReportingExceptionSchema } from "@oalo/contracts";
import { describe, expect, it } from "vitest";

import { findVocabularyHits } from "./forbidden-vocabulary.js";
import {
  REPORTING_EXCEPTION_EXPLANATIONS,
  REPORTING_METRIC_DEFINITIONS,
} from "./reporting-messages.js";

/**
 * PRD-008c 008C-AC-005, the half a source scan cannot prove.
 *
 * The forbidden-vocabulary guard reads `reporting-messages.ts` like any other copy file and would
 * catch a banned word in a sentence that is written there. What it cannot catch is a sentence that
 * is missing: a reporting exception code with no entry is not a forbidden string, it is an empty
 * one. `reporting.ts` in the application layer now returns the code and no English, so these cases
 * pin that every code and every figure it can name has words, and that none of the words is one the
 * contract bans.
 */

describe("the reporting exception sentences", () => {
  it("names every code the shared contract allows, and no other", () => {
    expect(Object.keys(REPORTING_EXCEPTION_EXPLANATIONS).toSorted()).toEqual(
      [...ReportingExceptionSchema.shape.code.options].toSorted(),
    );
  });

  it("reads in the contract's voice and fits where an explanation is stored", () => {
    for (const [code, sentence] of Object.entries(REPORTING_EXCEPTION_EXPLANATIONS)) {
      expect(findVocabularyHits(sentence), `${code} reads "${sentence}"`).toEqual([]);
      expect(sentence, code).not.toContain("_");
      expect(sentence, code).toMatch(/\.$/u);
      expect(ReportingExceptionSchema.shape.explanation.safeParse(sentence).success, code).toBe(
        true,
      );
    }
  });

  it("tells the person what to do, not only what went wrong", () => {
    for (const [code, sentence] of Object.entries(REPORTING_EXCEPTION_EXPLANATIONS)) {
      expect(sentence.split(/(?<=\.)\s+/u).length, code).toBeGreaterThanOrEqual(2);
    }
  });
});

describe("the reporting figure definitions", () => {
  it("names every figure a campaign's reporting record carries, in the order a screen lists them", () => {
    expect(Object.keys(CampaignReportingRecordSchema.shape.metrics.shape)).toEqual([
      ...REPORTING_METRIC_KEYS,
    ]);
    expect(Object.keys(REPORTING_METRIC_DEFINITIONS)).toEqual([...REPORTING_METRIC_KEYS]);
  });

  it("carries no forbidden word and no stored token", () => {
    for (const [key, definition] of Object.entries(REPORTING_METRIC_DEFINITIONS)) {
      expect(findVocabularyHits(definition), `${key} reads "${definition}"`).toEqual([]);
      expect(definition, key).not.toContain("_");
    }
  });
});
