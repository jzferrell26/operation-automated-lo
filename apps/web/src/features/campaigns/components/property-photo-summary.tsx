import type { CampaignManifest } from "@oalo/contracts";
import { Card } from "@oalo/ui";

import {
  NO_PROPERTY_PHOTO_ATTACHED,
  PROPERTY_PHOTO_LABEL,
  placeholderPictureSentence,
  propertyPhotoCountSentence,
} from "../../../copy/campaign-image-messages.js";

/** The two things the summary needs to know about one image on a version. */
export type SummarisedImage = Pick<
  CampaignManifest["images"][number],
  "assetRef" | "approvalStatus"
>;

/**
 * The start of the reference every placeholder picture carries.
 *
 * Before PRD-008b the draft builder stamped one approved picture on every version it saved, which
 * the loan officer never supplied. Only the start of the reference is written here, on purpose:
 * `placeholder-asset-guard.unit.test.ts` (008B-AC-001) keeps the whole reference out of shipped
 * source so nothing can stamp it on a new version again, and recognising the picture in order to
 * describe it honestly is not the same act. The start is enough to tell that picture from a photo.
 */
const PLACEHOLDER_PICTURE_PREFIX = "asset_propertyPlaceholder";

/** Whether an image is the picture the system chose for a version, rather than one a person supplied. */
export function isPlaceholderPicture(image: SummarisedImage): boolean {
  return image.assetRef.startsWith(PLACEHOLDER_PICTURE_PREFIX);
}

/**
 * The one place a signed-in screen summarises the images on a campaign version (PRD-008b D1).
 *
 * It looks at each image rather than counting them, because the only image a saved version can hold
 * today is the placeholder picture stamped on it before 008b, and calling that "a property photo"
 * would say something about the property that nobody checked. A placeholder is described as a
 * placeholder. A photo is counted only when it is approved and is not a placeholder. An empty list
 * is the honest record today, because Open House Boost has no photo intake, so it is said plainly:
 * no property photo is attached yet. There is deliberately no control here. A button or a file
 * field would promise something the product cannot do.
 */
export function PropertyPhotoSummary({ images }: Readonly<{ images: readonly SummarisedImage[] }>) {
  const placeholders = images.filter(isPlaceholderPicture).length;
  const photos = images.filter(
    (image) => !isPlaceholderPicture(image) && image.approvalStatus === "approved",
  ).length;
  const sentences = [
    ...(placeholders > 0 ? [placeholderPictureSentence(placeholders)] : []),
    ...(photos > 0 ? [propertyPhotoCountSentence(photos)] : []),
  ];
  return (
    <Card padding="sm">
      <strong>{PROPERTY_PHOTO_LABEL}</strong>
      {(sentences.length === 0 ? [NO_PROPERTY_PHOTO_ATTACHED] : sentences).map((sentence) => (
        <p key={sentence}>{sentence}</p>
      ))}
    </Card>
  );
}
