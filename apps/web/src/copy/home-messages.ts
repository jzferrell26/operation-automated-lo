import type { AdsLibraryTopic } from "@oalo/contracts";

import type {
  HomeChecklistItemId,
  HomeChecklistState,
} from "../features/overview/model/home-checklist.js";
import { EMPTY_LIBRARY, SAMPLE_AD_LABEL, TOPIC_LABELS } from "./launch-messages.js";

/**
 * PRD-009b. The words of Home, in one file, so the writing review reads them in one place and no
 * screen can drift from them (user-language contract, section 5). 009f owns `user-language.ts` in
 * PRD-009 and other lanes keep their strings in their own copy files, so these live here.
 *
 * Every string follows the user-language contract: second person, plain words, sentence case, no
 * internal nouns, no dashes, and nothing that says an ad is live or launched. Where the design's
 * wording promised a logo, 009d D3's correction is used, because PRD-009 has no logo upload.
 *
 * Three sets of words are shared with "Launch an ad": the topic names, "Sample ad", and the
 * empty-library sentence. They are read from `launch-messages.ts` and not copied, so the two
 * screens cannot drift (writing review pass 1, W-22).
 */

export const HOME_GREETING_PLAIN = "Welcome.";

/** "Welcome, Alex." The name is the person's first name, and a person with no name is welcomed plainly. */
export function homeGreeting(firstName: string | undefined): string {
  return firstName === undefined ? HOME_GREETING_PLAIN : `Welcome, ${firstName}.`;
}

export const HOME_START = Object.freeze({
  eyebrow: "Ads library",
  heading: "Launch an ad",
  lead: "Pick a ready-made Facebook ad for loan officers. Your name and NMLS number go on it for you. You set the budget, dates and area, then approve it.",
  question: "What do you want to promote?",
  primaryAction: "Choose an ad",
  stepsLabel: "What happens next",
  steps: Object.freeze(["Choose an ad", "Set it up", "Review and launch"]),
  /** 009C-AC-012. Said on the library tab, in step 1, and here, in the same words. */
  emptyLibrary: EMPTY_LIBRARY,
});

/** The topic buttons. Sentence case, the owner's own examples (design section 5.1). */
export const HOME_TOPIC_LABELS: Readonly<Record<AdsLibraryTopic, string>> = TOPIC_LABELS;

export const HOME_SETUP = Object.freeze({
  heading: "Get set up",
  /**
   * The one sentence on Home that says what is and is not connected (009B-AC-008). Amended
   * 2026-10-02 by the writing review (MTK-008, W-2): it no longer says connecting is enough to run
   * an ad, because launching stays off in PRD-009 even when both are connected.
   */
  intro:
    "You can set up an ad now. Launching it on Facebook isn't turned on yet, and it needs HighLevel and Meta connected.",
  /** What the card says when all three are done, in place of the items. */
  doneHeading: "You're set up",
  reviewAction: "Review your setup",
  progressLabel: (done: number, total: number) =>
    `${String(done)} of ${String(total)} setup steps done`,
  count: (done: number, total: number) => `${String(done)} of ${String(total)} done`,
});

type ChecklistCopy = Readonly<{
  title: string;
  sentence: string;
  /** What the action link says, by state, and the item's own name that completes its accessible name. */
  actions: Readonly<Record<HomeChecklistState, string>>;
  subject: string;
}>;

/**
 * What the two connection items' link says while nothing is connected. Amended 2026-10-02 by the
 * writing review (MTK-008, W-3): the link used to say "Connect", and it opens a page that says
 * "Nothing is connected from this page" because no connect control exists in PRD-009. The words
 * now promise only what the page does, which is say what each account needs from the person.
 */
export const HOME_SEE_WHATS_NEEDED = "See what's needed";

/**
 * The three items of D2. The action's accessible name is its visible word and the item's subject
 * ("Fix" and "HighLevel", "Edit" and "your brand details"), so a screen reader hears which item a
 * link belongs to, and the visible word stays inside it (WCAG 2.5.3). The one visible word that
 * does not read with a bare subject, "See what's needed", takes "for" first: "See what's needed
 * for HighLevel" (`homeChecklistActionName`).
 */
