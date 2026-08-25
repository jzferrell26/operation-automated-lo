import { contractVersion } from "@oalo/contracts";

export * from "./evidence.js";
export * from "./fixture-resilience.js";
export * from "./g2-matrix.js";
export * from "./lead-routing.js";
export * from "./leadconnector-v2-http-transport.js";
export * from "./live-capture.js";
export * from "./live-oauth-disabled.js";
export * from "./meta-adapter.js";
export * from "./production-meta-read-transport.js";
export * from "./sanitization.js";
export * from "./signed-context.js";

export const highLevelPackage = Object.freeze({
  contractVersion,
  implementation: "fixture-contracts-and-production-http-transport",
});
