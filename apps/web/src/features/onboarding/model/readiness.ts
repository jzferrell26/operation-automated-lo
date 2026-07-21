import type { DeepReadonly, Onboarding } from "../../ui-foundation/model/synthetic-ui.js";

export function isLaunchReadinessLocked(onboarding: DeepReadonly<Onboarding>): boolean {
  return !onboarding.getConnected.every((item) => item.state === "complete");
}

export function canBrowserMarkOnboardingComplete(): false {
  return false;
}
