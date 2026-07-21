export const foundationPhase = "phase-0-evidence-harness" as const;

export type FoundationPhase = typeof foundationPhase;

export interface FoundationStatus {
  readonly phase: FoundationPhase;
  readonly productionTrafficEnabled: false;
}
