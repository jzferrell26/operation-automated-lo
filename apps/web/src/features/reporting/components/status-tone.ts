import type { BadgeTone } from "@oalo/ui";

/**
 * The tone a status word takes on the campaign page (design direction section 2.3, "Status chips pair
 * a glyph and words with colour"; scored review pass 2, R2 N-5c). The words are the data's own, and the
 * tone is the colour and the glyph that go with them, so an approved version and a superseded one are
 * no longer one grey pill.
 *
 * "approved" and "connected" are the two statuses that mean something is in good standing; anything
 * the data may add later is neutral until a tone is chosen for it, and still carries its glyph.
 */
export function toneForStatus(status: string): BadgeTone {
  return status === "approved" || status === "connected" ? "success" : "neutral";
}

/**
 * The words a status chip says (writing review delta check, D-8). The data's own words are lowercase
 * ("approved", "superseded", "connected"), which no sentence-case chip on a real page is, and
 * "superseded" is not a plain word. The data keeps its words (`data-artifact-status` stays raw);
 * the chip says these. A word the data adds later is said in sentence case until it is given words.
 */
const STATUS_WORDS: Readonly<Record<string, string>> = Object.freeze({
  approved: "Approved",
  superseded: "Replaced",
  connected: "Connected",
});

export function labelForStatus(status: string): string {
  const known = Object.hasOwn(STATUS_WORDS, status) ? STATUS_WORDS[status] : undefined;
  if (known !== undefined) return known;
  const spaced = status.replaceAll("_", " ").trim();
  return `${spaced.charAt(0).toUpperCase()}${spaced.slice(1)}`;
}
