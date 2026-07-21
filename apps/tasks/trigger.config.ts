import { defineConfig } from "@trigger.dev/sdk";
import { productionTriggerProjectReference } from "@oalo/config";

const triggerProjectRef = productionTriggerProjectReference(process.env);

export default defineConfig({
  project: triggerProjectRef,
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
