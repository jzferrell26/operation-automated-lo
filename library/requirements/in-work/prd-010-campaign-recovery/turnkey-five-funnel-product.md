# Five finished funnels, not a funnel builder

Status: Owner-directed product requirement; not implemented.
Priority: Primary product experience and commercial promise, not an optional design-tool add-on.
Decision date: October 5, 2026. Owner: Jonathan Ferrell. Delivery lead: Chief.
Authoring base: `d5ef89b0`, merged PR #78. No runtime or deployment change accompanies this brief.

## Owner direction

The owner's stated customer pain is that AutomatedLO clients do not want to invent creative, write prompts, use Lovable, or hire a developer to finish their marketing. Giving them better instructions does not complete that job. His requirement is five prebuilt funnels included in AutomatedLO, with domain connection rather than web development as the customer's final setup task.

Treat this as the owner's primary sales thesis, not independently verified revenue or conversion evidence. The product sells finished marketing that becomes the customer's own, not access to a blank editor, prompt pack, template download, or agency implementation service. Do not change existing prices or billing to implement this direction.

The [payment-report, flyer and co-branded-site brief](payment-flyers-and-co-branded-sites.md) remains the flagship immediate build. Its report view is essential, not an optional PDF attachment to a generic listing page. The wider five-funnel contract makes the same no-design-work promise across the core product.

## Required user experience

One-time setup saves and confirms the loan officer's identity, brand/media, applicable company disclosures, domain, and authorized HighLevel destination. Eligible existing setup should be reused rather than asking for it again. Realtor identity is selected only where co-branding is appropriate. Financial assumptions are managed separately from visual design and must remain current and reviewable.

After setup, the five core funnels are already provisioned for the workspace with its branding. The customer selects the business outcome, supplies only facts that genuinely vary, previews the finished result, and publishes the approved version. They do not choose section layouts, write conversion copy, create forms or thank-you pages, assemble workflows, edit code, maintain a hosting account, or hire a developer.

The planned Home experience is a small set of finished, already-branded campaign choices. It is not an empty catalog, a prompt textarea, a generic site builder, or a list of unfinished tasks with no deliverable. Optional editing must never be a prerequisite for a usable result. Retain the current light interface and Campaigns organization rather than adding another navigation system.

For repeat property marketing: choose the saved property and Realtor, confirm an eligible financing preset and its inputs, then generate the report/flyer/site package. No repeated photo, identity, layout or fee entry when the saved inputs are complete and current. The three-action target is detailed in PAY-001; approval and true setup deficiencies cannot be hidden to satisfy a click-count claim.

## What counts as one of the five

A core funnel is a complete customer journey, not one page, one PDF, or a color variation of another funnel. The platform maintains the approved structure, original layout, responsive behavior, default copy, calls to action, forms, confirmation state and handoff configuration. Its manifest declares which of these components apply to that outcome. Any omitted component must be intentional, not left for a client to design.

Five refers to funnel journeys, not the number of payment-scenario columns. The report, PDF and website are coordinated outputs of the financing experience, not three artificial funnel slots; individual loan programs and down-payment variants are not automatically separate funnels either.

| Layer | Platform responsibility |
| --- | --- |
| Visitor experience | Finished landing page, relevant supporting content, a useful next action, and confirmation/thank-you experience that reflects what actually happened. |
| Customer identity | One saved brand applied consistently to pages, copy, contact blocks, downloads and permitted co-brand surfaces. Missing required assets are setup corrections, not invitations to open a design tool. |
| Lead capture | Preconfigured field and consent definitions, validated input, safe submission, duplicate protection and the correct workspace/campaign destination. |
| Follow-up | Packaged mapping to the intended HighLevel contact, tags, calendar and reviewed workflow as applicable. A customer must not have to build these by hand; actual outbound activation remains an authorized action. |
| Distribution | Verified custom-domain routing, usable page URL, correct share metadata and applicable downloads/QR. Advertising creative is a supporting capability, not the only completed product. |
| Measurement | Versioned funnel identity and source/campaign attribution, with actual lead/handoff evidence. No invented traffic, appointments, applications or funded-loan totals. |

