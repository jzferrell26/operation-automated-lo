export const commandStatuses = [
  "accepted",
  "committed",
  "dispatched",
  "completed",
  "failed",
  "uncertain",
  "canceled",
] as const;

export type CommandStatus = (typeof commandStatuses)[number];

export const providerFailureClasses = [
  "AUTH_REFRESHABLE",
  "AUTH_RECONNECT_REQUIRED",
  "RATE_LIMITED",
  "TRANSIENT_PROVIDER",
  "VALIDATION_TERMINAL",
  "POLICY_TERMINAL",
  "UNCERTAIN_WRITE",
  "PRODUCT_CONFLICT",
  "DEPENDENCY_BLOCKED",
] as const;

export type ProviderFailureClass = (typeof providerFailureClasses)[number];

export type ProviderWriteResult =
  | Readonly<{ kind: "confirmed"; normalizedResultRef: string }>
  | Readonly<{ kind: "uncertain"; failureClass: "UNCERTAIN_WRITE" }>
  | Readonly<{ kind: "failed"; failureClass: ProviderFailureClass }>;

export type ReconciliationResult =
  | Readonly<{ kind: "confirmed"; normalizedResultRef: string }>
  | Readonly<{ kind: "absent" }>
  | Readonly<{ kind: "unresolved" }>;

export function isRetryableProviderFailure(failureClass: ProviderFailureClass): boolean {
  return (
    failureClass === "AUTH_REFRESHABLE" ||
    failureClass === "RATE_LIMITED" ||
    failureClass === "TRANSIENT_PROVIDER"
  );
}

export function requiresReconciliation(failureClass: ProviderFailureClass): boolean {
  return failureClass === "UNCERTAIN_WRITE";
}
