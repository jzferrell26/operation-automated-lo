import { describe, expect, it } from "vitest";

import { firstNameOf, initialsOf, nameWords } from "./display-name.js";

/** PRD-009 writing review pass 1, W-23: a title in the name must not become the greeting. */
describe("a display name without its leading title", () => {
  it("skips Mr, Mrs, Ms, Mx and Dr, with or without a period, in any case", () => {
    for (const title of [
      "Mr",
      "Mr.",
      "Mrs",
      "Mrs.",
      "Ms",
      "Ms.",
      "Mx",
      "Mx.",
      "Dr",
      "Dr.",
      "dr.",
    ]) {
      expect(nameWords(`${title} Alex Morgan`), title).toEqual(["Alex", "Morgan"]);
    }
  });

  it("takes the first word after the title as the first name", () => {
    expect(firstNameOf("Dr. Alex Morgan")).toBe("Alex");
    expect(firstNameOf("Ms. Dana Reyes")).toBe("Dana");
    expect(firstNameOf("Mx Jordan Lee")).toBe("Jordan");
  });

  it("takes the initials from the words after the title", () => {
    expect(initialsOf("Dr. Alex Morgan")).toBe("AM");
    expect(initialsOf("Alex Morgan")).toBe("AM");
    expect(initialsOf("Cher")).toBe("C");
  });

  it("leaves a name with no title exactly as it was", () => {
    expect(firstNameOf("Alex Morgan")).toBe("Alex");
    expect(firstNameOf("  Dana   Reyes  ")).toBe("Dana");
    expect(nameWords("Alex Morgan")).toEqual(["Alex", "Morgan"]);
  });

  it("does not mistake a name that starts like a title for one", () => {
    expect(firstNameOf("Drew Carter")).toBe("Drew");
    expect(firstNameOf("Mrsa Okafor")).toBe("Mrsa");
  });

  it("keeps a title that stands alone, because nothing follows it to use instead", () => {
    expect(firstNameOf("Dr.")).toBe("Dr.");
    expect(nameWords("Dr.")).toEqual(["Dr."]);
  });
});
