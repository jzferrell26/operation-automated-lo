import { describe, expect, it } from "vitest";

import { homeRunDates } from "./home-messages.js";

/**
 * Writing review pass 2, W-33. Home says when a campaign is set to run in the same words the rest of
 * the product uses for that fact: "Set to run", never "Runs", for an ad that nothing can run.
 */
describe("the run dates Home writes for a campaign", () => {
  it("says an ad is set to run between two days", () => {
    expect(homeRunDates("2026-10-06T09:00:00.000Z", "2026-10-20T23:59:59.000Z")).toBe(
      "Set to run Oct 6, 2026 to Oct 20, 2026",
    );
  });

  it("says an ad that starts when it is launched starts when it is launched", () => {
    expect(homeRunDates(undefined, "2026-10-20T23:59:59.000Z")).toBe(
      "Starts when you launch it, ends Oct 20, 2026",
    );
  });

  it("says when only the start is known, and nothing when neither is", () => {
    expect(homeRunDates("2026-10-06T09:00:00.000Z", undefined)).toBe("Starts Oct 6, 2026");
    expect(homeRunDates(undefined, undefined)).toBe("");
  });

  it("never says an ad runs", () => {
    for (const text of [
      homeRunDates("2026-10-06T09:00:00.000Z", "2026-10-20T23:59:59.000Z"),
      homeRunDates(undefined, "2026-10-20T23:59:59.000Z"),
    ]) {
      expect(text).not.toMatch(/^Runs\b/u);
    }
  });
});
