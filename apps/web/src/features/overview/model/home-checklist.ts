/**
 * PRD-009b D2. What Home's "Get set up" card says, derived from saved records only.
 *
 * Nothing here reads the browser, and nothing is inferred from a click: a person who pressed
 * "Connect" has connected nothing until the installation row says so (the evidence rule of
 * `library/knowledge/private/ux-ui/03-components/onboarding-checklist.md`). The module is pure, so
 * the table of D2 is a unit test and the real read (`apps/web/src/server/home-reads.ts`) only has
 * to supply the two inputs.
 */

/**
 * The six statuses `platform.marketplace_installations.status` allows
 * (`supabase/migrations/20260721010000_platform_foundation.sql:168-169`). A unit test pins the list,
 * so a seventh status in a later migration fails here until D2's table says what it means.
 */
export const INSTALLATION_STATUSES = [
  "pending",
  "active",
  "missing_scope",
  "reconnect_required",
  "revoked",
  "uninstalled",
] as const;
export type InstallationStatus = (typeof INSTALLATION_STATUSES)[number];

export type ConnectionChecklistState = "connected" | "needs_attention" | "not_connected";
export type BrandChecklistState = "done" | "needs_attention" | "not_started";
export type HomeChecklistState = ConnectionChecklistState | BrandChecklistState;

export type HomeChecklistItemId = "highlevel" | "meta" | "brand";

export type HomeChecklistItem = Readonly<{
  id: HomeChecklistItemId;
  state: HomeChecklistState;
}>;

export type HomeChecklist = Readonly<{
  items: readonly HomeChecklistItem[];
  /** The count "N of 3 done" shows: items that are Connected or Done. */
  doneCount: number;
  total: number;
}>;

/** The two facts of a saved brand that D2 reads. The rest of the brand is the Brand page's. */
export type SavedBrandFacts = Readonly<{ name: string; nmls: string }>;

/**
 * What the read found under the person's brand key: the two facts, nothing, or a record that is
 * there and cannot be read. The third is not "nothing saved": the person did save something, and no
 * ad can print it.
 */
export type SavedBrandRecord = SavedBrandFacts | "unreadable" | undefined;

/**
 * D2, row one. An installation needing attention outranks an active one: two rows that disagree
 * should never be summarised as "Connected" while one of them is missing a scope. Without either,
 * every other status (and no installation at all) is "Not connected yet", because a pending,
 * revoked, or uninstalled installation connects nothing.
 */
export function highLevelConnectionState(
  statuses: readonly InstallationStatus[],
): ConnectionChecklistState {
  if (statuses.some((status) => status === "missing_scope" || status === "reconnect_required")) {
    return "needs_attention";
  }
  return statuses.includes("active") ? "connected" : "not_connected";
}

/**
 * D2, row three. A name and an NMLS number is Done; a brand saved without the number needs
 * attention (the person started and the ad cannot use it); nothing saved is Not started. A saved
 * brand with no name has nothing an ad can print, so it counts as Not started, and a saved record
 * that cannot be read needs attention, because something was saved and is of no use.
 */
export function brandChecklistState(brand: SavedBrandRecord): BrandChecklistState {
  if (brand === "unreadable") return "needs_attention";
  if (brand === undefined || brand.name.trim() === "") return "not_started";
  return brand.nmls.trim() === "" ? "needs_attention" : "done";
}

export function buildHomeChecklist(
  input: Readonly<{
    installationStatuses: readonly InstallationStatus[];
    brand: SavedBrandRecord;
  }>,
): HomeChecklist {
  const items: readonly HomeChecklistItem[] = Object.freeze([
    Object.freeze({
      id: "highlevel" as const,
      state: highLevelConnectionState(input.installationStatuses),
    }),
    // D2, row two. No Meta connection is stored anywhere in PRD-009 (the adapter is a plan only,
    // `packages/ghl/src/meta-adapter.ts:13`), so there is nothing that could make this one true.
    Object.freeze({ id: "meta" as const, state: "not_connected" as const }),
    Object.freeze({ id: "brand" as const, state: brandChecklistState(input.brand) }),
  ]);
  return Object.freeze({
    items,
    doneCount: items.filter((item) => item.state === "connected" || item.state === "done").length,
    total: items.length,
  });
}