A completed domain connection does not authorize ad spend, billing, lender approval, or unsolicited customer messages. It also does not create traffic. The promise is that the marketing destination and permitted lead path are ready without creative or developer work, not that merely owning a domain guarantees leads.

## Five is decided; the exact roster is still open

No source reviewed for this authoring pass establishes an approved list of five winning funnel assets. Do not silently substitute an arbitrary mortgage-product list or tell the owner that five funnels already exist.

The [original product definition](../../../knowledge/private/product/product-definition.md#campaign-roadmap) names Open House Boost, New Listing Spotlight, Realtor Partner Campaign, Homebuyer Education Event, and Buyer Preapproval Campaign. That is a historical campaign roadmap. It is not proof of five implemented, conversion-tested funnels, nor confirmation that it is the final pack intended by this new decision. The payment comparison has since been identified as a specific missing customer outcome and must be accounted for in catalog selection, not dropped to preserve that old table.

Before finalizing the five, inventory the owner's existing authorized funnel/snapshot assets. Record each candidate's business outcome, source/version, ownership/reuse rights, complete page sequence, required media and copy, form/calendar/workflow dependencies, observed deployment status and available performance evidence. Where no reusable asset exists, build an original platform-owned template and label it unvalidated rather than borrowing restricted client work.

Choose five distinct outcomes, identify how the flagship property/payment experience fits, and capture the final decision in a versioned catalog. No public winner or conversion-rate claim is permitted without its supporting audience, traffic period, sample and results. Owner-tested experience may guide selection; it must not be rewritten as measured results the repository has not seen.

## Domain connection is product functionality

The customer should not need their own Vercel project, separate Lovable project, or per-funnel hosting configuration. One verified workspace domain or explicitly selected subdomain serves its configured funnel paths. Provision the five from a shared platform implementation, not five code forks or five paid hosting installations. These are proposed implementation constraints to satisfy the owner outcome; no domain API or infrastructure choice is declared implemented here.

Provide a guided domain connection inside AutomatedLO with the exact required records, ownership verification, certificate status, retry/resume, and plain-language recovery. Show waiting for DNS, awaiting certificate, ready, and attention-needed states separately. Do not request or store registrar passwords, replace an existing website without approval, or change mail/MX records. Use provider authorization only when an actual supported integration has been verified.

Tenant-to-domain resolution must be server-owned. A supplied Host header, unverified domain, known slug or another workspace's template ID must never select another tenant's data. A domain cannot be claimed by two workspaces. Validate return destinations and prevent open redirects, dangling-domain takeover and private-preview exposure. Domain disconnect/reassignment needs an explicit lifecycle and appropriate cache invalidation.

Keep domain readiness, content approval, lead-route readiness and publication state distinct. A certificate or HTTP 200 alone cannot produce a Launch Ready badge. A failed DNS or CRM check preserves the prepared funnels and explains the missing step. The customer can inspect an authenticated preview without that preview being presented as a public production funnel.

Old approved packages and PDFs remain immutable. Domain changes require a deliberate strategy for existing public links and QR destinations; do not silently rewrite saved outputs or redirect an old customer's URL into another workspace.

## One data source, three payment outputs

The flagship financing experience reads one saved property, co-brand identity and financing comparison. It renders a report-style screen, printable payment flyer and mobile-first co-branded site from the same values. A website is not an embedded PDF, and the flyer is not a second manually edited calculator.

Keep the historical assumptions, cash-to-close and housing-expense groups. Use saved current quote inputs and deterministic calculations, not AI-generated rates or balances. Refreshing a quote or changing an identity, asset, price or fee creates a new reviewable version. The financial, media, approval, expiry and public-QR boundaries in PAY-001 through PAY-016 remain requirements; the five-funnel promise does not bypass them.

Original non-rate educational/program templates can complement the payment family. Client/team-only reference templates remain restricted and must never be copied into the platform catalog. Use the entitlement model in the payment brief for client-specific work. Private correspondence and collaboration URLs must not be committed to this public repository.

## Delivery order and code boundaries

1. Finish the flagship payment input/calculation, reusable co-brand/media and report/flyer/site path already specified. Inventory the existing funnel assets alongside this work without turning the customer into the asset researcher.
2. Package the five selected journeys into a platform-maintained, versioned catalog with complete defaults and per-workspace provisioning. Reuse the existing campaign/persistence/approval and HighLevel boundaries; do not create another CRM or build a general-purpose editor.
3. Implement guided domain setup and approved public projections with automatic routing of the prepared funnel paths. Qualify the real lead/confirmation/handoff journey on the connected domain.
4. Promote finished funnels into first-run Home only when they are genuinely usable. Keep the working ad-library path and older campaigns available during the transition. Do not place five attractive but dead launch buttons in production to make the feature look complete.

Relevant starting points: `apps/web/src/features/overview/`, `apps/web/src/features/property-campaigns/`, `apps/web/src/features/workspace/`, existing campaign/version contracts and tenant persistence, private media storage, `apps/web/src/server/property-package-*`, campaign approvals, and HighLevel connection/routing adapters. Inspect existing public routes and deployment configuration before adding domain resolution. Scope each implementation PR to one independently verifiable increment.

## Acceptance criteria

All rows below are pending implementation and qualification. They are product tests, not completed implementation claims.

| ID | Required evidence |
| --- | --- |
| FUN-001 | A versioned, rights-cleared catalog contains exactly five selected core funnel journeys. Sources and validation status are recorded, and the property/payment experience has an explicit catalog position. |
| FUN-002 | A newly configured eligible workspace receives all five in its own confirmed branding without prompts, an external builder, source-code changes or manual agency setup. |
| FUN-003 | Each funnel can reach a useful approved result with default layout/copy. Optional customization is not required; missing business inputs are distinguished from missing creative. |
| FUN-004 | Applicable lead forms, confirmation pages, contact/booking actions and HighLevel handoff are preconfigured and proven end to end. A rendered page alone cannot satisfy completion. |
| FUN-005 | One guided domain/subdomain setup serves the selected funnel routes over verified HTTPS. Delayed DNS and certificate failures preserve progress and provide accurate next steps. No per-funnel hosting setup is required. |
| FUN-006 | Unverified domains, host spoofing, cross-tenant slugs/templates, duplicate domain claims and domain reassignment cannot expose or publish another workspace's content. |
| FUN-007 | The financing report, flyer and site show identical saved amounts, assumptions, identity and validity. Material changes invalidate approval; expired quotes do not remain presented as current. |
| FUN-008 | The real visitor journey works on desktop and mobile with readable disclosures, working confirmation/download/booking behavior and correct accessible states. No placeholder testimonials, fabricated outcomes, stock-property substitution or dead CTA is released. |
| FUN-009 | Test submissions arrive in the authorized HighLevel destination with funnel/property/partner attribution as applicable. Retries do not create duplicate writes or activate unapproved messages. |
| FUN-010 | Provisioning and retries are idempotent. Catalog upgrades are versioned and do not overwrite existing approved campaigns, copied client assets or stored PDFs. |
| FUN-011 | Setup tests distinguish hands-on time, user actions and external propagation time. Repeat-use tests record creative decisions required, support interventions and successful end-to-end completion, not only page-load speed. |
| FUN-012 | No label, marketing claim or rollout checklist treats these five as built, live or proven winners until the corresponding implementation, hosted qualification and performance evidence exists. |

## Current authoring result

This document locks the owner-directed product experience, not the final catalog choices or a delivery date. Existing draft generation is reusable groundwork. The remaining catalog, public funnel, domain onboarding and full payment-comparison work is not implemented by this documentation change. Execute directly with no subagents, preserve pricing and live-provider boundaries, and use sequential security then quality review at each implementation increment.
