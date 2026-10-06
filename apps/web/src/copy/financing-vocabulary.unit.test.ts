import { describe, expect, it } from "vitest";
import { findVocabularyHits, forbiddenTermPattern } from "./forbidden-vocabulary.js";

describe("the mortgage principal-and-interest label is not an authentication identity", () => {
  it("allows the specific ordinary financial phrase in headings and explanatory copy", () => {
    expect(findVocabularyHits("Principal and interest")).toEqual([]);
    expect(
      findVocabularyHits("Monthly principal and interest is part of the housing cost."),
    ).toEqual([]);
  });
  it.each([
    "Your principal is not signed in",
    "Principal and permissions",
    "principals",
    "principal-bound access",
    "Principal and interest for the principal",
  ])("still rejects internal access wording: %s", (value) => {
    expect(forbiddenTermPattern("principal").test(value)).toBe(true);
  });
});
