import { defineConfig } from "@trigger.dev/sdk";
import { parsePhaseZeroEnvironment } from "@oalo/config";

const environment = parsePhaseZeroEnvironment(process.env);

export default defineConfig({
  project: environment.TRIGGER_PROJECT_REF,
  dirs: ["./src/tasks"],
  maxDuration: 60,
  runtime: "node-22",
  retries: {
    enabledInDev: false,
    default: {
      maxAttempts: 1,
      minTimeoutInMs: 1_000,
      maxTimeoutInMs: 1_000,
      factor: 1,
      randomize: false,
    },
  },
});
