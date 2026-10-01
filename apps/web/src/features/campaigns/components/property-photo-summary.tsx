import { Card } from "@oalo/ui";

import {
  NO_PROPERTY_PHOTO_ATTACHED,
  PROPERTY_PHOTO_LABEL,
  propertyPhotoCountSentence,
} from "../../../copy/campaign-image-messages.js";

/**
 * The one place a signed-in screen summarises the images on a campaign version (PRD-008b D1).
 *
 * An empty list is the honest record today, because Open House Boost has no photo intake, so it is
 * said plainly: no property photo is attached yet. There is deliberately no control here. A button
 * or a file field would promise something the product cannot do.
 */
export function PropertyPhotoSummary({ imageCount }: Readonly<{ imageCount: number }>) {
  return (
    <Card padding="sm">
      <strong>{PROPERTY_PHOTO_LABEL}</strong>
      <p>
        {imageCount === 0 ? NO_PROPERTY_PHOTO_ATTACHED : propertyPhotoCountSentence(imageCount)}
      </p>
    </Card>
  );
}
