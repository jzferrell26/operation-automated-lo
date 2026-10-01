import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  NO_PROPERTY_PHOTO_ATTACHED,
  PROPERTY_PHOTO_LABEL,
  propertyPhotoCountSentence,
} from "../../../copy/campaign-image-messages.js";
import { findVocabularyHits } from "../../../copy/forbidden-vocabulary.js";
import { PropertyPhotoSummary } from "./property-photo-summary.js";

/**
 * PRD-008b 008B-AC-003.
 *
 * Open House Boost has no photo intake, so a saved version records no image, and the screen that
 * summarises a version's images has to say that rather than show a blank. It must also offer no way
 * to add one: there is nothing behind such a control.
 */

describe("the property photo summary with no image on the version", () => {
  it("says that no property photo is attached yet", () => {
    render(<PropertyPhotoSummary imageCount={0} />);

    expect(screen.getByText(PROPERTY_PHOTO_LABEL)).toBeInTheDocument();
    expect(screen.getByText("No property photo is attached yet.")).toBeInTheDocument();
  });

  it("offers no upload control of any kind", () => {
    const { container } = render(<PropertyPhotoSummary imageCount={0} />);

    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(screen.queryAllByRole("link")).toHaveLength(0);
    expect(container.querySelector("input, label, form, [type='file']")).toBeNull();
  });

  it("is in the user's language: no forbidden term, no identifier, no dash", () => {
    for (const sentence of [
      NO_PROPERTY_PHOTO_ATTACHED,
      PROPERTY_PHOTO_LABEL,
      propertyPhotoCountSentence(1),
      propertyPhotoCountSentence(3),
    ]) {
      expect(findVocabularyHits(sentence)).toEqual([]);
    }
  });
});

describe("the property photo summary with images on the version", () => {
  it.each([
    [1, "1 property photo is saved with this version."],
    [3, "3 property photos are saved with this version."],
  ])("reports what the version holds for %i", (count, sentence) => {
    render(<PropertyPhotoSummary imageCount={count} />);

    expect(screen.getByText(sentence)).toBeInTheDocument();
    expect(screen.queryByText(NO_PROPERTY_PHOTO_ATTACHED)).toBeNull();
  });
});
