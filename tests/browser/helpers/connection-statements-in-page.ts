import { HOME_SETUP } from "../../../apps/web/src/copy/home-messages.js";
import {
  LEADS_NOT_CONNECTED,
  LAUNCH_SENTENCES,
} from "../../../apps/web/src/copy/launch-messages.js";
import {
  CAMPAIGN_NOT_AN_AD_YET,
  NOT_CONNECTED_DETAIL,
  NOT_CONNECTED_DISCLOSURE,
  NOT_CONNECTED_HEADLINE,
  NOT_CONNECTED_NAVIGATION_DETAIL,
  NOT_CONNECTED_NEXT_STEP,
  NOT_CONNECTED_SETUP_OWNER,
  NOT_CONNECTED_SETUP_REASON,
  NOT_CONNECTED_SOURCE,
  NOT_LIVE_METRIC_SOURCE,
} from "../../../apps/web/src/copy/user-language.js";

/**
 * PRD-009g D2, "stated once", measured by sentence. The part that has no Playwright in it, so the
 * same function runs in a browser page (`state-it-once.ts` evaluates it there) and in a jsdom test
 * that holds it to the component helper it is a copy of.
 *
 * A **connection sentence** is any sentence that says HighLevel or Meta is not connected, including
 * "isn't connected", "aren't connected", and "Not connected yet". On a page, each distinct
 * connection sentence appears at most once. A short state attached to a named item ("Connect Meta:
 * Not connected yet") counts once per item, so two items may each carry one. On Home, every
 * connection sentence is inside the "Get set up" card. "Not live yet" on a result figure is a
 * reading, not a connection sentence, and is not counted.
 *
 * **Where the sentences come from.** The writing review changed several of them on 2026-10-02, and a
 * list typed into a spec goes stale the next time one moves. So the known sentences are read from
 * the copy files that own them, and the detector also recognises the shapes the copy uses ("not
 * connected", "isn't connected", "needs Meta connected", "until Meta and HighLevel are connected"),
 * so a sentence somebody adds in a screen without a copy constant is still seen. A sentence is
 * tracked if either finds it.
 */

/** Every string the copy files carry that talks about a connection, as their files write them. */
const COPY_ENTRIES: readonly string[] = Object.freeze([
  NOT_CONNECTED_HEADLINE,
  NOT_CONNECTED_DISCLOSURE,
  NOT_CONNECTED_DETAIL,
  NOT_CONNECTED_SOURCE,
  NOT_CONNECTED_NEXT_STEP,
  NOT_CONNECTED_NAVIGATION_DETAIL,
  NOT_CONNECTED_SETUP_REASON,
  NOT_CONNECTED_SETUP_OWNER,
  NOT_LIVE_METRIC_SOURCE,
  CAMPAIGN_NOT_AN_AD_YET,
  LEADS_NOT_CONNECTED,
  LAUNCH_SENTENCES.metaNotConnected.before,
  HOME_SETUP.intro,
  HOME_SETUP.introNoAds,
]);

/** Sentences are cut after a full stop, a question mark, or an exclamation mark. */
const SENTENCE_BREAK = /(?<=[.!?])\s+/u;

function sentencesOf(text: string): string[] {
  return text
    .split(SENTENCE_BREAK)
    .map((sentence) => sentence.replace(/\s+/gu, " ").trim())
    .filter((sentence) => sentence.length > 0);
}

/**
 * Every sentence of those entries that mentions connecting, so a sentence next to it that does not
 * ("You can set up an ad now.", "Not live yet.") is not tracked. "Not live yet" on a result figure
 * is a reading and not a connection sentence (D2), and the entries that carry it also carry a
 * sentence that is one.
 */
export const KNOWN_CONNECTION_SENTENCES: readonly string[] = Object.freeze(
  COPY_ENTRIES.flatMap(sentencesOf).filter((sentence) => /connect/iu.test(sentence)),
);

/** The shapes the copy uses. Each is source text, passed into the page as a string. */
export const CONNECTION_SHAPES: readonly string[] = Object.freeze([
  String.raw`\bnot\s+connected\b`,
  String.raw`\b(?:isn|aren)['’]t\s+connected\b`,
  String.raw`\bnothing\s+(?:here\s+)?is\s+connected\b`,
  String.raw`\bneeds?\s+(?:highlevel|meta)(?:\s+and\s+(?:highlevel|meta))?\s+connected\b`,
  String.raw`\buntil\s+(?:highlevel|meta)(?:\s+and\s+(?:highlevel|meta))?\s+(?:are|is)\s+connected\b`,
]);

export type StatedConnection = Readonly<{
  /** The sentence, with its inner spacing collapsed. */
  text: string;
  /** What it is counted against: the sentence itself, or the sentence and the item it belongs to. */
  key: string;
  /** True when it sits inside the element marked `data-home="setup"`, the "Get set up" card. */
  insideSetupCard: boolean;
  /** The named item a short state belongs to, when it is one. */
  item: string | null;
}>;

/**
 * Every connection sentence a person can read in the document now, in document order.
 *
 * It must stay self-contained: Playwright serialises the function it is given, so nothing outside
 * its own body may be named here, and everything it needs arrives in `input`. Only text that is
 * drawn is read: a closed disclosure, a sheet that is not open, and the layout the frame does not
 * show are not visible, so they are not counted. A short state is counted per item; anything else
 * is counted per sentence.
 */
export function connectionStatementsInDocument(
  input: Readonly<{ known: string[]; shapes: string[] }>,
): StatedConnection[] {
  const squash = (text: string): string => text.replace(/\s+/gu, " ").trim();
  const knownSet = new Set(input.known.map((sentence) => squash(sentence).toLowerCase()));
  const patterns = input.shapes.map((source) => new RegExp(source, "iu"));
  const shortState = /^not\s+connected(?:\s+yet)?\.?$/iu;
  const naming = /\b(?:highlevel|meta)\b/iu;
  const itemSelector = "li, tr, article, [role='listitem'], [data-checklist-item]";

  const sentencesIn = (text: string): string[] =>
    text
      .split(/(?<=[.!?])\s+/u)
      .map(squash)
      .filter((sentence) => sentence.length > 0);

  const itemNames = new Map<Element, string>();
  const itemOf = (element: Element): string | null => {
    const item = element.closest(itemSelector);
    if (item === null || !naming.test(item.textContent ?? "")) return null;
    let name = itemNames.get(item);
    if (name === undefined) {
      name = `item ${String(itemNames.size + 1)}`;
      itemNames.set(item, name);
    }
    return name;
  };

  const found: { text: string; key: string; insideSetupCard: boolean; item: string | null }[] = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
    const parent = node.parentElement;
    if (parent === null) continue;
    if (parent.closest("script, style, template, noscript, [data-support-details]") !== null) {
      continue;
    }
    if (!parent.checkVisibility({ visibilityProperty: true })) continue;
    for (const sentence of sentencesIn(node.textContent ?? "")) {
      const tracked =
        knownSet.has(sentence.toLowerCase()) || patterns.some((pattern) => pattern.test(sentence));
      if (!tracked) continue;
      const item = shortState.test(sentence) ? itemOf(parent) : null;
      found.push({
        text: sentence,
        key: item === null ? sentence.toLowerCase() : `${sentence.toLowerCase()} | ${item}`,
        insideSetupCard: parent.closest('[data-home="setup"]') !== null,
        item,
      });
    }
  }
  return found;
}
