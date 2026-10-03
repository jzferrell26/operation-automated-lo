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
