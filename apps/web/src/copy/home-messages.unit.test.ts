import { describe, expect, it } from "vitest";

import { homeRunDates, homeRunDays } from "./home-messages.js";

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

/**
 * Every date on screen is a `time` element (PRD-008d, 009a), and the review browser suite reads any
 * visible date written without tabular figures as a defect. The days a row's sentence holds come
 * back in the order the sentence writes them, each with its machine value, and each one a string the
 * sentence really contains, so it can be drawn as a `time` element without changing a word.
 */
describe("the days a Home row draws as time elements", () => {
  it("names each day in the order the sentence writes it, with its machine value", () => {
    expect(homeRunDays("2026-10-06T09:00:00.000Z", "2026-10-20T23:59:59.000Z")).toEqual([
      { dateTime: "2026-10-06", text: "Oct 6, 2026" },
      { dateTime: "2026-10-20", text: "Oct 20, 2026" },
    ]);
    expect(homeRunDays(undefined, "2026-10-20T23:59:59.000Z")).toEqual([
      { dateTime: "2026-10-20", text: "Oct 20, 2026" },
    ]);
    expect(homeRunDays(undefined, undefined)).toEqual([]);
  });

  it("only names days the sentence holds", () => {
    for (const [startsAt, endsAt] of [
      ["2026-10-06T09:00:00.000Z", "2026-10-20T23:59:59.000Z"],
      [undefined, "2026-10-20T23:59:59.000Z"],
      ["2026-10-06T09:00:00.000Z", undefined],
    ] as const) {
      const sentence = homeRunDates(startsAt, endsAt);
      for (const day of homeRunDays(startsAt, endsAt)) expect(sentence).toContain(day.text);
    }
  });
});
