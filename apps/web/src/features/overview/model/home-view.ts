import type { AdsLibraryTopic } from "@oalo/contracts";

import { SESSION_USER_FALLBACK } from "../../../copy/user-language.js";
import type { HomeList } from "./home-campaigns.js";
import type { HomeChecklist } from "./home-checklist.js";

/**
 * PRD-009b. Everything Home draws, as plain data with no identifier a person would read. The server
 * read (`apps/web/src/server/home-reads.ts`) builds it and the screen draws it, so the screen holds
 * no rule about what a state means.
 */
export type HomeData = Readonly<{
  checklist: HomeChecklist;
  /** The topics that have an active ad, in the library\x27s own order. Empty means an empty library. */
  topics: readonly AdsLibraryTopic[];
  running: HomeList;
  /** Absent for a person who cannot approve (D3): the card is not drawn for them. */
  approval: HomeList | undefined;
}>;

/**
 * The name Home greets by: the first word of the display name, or nothing when there is no name or
 * the shell could only offer its stand-in ("You"), so the greeting is plain instead of "Welcome, You."
 */
export function firstNameFrom(displayName: string | undefined): string | undefined {
  const first = displayName?.trim().split(/\s+/u)[0];
  return first === undefined || first === "" || first === SESSION_USER_FALLBACK ? undefined : first;
}
