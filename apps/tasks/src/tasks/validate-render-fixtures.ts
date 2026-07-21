import { task } from "@trigger.dev/sdk";

import { validateRenderFixturesCore } from "../core/validate-render-fixtures.js";

export const validateRenderFixtures = task({
  id: "phase0-validate-render-fixtures",
  maxDuration: 60,
  run: async (input: unknown) => validateRenderFixturesCore(input),
});
