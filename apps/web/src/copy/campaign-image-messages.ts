/**
 * What a signed-in screen says about the property images on a campaign version (PRD-008b D1).
 *
 * Open House Boost has no photo intake yet, so a version saved today records no image. A screen that
 * summarises a version's images says so in this sentence instead of showing a blank, and offers no
 * way to add one, because there is nothing behind such a control to do the adding. The user-language
 * guard reads this directory, so the sentence is held to the contract
 * (`library/knowledge/private/standards/user-language-contract.md`) the day it is written, and
 * `campaign-image-messages.unit.test.ts` fails when a signed-in source reads a version's images
 * without importing this module.
 *
 * It is a file of its own, and not part of `user-language.ts`, because that module had another
 * owner in the same wave. The two are read the same way by the guard.
 *
 * No screen summarises a version's images today, so this is the whole of it. A version saved before
 * PRD-008b can hold one approved picture the system stamped on it, which nobody supplied; the
 * screen that first shows a version's images has to tell that picture from a photo, and writes the
 * sentences for it when it exists.
 */

export const NO_PROPERTY_PHOTO_ATTACHED = "No property photo is attached yet.";
