# Five-funnel studio: saved field-only designs

Date: October 6, 2026. Owner: Jonathan Ferrell. Direct implementation: Chief.
Base: `37fc0566`, merged PR #81. Branch: `chief/five-funnel-studio-2026-10-06`.
Status: Branch implementation; qualification is recorded separately. Not a production deployment or a completed live lead-generation system.

## Exact owner-selected roster

The five core funnel types are now **Live webinar, On-demand webinar, Buyer, Refinance, and Lead magnet**. They are no longer an open catalog decision. The financing report remains an additional campaign feature, not a sixth funnel or a substitute for one of these five.

| Funnel | Designed pages |
| --- | --- |
| Live webinar | Registration landing page, confirmation with calendar actions |
| On-demand webinar | Access landing page, watch page, book-a-call page |
| Buyer | Purchase landing page, book-a-call page, thank-you page |
| Refinance | Goal-led refinance landing page, book-a-call page, thank-you page |
| Lead magnet | Resource landing page, resource/booking page, thank-you page |

The source basis is the three Cuantico previews supplied by the owner, inspected in an actual browser. Original designs retain the direct-response sequence of hook, useful specifics, host context, common questions and repeated next action. They do not import the source clients' portraits, testimonials, loan claims or incomplete placeholder material. No measured conversion performance or monetary design valuation is asserted by the implementation.

## What is implemented

`/marketing/campaigns/funnels` presents all five with previews of the actual page components. `/marketing/campaigns/funnels/{kind}` is a field-only editor; `/{kind}/preview` reads the saved version for a full-size preview. The existing Home -> property campaign entry also links to the studio. No additional top-level navigation section or generic page builder is introduced.

Editable fields include headlines, individual descriptions, benefit headings/text, host introduction, FAQs, final invitation copy, follow-through copy, photos and alt text, video/resource/booking/join destinations, and live event date/duration. The page structure, responsive layout and component ordering are not user-editable. Saved name/company/NMLS/disclosures come from Brand on the server, with the existing brand accent applied to the identity mark and rule. Template-specific design palettes remain coherent rather than turning arbitrary user input into CSS.

Photo replacements are genuine uploads, not external URL embeds. JPEG/PNG/WebP bytes are validated and normalized into bounded WebP with metadata removed. Images are stored inside the private draft, carry editable alternative text and require a rights attestation. Text-only saves revalidate already-normalized bytes without recompressing them. There is no automatic resizing/cropping designer to learn; the template supplies the image frame.

Each template provides a designed contact-form preview with disabled personal fields, then the relevant next page. Preview navigation performs no registration, contact write, appointment creation or delivery. A future live flow must connect reviewed consent and the actual destination before its success wording can be shown to real visitors.

Calendar preview generates a downloadable Apple/Outlook `.ics` file and a Google Calendar template link for a future event. Both preserve the supplied instant and duration, explicitly identify themselves as previews, and add no attendees. Missing/past events do not become a reset countdown or fictional confirmed time.

On-demand video accepts a URL field, never embed markup. Known YouTube/Vimeo links become a click-to-load player; direct MP4/WebM uses the browser player after a click; other safe video destinations open as explicit links. Booking and resource destinations are also deliberate external actions. Actual remote playback, appointment confirmation, video captions and resource availability need owner-supplied assets and end-to-end qualification; parsing a link is not that evidence.

## Saving and tenancy

The new `campaign.funnel_drafts` table contains at most one current draft per author, workspace and funnel kind. A draft has a template version, optimistic revision, request ID/hash, fields and saved brand. This is a private current-draft store, not an approved immutable public-campaign archive. A new request based on an old revision returns a conflict; an exact retry of the last request returns its existing saved result. Simultaneous first saves are serialized by a transaction lock.

Both SQL queries and forced RLS require the current workspace and author. Runtime cannot select another author's drafts, write another identity, delete the draft table's rows, set its public-authorization flag, or silently bypass required JSON checks with missing properties. Platform support does not acquire access to photo/content drafts. API requests cannot supply author, tenant, brand, layout, HTML, arbitrary embed or publication authority.

The browser retains unsaved edits only in memory. Saving is explicit, uncertain outcomes retain the retry key, and a conflicting tab is not overwritten. Invalid input selects the relevant editor section. A page transition resets the preview scroll and moves focus to the newly shown heading. Full-page preview opens the last saved version, not an unacknowledged autosave.

## Migration and deployment order

**Hosted saving requires `20261006120000_funnel_studio.sql` before deploying this branch.** It is additive: one private table, narrow grants, forced row policies and indexes, with no rewrite of existing campaign/financial records. It has only been applied to this task's isolated local PostgreSQL databases. No hosted migration, environment setting, DNS record or protection setting was changed.

1. Apply the migration through the existing authorized deployment path and verify forced RLS, runtime grants and no support/public grants.
2. Deploy the compatible application and verify a signed-in author's field edit, photo save/reload and conflict recovery against the hosted table.
3. Keep preview status and existing public/provider gates until real-domain and lead/booking delivery are independently proven.

Rollback can restore a prior app while retaining this unused additive table. Do not drop drafts to make an older release work. Template `1.0.0` and fields must remain readable if future templates change; incompatible upgrades require explicit version migration rather than silent overwriting. A single private draft per author/type is deliberate here; multiple published campaigns and durable prior approved versions remain the publication layer's responsibility.

## Remaining turnkey work

The designed pages and editor do not complete FUN-004, FUN-005, FUN-009 or the live portions of FUN-008: live lead forms, actual registration and consent, HighLevel handoff/workflow activation, custom domains/HTTPS, public approval/revocation and verified appointment/resource delivery remain unimplemented. Templates do not create traffic. No rates, loan approvals, savings, testimonials or leads are fabricated to make the catalog appear commercially proven.

Full reusable logo/headshot libraries shared across all products, a guide/video asset library, domain onboarding, public-template campaign versioning, consent/retention/deletion policy, distributed limits and owner visual sign-off remain release items. This increment neither changes pricing nor authorizes ads, billing, customer messages or external account writes. The reviewer should judge the captured designs directly, not infer a universal quality score from green tests.