export const HOME_CHECKLIST: Readonly<Record<HomeChecklistItemId, ChecklistCopy>> = Object.freeze({
  highlevel: {
    title: "Connect HighLevel",
    sentence: "New leads from your ads go to your HighLevel account.",
    subject: "HighLevel",
    actions: {
      connected: "Review",
      needs_attention: "Fix",
      not_connected: HOME_SEE_WHATS_NEEDED,
      done: "Review",
      not_started: HOME_SEE_WHATS_NEEDED,
    },
  },
  meta: {
    title: "Connect Meta",
    sentence: "Your Facebook page and ad account. Meta needs both before an ad can launch.",
    subject: "Meta",
    actions: {
      connected: "Review",
      needs_attention: "Fix",
      not_connected: HOME_SEE_WHATS_NEEDED,
      done: "Review",
      not_started: HOME_SEE_WHATS_NEEDED,
    },
  },
  brand: {
    title: "Add your brand",
    sentence: "Your name and NMLS number. They go on every ad automatically.",
    /** "your brand details" says what to add, fix or edit (writing review W-24). */
    subject: "your brand details",
    actions: {
      connected: "Edit",
      needs_attention: "Fix",
      not_connected: "Add",
      done: "Edit",
      not_started: "Add",
    },
  },
});

/** The accessible name of one checklist link: its visible word, then which item it belongs to. */
export function homeChecklistActionName(
  id: HomeChecklistItemId,
  state: HomeChecklistState,
): string {
  const copy = HOME_CHECKLIST[id];
  const action = copy.actions[state];
  return action === HOME_SEE_WHATS_NEEDED
    ? `${action} for ${copy.subject}`
    : `${action} ${copy.subject}`;
}

/** The words each state is shown in, always beside its glyph. */
export const HOME_CHECKLIST_STATE_LABELS: Readonly<Record<HomeChecklistState, string>> =
  Object.freeze({
    connected: "Connected",
    done: "Done",
    needs_attention: "Needs attention",
    not_connected: "Not connected yet",
    not_started: "Not started",
  });

/** Both connections are managed in Settings, which already says what is connected; the brand is on Brand. */
export const HOME_CHECKLIST_HREFS: Readonly<Record<HomeChecklistItemId, string>> = Object.freeze({
  highlevel: "/settings/connections",
  meta: "/settings/connections",
  brand: "/brand",
});

export const HOME_RUNNING = Object.freeze({
  heading: "Running now",
  emptyTitle: "No ads running",
  /** Amended 2026-10-02 (MTK-008, W-2): says launching is off, so it never reads as a promise. */
  emptyBody:
    "Ads you launch will show here with their spend and leads. Launching isn't turned on yet.",
  emptyAction: "Launch an ad",
});

export const HOME_APPROVAL = Object.freeze({
  heading: "Needs your approval",
  emptyTitle: "Nothing to approve",
  emptyBody:
    "A campaign waits here after its checks pass, until someone approves it or sends it back.",
});

export const HOME_SEE_ALL_CAMPAIGNS = "See all campaigns";

/** 009C-AC-005. A campaign built on a sample ad says so wherever it is listed. */
export const HOME_SAMPLE_AD_LABEL = SAMPLE_AD_LABEL;

export const HOME_FOOTER =
  "HighLevel stays your CRM. Your contacts, pipelines and follow-up live there.";

/** The run dates of one campaign, said plainly. `undefined` for a start means "when you launch it". */
export function homeRunDates(startsAt: string | undefined, endsAt: string | undefined): string {
  const format = (iso: string) =>
    new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeZone: "UTC",
    }).format(new Date(iso));
  if (endsAt === undefined) return startsAt === undefined ? "" : `Starts ${format(startsAt)}`;
  return startsAt === undefined
    ? `Starts when you launch it, ends ${format(endsAt)}`
    : `Runs ${format(startsAt)} to ${format(endsAt)}`;
}

/** Where each Home link goes. The create route is 009d's; Settings, Brand, and Campaigns already exist. */
export const HOME_PATHS = Object.freeze({
  launch: "/marketing/campaigns/new",
  campaigns: "/marketing/campaigns",
  reviewSetup: "/overview?review=setup",
});

export function homeTopicHref(topic: AdsLibraryTopic): string {
  return `${HOME_PATHS.launch}?topic=${topic}`;
}
