import type { Metadata } from "next";
import { SharedReportUnavailable } from "../../../../features/homeowners/shared-report-unavailable.js";
import { SHARED_REPORT_UNAVAILABLE_TITLE } from "../../../../copy/shared-report-messages.js";

/**
 * Where `notFound()` lands for a shared report link, which is every link the page cannot show.
 *
 * `page.tsx` calls `notFound()` for a link that is not shaped like one, for a deployment that has
 * not enabled reports, and for a link with no live report behind it, and a link that was never
 * made, one that expired, and one that was turned off are all that last case. They get this page
 * and nothing else, so what a stranger sees cannot tell them which links exist.
 *
 * The posture matches the report page's. The headers (`Referrer-Policy: no-referrer`,
 * `Cache-Control: no-store`, `X-Robots-Tag: noindex, nofollow, noarchive`) come from `proxy.ts`,
 * which applies them by request path before routing, so they are on this response as much as on
 * the report's; `proxy.shared-report.unit.test.ts` pins that. The metadata below repeats the
 * report page's robots and referrer tags so the document says the same in its own markup.
 */
export const metadata: Metadata = {
  title: SHARED_REPORT_UNAVAILABLE_TITLE,
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

export default function SharedReportNotFound() {
  return <SharedReportUnavailable />;
}
