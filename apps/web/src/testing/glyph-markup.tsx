import { Icon, type IconName } from "@oalo/ui";
import { render } from "@testing-library/react";

/**
 * The drawing of a glyph, as markup, so a test can say which glyph a control carries.
 *
 * `Icon` draws an `svg` from its name and keeps no name on it, so "the pencil is on this link" is
 * read by comparing the control's first `svg` with the drawing the same `Icon` gives for that name.
 */
export function glyphMarkup(name: IconName): string {
  const { container, unmount } = render(<Icon decorative name={name} size="sm" />);
  const markup = container.querySelector("svg")?.innerHTML ?? "";
  unmount();
  return markup;
}

/** The drawing of the first glyph inside `element`, or the empty string when it holds none. */
export function firstGlyphMarkup(element: Element | null): string {
  return element?.querySelector("svg")?.innerHTML ?? "";
}

/**
 * The glyph a control draws before its words: the first glyph, when it comes ahead of the control's
 * text, so it sits on the first line of the words and never on a line of its own. A glyph that
 * follows the words, or no glyph, gives the empty string.
 */
export function glyphBeforeWords(element: Element | null): string {
  const glyph = element?.querySelector("svg");
  if (element === null || glyph === null || glyph === undefined) return "";
  const before = element.ownerDocument.createRange();
  before.setStart(element, 0);
  before.setEndBefore(glyph);
  return before.toString().trim() === "" ? glyph.innerHTML : "";
}
