import { rawSyntheticUiFixture } from "../../../fixtures/ui-foundation/synthetic-ui.js";
import {
  deepFreeze,
  parseSyntheticUiFixture,
  type DeepReadonly,
  type SyntheticUiFixture,
} from "../model/synthetic-ui.js";

let cachedFixture: DeepReadonly<SyntheticUiFixture> | undefined;

export function loadSyntheticUiFixture(): DeepReadonly<SyntheticUiFixture> {
  cachedFixture ??= parseSyntheticUiFixture(rawSyntheticUiFixture);

  const disclosures = [
    cachedFixture.session.safety.disclosure,
    cachedFixture.overview.safety.disclosure,
    cachedFixture.onboarding.safety.disclosure,
  ];

  if (new Set(disclosures).size !== 1) {
    throw new Error("Synthetic safety disclosures must remain identical across all projections.");
  }

  return cachedFixture;
}

export function createFrozenSyntheticFixture(input: unknown): DeepReadonly<SyntheticUiFixture> {
  return deepFreeze(parseSyntheticUiFixture(input));
}
