import { describe, expect, it } from "vitest";

import { loadSyntheticUiFixture } from "../../ui-foundation/data/load-synthetic-ui.js";
import { getOverviewStatePresentation } from "../model/overview-state.js";

describe("Platform Overview edge states", () => {
  it("covers the complete required matrix without collapsing truth states", () => {
    const { stateMatrix } = loadSyntheticUiFixture().overview;

    expect(stateMatrix).toHaveLength(11);
    expect(new Set(stateMatrix)).toHaveProperty("size", 11);
    expect(stateMatrix.map((state) => getOverviewStatePresentation(state).title)).toEqual([
      "Loading your workspace",
      "A fresh start",
      "Setup isn't finished",
      "Something is blocking you",
      "All set, no campaigns yet",
      "HighLevel is having trouble",
      "We can't show this number",
      "These numbers are hidden from you",
      "Agency view",
      "You can try again",
      "You can try again",
    ]);
  });

  it("contains every metric provenance state and allows zero only from an explicit source", () => {
    const { metrics } = loadSyntheticUiFixture().overview;
    expect(new Set(metrics.map((metric) => metric.state))).toEqual(
      new Set(["current", "stale", "unavailable", "partial", "uncertain", "permission_restricted"]),
    );

    const zeroMetric = metrics.find((metric) => "value" in metric && metric.value === 0);
    expect(zeroMetric?.source).toContain("explicitly reported zero");
  });
});
