import { describe, expect, it } from "vitest";

import { loadSyntheticUiFixture } from "../../ui-foundation/data/load-synthetic-ui.js";
import { getOverviewStatePresentation } from "../model/overview-state.js";

describe("Platform Overview edge states", () => {
  it("covers the complete required matrix without collapsing truth states", () => {
    const { stateMatrix } = loadSyntheticUiFixture().overview;

    expect(stateMatrix).toHaveLength(11);
    expect(new Set(stateMatrix)).toHaveProperty("size", 11);
    expect(stateMatrix.map((state) => getOverviewStatePresentation(state).title)).toEqual([
      "Loading verified workspace data",
      "New workspace",
      "Setup incomplete",
      "Workspace blocked",
      "Healthy without an active campaign",
      "Provider degraded",
      "Outcome data unavailable",
      "Protected metrics restricted",
      "Authorized agency context",
      "Safe retry available",
      "Safe retry available",
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
