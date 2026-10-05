import type { PropertyPackageSummary } from "@oalo/contracts";

/** An explicit reload of a read-only campaign page, never a provider or campaign mutation. */
export function reloadPropertyPackagePage(): void {
  window.location.reload();
}

export type PropertyPackagePanelState =
  | Readonly<{ kind: "ready"; summary: PropertyPackageSummary }>
  | Readonly<{ kind: "not_generated" }>
  | Readonly<{ kind: "unavailable" }>;

export const PROPERTY_PACKAGE_API_PATH = "/api/campaigns/property/package";
export function packageOutputHref(
  campaignRef: string,
  campaignVersionRef: string,
  output: "page" | "flyer" | "qr" | "copy",
): string {
  return `${PROPERTY_PACKAGE_API_PATH}/${encodeURIComponent(campaignRef)}/${encodeURIComponent(campaignVersionRef)}/${output}`;
}
