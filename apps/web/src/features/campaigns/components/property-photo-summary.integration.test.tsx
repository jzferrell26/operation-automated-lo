import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  NO_PROPERTY_PHOTO_ATTACHED,
  PROPERTY_PHOTO_LABEL,
  placeholderPictureSentence,
  propertyPhotoCountSentence,
} from "../../../copy/campaign-image-messages.js";
import { findVocabularyHits } from "../../../copy/forbidden-vocabulary.js";
import { PropertyPhotoSummary, type SummarisedImage } from "./property-photo-summary.js";

/**
 * PRD-008b 008B-AC-003, and finding P1 (B3 and B4) of the 2026-10-01 writing review.
 *
 * Open House Boost has no photo intake, so a saved version records no image, and the screen that
 * summarises a version's images has to say that rather than show a blank. It must also offer no way
 * to add one: there is nothing behind such a control.
 *
 * The one version that can hold an image is a version saved before 008b, and the only image those
 * hold is the picture the system stamped on them, which nobody supplied. Saying "1 property photo
 * is saved with this version" about it is the same dishonesty 008b removes from new versions, so
 * the summary has to tell that picture from a photo.
 */

/** What every version saved before 008b records: an approved picture nobody supplied. */
const PLACEHOLDER: SummarisedImage = {
  assetRef: "asset_propertyPlaceholder001",
  approvalStatus: "approved",
};

/** An image somebody supplied and approved, which no screen can produce until photo intake exists. */
const PHOTO: SummarisedImage = { assetRef: "asset_01Exterior", approvalStatus: "approved" };

/** An image somebody supplied that has not been approved. */
const WAITING_PHOTO: SummarisedImage = { assetRef: "asset_01Porch", approvalStatus: "pending" };

describe("the property photo summary with no image on the version", () => {
  it("says that no property photo is attached yet", () => {
    render(<PropertyPhotoSummary images={[]} />);

    expect(screen.getByText(PROPERTY_PHOTO_LABEL)).toBeInTheDocument();
    expect(screen.getByText("No property photo is attached yet.")).toBeInTheDocument();
  });

  it("offers no upload control of any kind", () => {
    const { container } = render(<PropertyPhotoSummary images={[]} />);

    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(screen.queryAllByRole("link")).toHaveLength(0);
    expect(container.querySelector("input, label, form, [type='file']")).toBeNull();
  });
});

describe("the property photo summary on a version that holds the placeholder picture", () => {
  it("calls it a placeholder picture and not a photo of the property", () => {
    render(<PropertyPhotoSummary images={[PLACEHOLDER]} />);

    expect(
      screen.getByText("This version has a placeholder picture, not a photo of your property."),
    ).toBeInTheDocument();
  });

  it("never says a property photo is saved with it", () => {
    const { container } = render(<PropertyPhotoSummary images={[PLACEHOLDER]} />);

    expect(screen.queryByText("1 property photo is saved with this version.")).toBeNull();
    expect(container.textContent).not.toMatch(/property photos? (?:is|are) saved/iu);
  });

  it("does not add the empty-list sentence beside the placeholder sentence", () => {
    render(<PropertyPhotoSummary images={[PLACEHOLDER]} />);

    expect(screen.queryByText(NO_PROPERTY_PHOTO_ATTACHED)).toBeNull();
  });

  it("counts several placeholder pictures in the plural", () => {
    render(<PropertyPhotoSummary images={[PLACEHOLDER, PLACEHOLDER]} />);

    expect(
      screen.getByText("This version has 2 placeholder pictures, not photos of your property."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/property photos are saved/iu)).toBeNull();
  });

  it("offers no upload control either", () => {
    const { container } = render(<PropertyPhotoSummary images={[PLACEHOLDER]} />);

    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(container.querySelector("input, label, form, [type='file']")).toBeNull();
  });
});

describe("the property photo summary with photos somebody supplied", () => {
  it.each([
    [[PHOTO], "1 property photo is saved with this version."],
    [
      [PHOTO, { ...PHOTO, assetRef: "asset_01Kitchen" }, PHOTO],
      "3 property photos are saved with this version.",
    ],
  ])("reports the approved photos the version holds", (images, sentence) => {
    render(<PropertyPhotoSummary images={images} />);

    expect(screen.getByText(sentence)).toBeInTheDocument();
    expect(screen.queryByText(NO_PROPERTY_PHOTO_ATTACHED)).toBeNull();
    expect(screen.queryByText(/placeholder/iu)).toBeNull();
  });

  it("does not count a photo that has not been approved", () => {
    render(<PropertyPhotoSummary images={[PHOTO, WAITING_PHOTO]} />);

    expect(screen.getByText("1 property photo is saved with this version.")).toBeInTheDocument();
    expect(screen.queryByText(/2 property photos/iu)).toBeNull();
  });

  it("counts only the photos when a placeholder sits beside them", () => {
    render(<PropertyPhotoSummary images={[PLACEHOLDER, PHOTO]} />);

    expect(screen.getByText("1 property photo is saved with this version.")).toBeInTheDocument();
    expect(
      screen.getByText("This version has a placeholder picture, not a photo of your property."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/2 property photos/iu)).toBeNull();
  });
});

describe("the sentences the summary uses", () => {
  it("are in the user's language: no forbidden term, no identifier, no dash", () => {
    for (const sentence of [
      NO_PROPERTY_PHOTO_ATTACHED,
      PROPERTY_PHOTO_LABEL,
      placeholderPictureSentence(1),
      placeholderPictureSentence(3),
      propertyPhotoCountSentence(1),
      propertyPhotoCountSentence(3),
    ]) {
      expect(findVocabularyHits(sentence), sentence).toEqual([]);
    }
  });
});
