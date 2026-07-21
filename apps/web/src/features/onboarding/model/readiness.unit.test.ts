import { describe, expect, it } from "vitest";

import { loadSyntheticUiFixture } from "../../ui-foundation/data/load-synthetic-ui.js";
import { onboardingSchema } from "../../ui-foundation/model/synthetic-ui.js";
import { canBrowserMarkOnboardingComplete, isLaunchReadinessLocked } from "./readiness.js";

describe("onboarding readiness projection", () => {
  it("keeps Launch Readiness locked until all five Get Connected outcomes are complete", () => {
    const { onboarding } = loadSyntheticUiFixture();
    expect(isLaunchReadinessLocked(onboarding)).toBe(true);

    const completed = onboardingSchema.parse({
      ...onboarding,
      getConnected: onboarding.getConnected.map((item) =>
        item.state === "complete"
          ? item
          : {
              id: item.id,
              title: item.title,
              description: item.description,
              freshness: "Verified now",
              state: "complete",
              completionHref: item.completionHref,
              evidence: {
                summary: "Synthetic unit evidence",
                verifiedAt: "2026-07-21T15:00:00.000Z",
                verifierVersion: "synthetic-verifier-test",
              },
            },
      ),
    });

    expect(isLaunchReadinessLocked(completed)).toBe(false);
  });

  it("uses exactly five plus four ordered outcomes and exposes all five item states", () => {
    const { onboarding } = loadSyntheticUiFixture();
    const states = new Set([
      ...onboarding.getConnected.map((item) => item.state),
      ...onboarding.launchReadiness.map((item) => item.state),
    ]);

    expect(onboarding.getConnected).toHaveLength(5);
    expect(onboarding.launchReadiness).toHaveLength(4);
    expect([...states].sort()).toEqual(
      ["blocked", "complete", "in_progress", "not_started", "stale"].sort(),
    );
    expect(onboarding.launchReadiness.at(-1)?.title).toBe("Launch Ready");
  });

  it("provides no browser completion authority", () => {
    expect(canBrowserMarkOnboardingComplete()).toBe(false);
  });
});
