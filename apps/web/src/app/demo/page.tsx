import { notFound } from "next/navigation.js";

import { FoundingOfferDemo } from "../../components/demo/founding-offer-demo.js";
import { canRenderSyntheticDemo } from "../../server/authenticated-workspace-data.js";

export const dynamic = "force-dynamic";

/**
 * PRD-006d 006D-AC-018 and the sub-PRD's Non-Goals, which say this route "never renders in review
 * mode". It said so about a route with no gate on it, so the sentence was a hope rather than a
 * fact. This is the gate that makes it true.
 *
 * The route is out of scope for the design review: it carries its own nine-token palette, 76 hex
 * values, a `backdrop-filter`, and no Dark block. That is recorded in
 * `docs/operations/evidence-packs/design-quality-signoff.md` and in the rubric's open deltas, and
 * it is acceptable only for as long as nobody with a workspace can reach it. So it is served in
 * synthetic mode, where it is a local demonstration page, and is 404 everywhere else.
 */
export default function FoundingOfferDemoPage() {
  if (!canRenderSyntheticDemo()) notFound();
  return <FoundingOfferDemo />;
}
