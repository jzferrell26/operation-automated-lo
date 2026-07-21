import { contractVersion } from "@oalo/contracts";

export * from "./evidence.js";
export * from "./live-capture.js";
export * from "./sanitization.js";
export * from "./signed-context.js";

export const highLevelPackage = Object.freeze({
  contractVersion,
  implementation: "fixture-contracts-only",
});
