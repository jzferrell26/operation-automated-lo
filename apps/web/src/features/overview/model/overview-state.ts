import type { OverviewStateKind } from "../../ui-foundation/model/synthetic-ui.js";

export type OverviewStatePresentation = Readonly<{
  kind: "loading" | "empty" | "error" | "permission_restricted" | "degraded";
  title: string;
  description: string;
}>;

export function getOverviewStatePresentation(state: OverviewStateKind): OverviewStatePresentation {
  switch (state) {
    case "loading":
      return {
        kind: "loading",
        title: "Loading verified workspace data",
        description: "Labels and source context remain visible while the safe read completes.",
      };
    case "new_workspace":
      return {
        kind: "empty",
        title: "New workspace",
        description:
          "No business activity exists yet. Authorized setup remains the next safe action.",
      };
    case "setup_incomplete":
      return {
        kind: "empty",
        title: "Setup incomplete",
        description: "Get Connected must finish before launch readiness can begin.",
      };
    case "blocked":
      return {
        kind: "error",
        title: "Workspace blocked",
        description:
          "A required routing prerequisite is missing and the responsible party is identified.",
      };
    case "healthy_without_campaign":
      return {
        kind: "empty",
        title: "Healthy without an active campaign",
        description:
          "The workspace remains useful and reports an authoritative campaign count of zero.",
      };
    case "provider_degraded":
      return {
        kind: "degraded",
        title: "Provider degraded",
        description:
          "The last safe state remains visible while read-back reconciles the provider result.",
      };
    case "unavailable_data":
      return {
        kind: "empty",
        title: "Outcome data unavailable",
        description: "No numeric substitute is shown because there is no authoritative source.",
      };
    case "restricted_viewer":
      return {
        kind: "permission_restricted",
        title: "Protected metrics restricted",
        description: "No protected values or cross-tenant placeholders are rendered.",
      };
    case "authorized_agency":
      return {
        kind: "empty",
        title: "Authorized agency context",
        description:
          "Only installed locations from validated session authority can be made available.",
      };
    case "route_error":
    case "safe_retry":
      return {
        kind: "error",
        title: "Safe retry available",
        description: "Only the idempotent synthetic read can be retried.",
      };
  }
}
