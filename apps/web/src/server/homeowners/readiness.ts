import { UNKNOWN_HOME_READINESS, type HomeReadiness } from "@oalo/contracts";

export function homeReadinessRefusal(code?: string): HomeReadiness {
  return {
    ...UNKNOWN_HOME_READINESS,
    // Reports being switched off makes the report surface unavailable. It does not establish
    // whether a database exists, or whether its migrations have been applied.
    storage: code === "REPORTS_NOT_CONFIGURED" ? "unavailable" : "unknown",
  };
}

/** Derived after authenticated storage reads succeed. No setting names or identifiers leave here. */
export function homeReadiness(
  canWrite: boolean,
  valuationConnected: boolean,
  monthlyLimit: number,
  lookupsUsed: number,
): HomeReadiness {
  return {
    storage: "ready",
    writeAccess: canWrite ? "allowed" : "read_only",
    valuation: valuationConnected ? "ready" : "setup_unavailable",
    freshLookup: !valuationConnected
      ? "setup_unavailable"
      : monthlyLimit === 0
        ? "zero_allowance"
        : lookupsUsed >= monthlyLimit
          ? "allowance_exhausted"
          : "ready",
  };
}
