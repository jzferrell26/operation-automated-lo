# Reference-funnel release: quality and source-alignment review

Date: October 7, 2026. Chief, direct review after [security self-review](2026-10-07-reference-security-review.md). No independent reviewer or owner visual approval is claimed. Scope: PR #85 and the [reference-led rebuild](../reference-funnel-rebuild.md).

## Source alignment, not a new invented direction

The owner rejected PR #82's arch artwork, softened offer and repeated brochure layout. The current implementation removes that visual direction and returns to the supplied references' actual structure: a prominent webinar invitation, repeated registration action, explicit first-home obstacles, presenter credibility and a coherent path after submission. Purchase and refinance have their own inquiry goals. Field-only editing is retained because that part of the prior release was accepted.

| Journey | Implemented visitor experience |
| --- | --- |
| Live webinar | Specific homebuyer offer and invitation-video/cover area, repeated seat action, event details, concrete learning sections and buyer objections, presenter, optional authorized proof, FAQs. An accepted registration unlocks confirmation, calendar files and the saved join link. |
| On-demand | Access offer and optional invitation cover, workshop content/value, presenter and access action. A consented request unlocks the actual supplied recording and then the booking page. |
| Buyer | Homebuyer-specific offer, lifestyle image and goal-choice inquiry card. The accepted request progresses to the provided booking calendar and request thank-you page. |
| Refinance | Mortgage-review offer, distinct payment/equity/term goals and supporting trade-off explanation. It does not promise a rate, savings or approval. The accepted inquiry leads to booking and request confirmation. |
| Lead magnet | Resource-specific offer and contents presentation. Its accepted request unlocks the supplied resource and optional next conversation, followed by the request thank-you page. |

The pictures are illustrative licensed assets; the presenter uses the saved person's own uploaded image or an honest initials treatment. No stock portrait is labelled the loan officer, no source-client quote is copied, and no made-up proof is rendered by default. A published cover without an invitation video does not expose editor instructions or a pretend play button.

## Product behavior

The catalog, field editor, responsive previews and photo replacement use the same saved content as the public projection. A private preview is still a preview; the published `/f/<id>` page has actual inputs, no application navigation and no editor controls. It issues no success transition until its server confirms a durable submission.

Published content is a frozen reviewed snapshot. Saving later edits does not silently alter it. Reopening the review panel clears the earlier review confirmation. The owner can see inquiry exports and take pages offline. These controls remain available when new publication is paused. Existing signed-in account and cross-workspace boundaries remain in force.

Recovery is explicit: network ambiguity preserves the request identifier and current details; a conflicting saved request cannot be overwritten and starting a separate request requires a distinct action; rate limiting and ended events have meaningful messages. Mobile fixed actions do not obscure the form or its focus. Booking links do not claim that an appointment was completed, and no automated message is triggered by the request consent.

## Verification and present disposition

Qualification is in progress on the final recovered branch. Current passing evidence includes all eight real-PostgreSQL publication/capture/export/revoke cases, 858 integration tests with one inherited skip on a two-worker rerun, the original 2,866-unit-test run, all contract/security checks, current typechecking and the published-patch dependency audits. Additional visitor-recovery cases pass in their focused run.

The first complete local offline attempts timed out in one unchanged financing-form integration case under worker contention. They are not represented as successful aggregates. The same whole integration project subsequently passed with two workers. The integration project now explicitly caps concurrent jsdom workers at two instead of allocating a DOM runtime per workstation core; unit/database settings, tests, assertions and timeout thresholds are unchanged. Final canonical Linux and hosted release evidence supersedes this checkpoint when recorded on the PR.

Both jobs of canonical Linux generation `37579269035` passed on recovered head `8883acb2`, including real database and signed-in visitor qualification. The earlier ordinary CI found only stale reference images for the intended Home/Funnels navigation changes. Exactly 106 reviewed existing references are updated: 26 synthetic Home/notice/Campaigns states and 80 authenticated Home/notice/Help/Campaigns/library states. No unrelated campaign-detail date/raster differences are accepted; no comparator, mask, threshold or assertion changes. The final ordinary CI must still compare the final tree without regeneration. The gallery under `docs/previews/five-funnel-studio` contains actual rendered screens, not design-tool mockups.

## Release and boundaries

See [the release sequence](../reference-funnel-release.md) for the exact migration/key/flag order. Functional public pages can be hosted at the application's canonical origin; automatic customer-domain provisioning is not implemented by this PR. It must not be represented as a completed connect-any-domain feature.

HighLevel delivery is implemented but separately requires an authorized server-side connection that matches the workspace's recorded location. An absent or mismatched connection never fabricates delivery; the saved inquiry remains available to its owner. No real customer CRM writes or workflow activations have been exercised in local verification. Configured video/resource/booking links are customer content inputs, not platform promises that an unrelated third-party system has confirmed attendance or an appointment.

This review describes the five reference-led designs and their actual on-platform visitor journeys. It does not declare every planned AutomatedLO feature, the still-separate photo-led payment-flyer work, custom-domain self-service or a customer-specific CRM installation finished. Final merge/deployment and any authorized smoke-test outcome must be recorded from actual results.
