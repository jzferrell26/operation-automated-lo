import { describe, expect, it } from "vitest";

import { firstNameFrom } from "./home-view.js";

/** PRD-009b D1. "Welcome, Alex." names the person by the first word of the name they signed up with. */
describe("the name Home greets by", () => {
  it("is the first word of the display name", () => {
    expect(firstNameFrom("Alex Morgan")).toBe("Alex");
    expect(firstNameFrom("  Dana   Reyes  ")).toBe("Dana");
    expect(firstNameFrom("Cher")).toBe("Cher");
  });

  it("is nothing when there is no name, so the greeting is plain", () => {
    expect(firstNameFrom(undefined)).toBeUndefined();
    expect(firstNameFrom("")).toBeUndefined();
    expect(firstNameFrom("   ")).toBeUndefined();
  });

  it("is nothing for the stand-in the shell uses when it could not read a name", () => {
    // `SESSION_USER_FALLBACK` is "You", which would read "Welcome, You."
    expect(firstNameFrom("You")).toBeUndefined();
  });
});
