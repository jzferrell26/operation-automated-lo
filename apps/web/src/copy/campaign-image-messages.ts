/**
 * What a signed-in screen says about the property images on a campaign version (PRD-008b D1).
 *
 * Open House Boost has no photo intake yet, so a version saved today records no image. A screen that
 * summarises a version's images says so in these words instead of showing a blank, and offers no
 * way to add one, because there is nothing behind such a control to do the adding. The user-language
 * guard reads this directory, so every sentence here is held to the contract
 * (`library/knowledge/private/standards/user-language-contract.md`) the day it is written.
 *
 * It is a file of its own, and not part of `user-language.ts`, because that module has another
 * owner in the same wave. The two are read the same way by the guard.
 *
 * Only `PropertyPhotoSummary` writes the two count sentences below. A count cannot say whether the
 * images it counts are photos, and the one image a saved version can hold today is the picture the
 * system stamped on it before 008b, which nobody supplied. The summary looks at each image first.
 */

export const PROPERTY_PHOTO_LABEL = "Property photo";

export const NO_PROPERTY_PHOTO_ATTACHED = "No property photo is attached yet.";

/**
 * What a version saved before PRD-008b says about the picture it holds. Those versions recorded one
 * approved picture that the system chose, not the loan officer, and the record is immutable, so the
 * summary reports what the version holds and says what it is rather than hiding it or calling it a
 * photo.
 */
export function placeholderPictureSentence(count: number): string {
  return count === 1
    ? "This version has a placeholder picture, not a photo of your property."
    : `This version has ${String(count)} placeholder pictures, not photos of your property.`;
}

/**
 * What a version says about photos somebody supplied and approved. No screen can produce one until
 * photo intake exists, so this is the sentence that intake will use. It is never written for a
 * placeholder picture or for an image that has not been approved.
 */
export function propertyPhotoCountSentence(count: number): string {
  return count === 1
    ? "1 property photo is saved with this version."
    : `${String(count)} property photos are saved with this version.`;
}
