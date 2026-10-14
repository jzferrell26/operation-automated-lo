import type { HomeWorkspace } from "@oalo/contracts";

export function freshHomeLookupAvailable(workspace: HomeWorkspace): boolean {
  return (
    workspace.mode === "demo" ||
    (workspace.canWrite &&
      workspace.readiness.storage === "ready" &&
      workspace.readiness.writeAccess === "allowed" &&
      workspace.readiness.freshLookup === "ready")
  );
}

/** A budget refusal blocks fresh requests, not a create command that may reuse a cached value. */
export function createHomeReportAvailable(workspace: HomeWorkspace): boolean {
  return (
    workspace.mode === "demo" ||
    (workspace.canWrite &&
      workspace.valuationConnected &&
      workspace.readiness.storage === "ready" &&
      workspace.readiness.writeAccess === "allowed")
  );
}

export function homeReadinessNotice(
  workspace: HomeWorkspace,
): { title: string; body: string } | null {
  if (workspace.mode === "demo") return null;
  const state = workspace.readiness;
  if (state.storage === "unknown")
    return {
      title: "Report availability could not be checked",
      body: "Check again before making changes. Any reports already open remain available to read and download. Contact support if this continues.",
    };
  if (state.storage === "unavailable")
    return {
      title: "Set up homeowner reports",
      body: "Homeowner reports are unavailable for your account. Contact support to finish report setup, then check again. HighLevel is optional for property valuations.",
    };
  if (!workspace.canWrite || state.writeAccess === "read_only")
    return {
      title: "Report changes are unavailable for your account",
      body: "You can open saved reports and download their PDFs. Check report availability again before making changes. Contact support if this continues.",
    };
  if (state.valuation === "setup_unavailable")
    return {
      title: "Valuations are unavailable for your account",
      body: "Contact support to finish valuation setup, then check again. Saved reports and PDF downloads remain available. Sharing still checks the saved report's source dates.",
    };
  if (state.freshLookup === "zero_allowance")
    return {
      title: "New valuations need a lookup allowance",
      body: "Contact support to arrange a valuation allowance for your account. You can update saved loan details or create a report if a recent value for that address can be reused. No fresh lookup can run yet.",
    };
  if (state.freshLookup === "allowance_exhausted")
    return {
      title: "This month's valuation allowance is used",
      body: "New valuations can resume next month if your account allowance permits them. You can update saved loan details or create a report if a recent value for that address can be reused. Contact support if you need more lookups.",
    };
  if (
    state.writeAccess === "unknown" ||
    state.valuation === "unknown" ||
    state.freshLookup === "unknown"
  )
    return {
      title: "Report availability needs checking",
      body: "Check again before requesting a valuation or changing an update schedule. Saved reports remain available to read and download. Contact support if this continues.",
    };
  return null;
}
