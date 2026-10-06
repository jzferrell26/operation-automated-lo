# Five-funnel studio: designed journeys, field-only editing

Owner decision: October 6, 2026. Base `37fc0566`, merged PR #81. Implement directly, with no subagents. The roster is now fixed: Live webinar, On-demand webinar, Buyer, Refinance, Lead magnet. The property financing report remains a separate campaign capability, not a sixth core funnel or a substitute for one of these five.

## Source review and original design

Read all three owner-supplied Cuantico previews in an actual browser on October 6. The live webinar uses a direct educational hook, repeated seat CTA, problem/solution list, host block and final CTA. The purchase and refinance examples use bold centered promises, lifestyle/adviser imagery, repeated action buttons and similar benefit/testimonial sections. Several source identities/descriptions are incomplete; the webinar explicitly marks a testimonial as a placeholder. None of their private portraits, client testimonials, lender-specific claims or boilerplate is licensed or imported by this feature. Source screenshots and page text remain in ignored `tmp/source-review`, not the public repository.

Interpret the requested Brunson-style direction as an outcome hook, a reason to keep reading, specific educational value, human host/adviser context, objections answered and one repeated next action. This is a design interpretation, not measured conversion evidence, an endorsement, or a copy of proprietary templates. Do not invent urgency, scarcity, testimonials, approval, rate quotes, savings or participant counts.

## Exact page map

| Funnel | Designed journey |
| --- | --- |
| Live webinar | Registration landing page -> confirmation with add-to-calendar actions |
| On-demand webinar | Access landing page -> watch page -> book-a-call page |
| Buyer | Purchase landing page -> book-a-call page -> thank-you page |
| Refinance | Refinance landing page -> book-a-call page -> thank-you page |
| Lead magnet | Resource landing page -> book-a-call/resource-delivery page -> thank-you page |

The final two journey maps are implementation proposals for the buyer/refinance categories named by the owner; their booking/thank-you defaults are explicit, not claimed as source-page content. Preview controls navigate the real designed steps but never record a visitor as registered, booked or delivered. In private preview there is no lead collection or fake submission success. Configured video/booking/download links are checked HTTPS destinations, opened only on a deliberate action; no arbitrary embed code, remote image fetch or injected HTML.

## Visual system

The studio remains inside the existing light/dark shell and Campaigns organization. Five large cards show actual miniature first-page compositions, journey steps and one Edit funnel action. The editor has a compact top bar, named content sections on the left, and live responsive preview on the right. Content controls edit text, photos, event details and approved destination fields only. No rearrangement, section deletion, blank canvas, code input or contenteditable.

Consumer-facing designs have their own scoped, fixed reading palettes, independent of editor appearance. Live webinar is a dark keynote with generous split hero; on-demand a cinematic watch-first composition; buyer an editorial light homeownership story; refinance an ink-and-teal goal-first page; lead magnet a warm library/book composition. Reuse Inter, with an optional system Georgia accent for editorial emphasis. No webfont download. Named `--funnel-*` surface/ink/accent/art tokens are defined in the canonical master and mirrored shipped token source; only the scoped funnel stylesheet consumes them. Existing application tokens and appearance are unchanged. Shared Button, Link, Dialog and input controls retain the product's interaction and accessibility behavior under the scoped visitor styling.

Use large 44-72px responsive hero typography only inside marketing previews, 18px supporting copy, high-contrast buttons, deliberate 96/64/32px section rhythm and capped reading widths. Phones use 36-44px hero text, single-column sections and 48px actions. The studio follows the existing application type scale. Empty photos render original architectural/document shapes, not fake clients or stock property representations. Uploads replace defined photo slots and carry editable alt text. No animations that loop; reduced motion removes transitions.

## Saved editor and security boundary

One private draft per author/workspace/template is stored with a revision and saved brand snapshot. Optimistic concurrency rejects stale edits and exact retries return the existing draft. The five default compositions are immediately selectable even before a draft is saved. Uploads are raster-only, bounded, decoded and re-encoded on the server to strip metadata; no raw SVG or remote image URL. Draft read/write uses verified identity and tenant transactions, not client-supplied owner data. A saved brand is required to save; read-only roles cannot mutate. Public sharing, DNS/SSL verification, lead capture and actual HighLevel workflow activation remain separate release work and cannot be implied by a Save button.

## Acceptance for this implementation

1. Exactly five catalog entries and fourteen designed pages with the above routes; no placeholder conversion claims or CTA that pretends an unperformed action succeeded.
2. Labelled fields update matching text/photos across the appropriate pages. Layout and section order are platform-owned. Save/reload preserves the draft and all image bytes; a stale write cannot overwrite another tab.
3. Every funnel has its own visual composition and responsive follow-through pages, not just a different headline on five identical pages.
4. Calendar output preserves the event instant, duration and title, escapes ICS control characters and refuses a missing/past event. Video, call and resource actions require safe configured URLs. Preview downloads/events remain explicitly marked as previews.
5. All five first pages and follow-through pages work at desktop/mobile, with keyboard access, alt text, no horizontal overflow and readable contrast. Inspect the rendered output, not only test assertions.
6. No template save authorizes public publication, DNS mutation, live lead entry, lender review, ad spend or customer messaging. Keep missing setup visible without turning the visitor template into an operator checklist.

This feature must be called a saved funnel studio/private preview until its public-domain and actual lead/booking handoff qualify. The remaining turnkey product promise stays open even when all designed pages and field edits are complete.
