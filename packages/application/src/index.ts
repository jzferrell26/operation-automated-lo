import { contractVersion } from "@oalo/contracts";
import { foundationPhase, type FoundationStatus } from "@oalo/domain";

export interface FoundationSnapshot extends FoundationStatus {
  readonly contractVersion: typeof contractVersion;
}

export function getFoundationSnapshot(): FoundationSnapshot {
  return Object.freeze({
    phase: foundationPhase,
    productionTrafficEnabled: false,
    contractVersion,
  });
}
