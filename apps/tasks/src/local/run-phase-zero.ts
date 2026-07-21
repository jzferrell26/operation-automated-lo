import { z } from "zod";

import { validateRenderFixturesCore } from "../core/validate-render-fixtures.js";

const LocalRunnerArgumentsSchema = z.array(z.string()).length(0);

const localFixtureRequest = Object.freeze({
  schemaVersion: 1,
  fixtureSet: "rendering-v1",
});

LocalRunnerArgumentsSchema.parse(process.argv.slice(2));

const result = validateRenderFixturesCore(localFixtureRequest);

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
