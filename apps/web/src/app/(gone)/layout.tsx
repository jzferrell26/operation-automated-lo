/**
 * PRD-009f D1 and 009F-AC-001. The signed-in shell around the three pages that are gone.
 *
 * `/leads`, `/leads/pipeline`, and `/automations` answer a real 404 with the product's own page
 * instead of the framework's. A page under `(authenticated)` cannot: that group has a loading
 * boundary, so the response has begun streaming by the time `notFound()` is thrown and its status
 * is already 200 (`docs/01-app/03-api-reference/03-file-conventions/loading.md`, "Status Codes").
 * This group has the same layout and no loading boundary, so the status is still open when the page
 * throws, and the person still sees the menu around the words.
 *
 * The layout is the signed-in one, re-exported rather than copied, so it cannot drift from it. The
 * group holds those three addresses and nothing else: any other unknown address stays with the
 * catch-all's ordinary not-found, because the sentence in `not-found.tsx` would not be true there.
 */
export { default } from "../(authenticated)/layout.js";

export const dynamic = "force-dynamic";
