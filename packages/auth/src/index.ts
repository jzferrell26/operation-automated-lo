import { contractVersion } from "@oalo/contracts";

export * from "./session-policy.js";

export const authPackage = Object.freeze({
  contractVersion,
  implementation: "phase-0-shell",
});
