# Payment flyers, financing reports, and co-branded property sites

Status: Implementation in progress. The [text-only financing-report increment](financing-report-increment.md) implements the saved comparison and private report/PDF/site subset on a feature branch. The full photo-led, few-click public package remains unfinished.
Priority: Next campaign-product increment, before unrelated ad-library expansion.
Decision date: October 5, 2026. Owner: Jonathan Ferrell. Delivery lead: Chief.
Authoring base: `d5ef89b0`, merged PR #78. This document adds no runtime functionality.

Parent product requirement: [Five finished funnels, not a funnel builder](turnkey-five-funnel-product.md). This payment report/flyer/site is the flagship immediate build within that ready-made marketing experience. Customers must not need to write prompts, choose layouts, use another builder or hire a developer. Domain connection and automatic branding belong to the product, not to a separate client implementation project.

## The outcome

A loan officer receives a property from a Realtor, selects that partner and an approved financing preset, and creates a polished financing comparison in a few actions. That same comparison becomes a report view, a printable co-branded payment flyer, and a matching responsive property website. It answers two separate questions: estimated monthly housing cost and estimated cash needed at closing.

This is not a generic open-house handout with a payment headline added. The report-style comparison is a first-class output. A property financing report must not require an open-house date or force the user through paid-ad setup.

The owner approved retaining the information structure of historical payment flyers while replacing the dated presentation. The owner also requested a modern co-branded site, not merely a PDF embedded in a webpage. The implementation choices and test thresholds below are proposed delivery specifications, not claims that the owner approved every technical detail.

## Reference provenance and usage rights

Historical owner-supplied examples establish the workflow and information architecture: property photography and description, lender and Realtor identity, multiple financing scenarios, a cash-to-close section, a housing-expense section, and disclosures. Their historical prices, rates, APRs, program terms, photographs, logos, and contact data are not current defaults or licensed shared-product assets.

Additional client-provided examples establish a separate category: non-rate, educational/program marketing with prominent photography, structured content, and reusable professional-identity footers. Some source templates have a client/team-only usage restriction. Keep any permitted client-specific use isolated to that client. Do not copy their artwork, copy, lender-product claims, headshots, logos, or restricted template layouts into the generic catalog.

This repository is public, even where a folder is named `knowledge/private`. No source email, attachment, collaboration-token URL, private reference image, or identifiable client financial data belongs in this change. Original platform layouts and authorized workspace assets are the deliverables. A live implementation must enforce template entitlement on the server, not only by filtering the template picker.

## Few-click workflow

### One-time setup

Save the loan officer's approved branding, company identity, headshot, logo, contact channels, license disclosures, and approved destinations. Save each Realtor's name, brokerage, headshot, personal/company logos, contact details, and permission status. Configure workspace-specific financing presets with their allowed programs, input requirements, source, reviewer, validity window, and disclosure version.

A preset is a reusable scenario configuration, not a permanent interest rate or a guarantee that a borrower qualifies. Do not silently inherit historical example values, pretend a stale rate is current, or skip missing setup to achieve a low click count.

### Repeat use

1. Choose an existing property or enter/import one through an authorized source; confirm its facts and photos.
2. Choose the saved Realtor and the eligible scenario preset. Show all supplied financial inputs and what is still missing without making the user rebuild the layout.
3. Select **Generate package**. Offer **Report**, **Flyer**, and **Website preview** from the same saved result. Approval and public release are distinct actions.

For a complete saved property, saved partner, and current preset, target three primary actions after opening the campaign screen and no repeated brand/photo/fee entry. Measure actual interaction count, correction rate, and generation latency. New-account setup and genuine missing inputs are not included in the three-action claim and must be explained in the UI.

## Outputs and visual direction

| Output | Required experience |
| --- | --- |
| Financing report | A readable, responsive comparison with separate financing assumptions, cash-to-close and housing-expense groups. Three default scenarios and support for up to five, including more than one scenario within the same program. This is a campaign report, not a restored CRM analytics page. |
| Printable flyer | Original photo-led layout, short property copy, clearly aligned comparison columns, equal-care lender/Realtor identity panels, and readable disclosures. A standard three-scenario layout should fit a practical print page. Four/five scenarios can use an explicit landscape or extended-report option rather than microscopic text or silently missing rows. |
| Co-branded website | Property gallery, address/price/facts, concise narrative, the same financing comparison, expandable details, Realtor and loan officer contact panels, approved calls to action, and a report download. It must be an actual mobile-first reading experience, not an embedded image or PDF. |

Use the current product design system for the builder. For original collateral, use a clean white base, restrained approved brand accents, strong typography, generous spacing, and tabular-number alignment. Property imagery should lead; an oversized logo must not overwhelm the listing or comparison.

Place estimated monthly housing payment and estimated cash required prominently in each scenario, then retain the supporting breakdown directly below. Do not imply that the lowest displayed payment is the recommended loan. Keep loan term and down payment visible so a comparison is not misleading by omission.

At mobile widths, use stacked scenario cards or an accessible scenario switcher with the same complete rows. A wide report table may remain available as an alternate view, but the default must not demand pinching to read. The website and PDF may arrange information differently while reading the identical saved values.

## Information architecture

The following groups preserve the approved historical report structure. Proposed additional detail must remain distinguishable rather than changing the meaning of the original totals.

| Group | Required fields |
| --- | --- |
| Property | Address; purchase/list price and whether they differ; beds, baths, area where supplied; short description; authorized hero/gallery photos. Open-house timing is optional. |
| Scenario assumptions | Program and scenario label, down-payment amount/percentage, base and total loan amount where fees are financed, fixed term, note rate, APR with provenance, quote date and validity, applicable eligibility assumptions. |
| Cash to close | Down payment, itemized closing costs, prepaids/initial escrow, gross funds required, applicable validated credits, deposits/already-paid items, and estimated amount due at closing. Items must be classified so an amount cannot be deducted or financed twice. |
| Housing expense | Principal and interest, property taxes, homeowners insurance, applicable mortgage insurance, HOA and other supplied recurring housing items, with an estimated total. Show whether an item is escrowed or paid separately. |
| Both brands | Name, company/brokerage, approved headshot/logo, phone, email, website/contact destination, and relevant license information. An absent asset is an explicit setup issue or an intentional text-only choice, never a substituted identity. |
| Review | Source/input versions, calculation version, template version, media hashes, disclosure version, reviewer, approval timestamp, quote validity, and publication status. |

The historical combined taxes/insurance/MI row can be available as a compact view, but the expanded report needs the individual components. Unknown is different from zero: the builder must not produce a complete-looking total from incomplete required amounts.

## Financial-input and calculation boundary

These are engineering requirements, not verified program guidelines or legal advice. Do not promote program claims from source artwork into eligibility rules. Before implementing each financial product, verify current official program requirements and the participating lender's permitted assumptions.

Initial target: ordinary fixed-rate purchase comparisons labelled conventional, FHA, and VA, plus multiple down-payment variants. Unsupported products, temporary buydowns, layered assistance, variable payments, and unusual structures must be refused or deferred explicitly, not approximated by relabelling a fixed-rate loan. Non-rate educational templates remain a separate family with their own approved copy.

Use tested deterministic arithmetic and controlled input schemas, not model-generated numbers. AI may assist with a property description, but not fabricate an interest rate, APR, mortgage insurance quote, tax estimate, funding fee, credit, program eligibility, or cash-to-close amount.

Reuse and qualify the existing fixed-rate arithmetic in `packages/domain/src/homeowner-finance.ts` where appropriate. It currently estimates a scheduled balance/payment only; it is not an APR, FHA/VA, mortgage-insurance, or cash-to-close engine. Add a dedicated financing domain module and independently checked test fixtures instead of treating that helper as a complete quote system.

Store currency as integer minor units with documented rounding. Keep base principal, financed charges, cash-paid charges, credits, and previously paid items distinct. Preserve precision through the calculation and apply display rounding consistently. Clearly identify excluded recurring expenses and do not relabel a principal-and-interest-only figure as total housing expense.

APR must come from a validated calculation with complete inputs or an explicit, verified lender/quote source with its own provenance. Never substitute the note rate or guess a spread. A missing or expired required APR, quote, disclosure, or fee assumption must block the rate-bearing public release and explain the correction needed; incomplete private drafts may remain inspectable.

## Shared result and storage

One immutable `FinancingComparisonSnapshot` belongs to a property campaign version. Proposed fields include a schema version; tenant and actor references; property and co-brand identity versions; media object references/hashes; scenario inputs and calculated results; calculation/preset/template/disclosure versions; quote source and expiry; and review/publication references.

Report, flyer, and website consume that snapshot. Do not calculate separately in the browser, PDF template, and public route. Changing a price, rate, cost, photo, partner, or disclosure creates a new version and invalidates relevant approval. It must not silently rewrite a previously approved document.

Use the existing private media/object-storage boundaries for photographs and finished media. Do not extend the text/vector-only `campaign.property_campaign_packages` row into a base64 photo store; its current size and schema contracts remain supported. Author additive storage/contracts only after inspecting the existing adapters and migration history. Keep older packages readable.

Asset handling must validate type and decoded size, strip unnecessary metadata, enforce ownership and usage rights, and reject arbitrary server-side fetch targets. Importing another product's listing data or media requires an explicit authorized handoff, not sharing that product's database credentials or copying its tables.

## Approval, site sharing, and HighLevel

Saved draft, generated private package, approved package, and published site are different states. An approval binds to the exact input, calculation, template, disclosure, media, and output hashes. Reviewers see the actual outputs and assumptions, not only a filename or a green status.

The public website is an explicit safe projection of an approved snapshot. It must not expose internal version documents, private borrower details, auth cookies, or a raw storage bucket. Once a quote expires or approval is revoked, stop presenting it as a current financing offer; show a clear unavailable/expired state or an independently approved non-rate property view. Previously downloaded PDFs cannot be recalled, so their issue/validity dates and estimate notices must remain visible.

The customer-facing QR must resolve to the approved co-branded site on an allowed origin and work without a workspace login. Keep the existing internal-review QR private until that path is proven. Public rate-bearing release requires the lender/compliance review and input evidence appropriate to the channel; this brief does not grant that approval or declare legal compliance.

Calls to action should distinguish requesting property information from requesting a personalized financing review. Capture only the approved form fields and consent, route to the correct HighLevel location, record property/partner/campaign attribution, and validate the actual handoff. Do not create a second CRM, send a customer message automatically, publish paid ads, or turn a site visit into an application or funded-loan claim.

Template rights need three explicit scopes: original platform templates, workspace-owned templates, and separately licensed templates with an allowed-workspace list. Deny unauthorized preview, download, duplication and generation, even when a user knows a template ID. A client-specific logo, program or disclosure must not leak into another workspace's output or generic sample data.

## Delivery sequence

| Increment | Deliverable | Evidence before completion |
| --- | --- | --- |
| 1. Source/input foundation | Proper financing campaign type, saved co-brand/media inputs, versioned scenario presets and deterministic calculation contract | Missing/zero distinction, one-to-five scenario validation, verified fixtures, role/tenant checks, replay tests, legacy compatibility |
| 2. Report and print | Original financing report UI, clean flyer template, shared result projection and real PDF | Same numbers/labels/version across screen and PDF; visual inspection, extraction checks, print overflow, mobile accessibility, uncertain-save recovery |
| 3. Website and review | Responsive co-branded site preview, exact-output approvals, revocation/expiry, correctly scoped templates | End-to-end review and version invalidation; cross-tenant and restricted-template denial; expired quote behavior; actual brand/media readback |
| 4. Public release and lead path | Approved public projection, valid public QR, authorized form/HighLevel handoff | Hosted sign-in-free site and QR proof, verified tenant-correct lead, duplicate-write/consent checks, no unauthorized side effects, release sign-off |

Implement directly on an isolated branch from current main. No subagents. Use existing rendering/storage/persistence and UI foundations; do not replatform, broaden paid-ad co-branding, alter pricing, or disable the working ad library. Security self-review precedes quality self-review, and neither is represented as independent review. Provider and public activation remain separate release actions.

## Acceptance criteria

The rows below define the full product proof. The [current increment's scope table](financing-report-increment.md#scope-traceability) distinguishes delivered subsets from pending photo, preset, approval, domain and provider work. A document, attractive mockup, generated reference, or passing inherited test does not satisfy a product criterion.

| ID | Required proof |
| --- | --- |
| PAY-001 | A saved property, saved partner and valid preset yield a private package within three primary actions, without retyping brand/contact/fee data. Missing setup explains why that path is unavailable. |
| PAY-002 | A financing campaign can be created without an open house or paid-ad configuration. Existing open-house and library-ad campaigns remain usable. |
| PAY-003 | One to five scenarios are supported, including multiple variants of one loan program. The report retains assumptions, cash-to-close and housing-expense sections. |
| PAY-004 | Monthly and cash totals reconcile to classified line items with tested cent-level calculations, zero-rate coverage and explicit handling of excluded or missing data. No financed or credited item is counted twice. |
| PAY-005 | Missing, unverified or expired quote/APR/disclosure inputs cannot become an approved public financing example. Historic values and third-party program copy never become default eligibility rules. |
| PAY-006 | Both identities, logos, headshots and contact details load from the permitted saved versions. A partner switch clears the relevant consent/approval and cannot leak the prior identity. |
| PAY-007 | Uploaded/imported property images use safe, tenant-correct storage, verified media types and recorded usage rights. No stock property is silently substituted. |
| PAY-008 | Report, PDF and site display the same saved input/result values, calculation version and validity dates. Later edits do not rewrite approved artifacts. |
| PAY-009 | Desktop and mobile layouts preserve every row without unreadable scaling or clipped disclosures. Three-scenario print output and explicit four/five-scenario variants are inspected with long names and realistic long copy. |
| PAY-010 | Actual page, PDF and QR bytes are generated and verified; hashes bind the approved package. Failed generation leaves no partial ready state and exact/concurrent retries reuse one completed package. |
| PAY-011 | A material input, media, identity, template or disclosure change invalidates approval. Expiration and revocation prevent an outdated financing view from appearing current. |
| PAY-012 | A public QR decodes to the actual approved co-branded site, without a workspace login, private data or bearer credential. Private-preview QR behavior remains distinct. |
| PAY-013 | The correct HighLevel location receives the authorized lead with campaign/property/partner attribution and consent. Retries do not duplicate the lead/handoff and no unapproved message is sent. |
| PAY-014 | Knowing another workspace's campaign, template or media ID never grants access. Licensed/client-only templates cannot be previewed, copied, rendered or downloaded by an unentitled workspace. |
| PAY-015 | No restricted reference artwork, source email, collaboration URL, identifying customer example or source-client copy is committed to this public repo or generic fixture catalog. |
| PAY-016 | Type, calculation, authorization, real-PostgreSQL, browser, image/PDF and deployment checks pass at the implemented scope. The report states remaining provider, rights, lender and release gates without invented completion. |

## Integration points and unresolved release inputs

Inspect and extend, rather than overwrite: `packages/domain/src/homeowner-finance.ts`; `packages/contracts/src/campaign-foundation.ts`; `apps/web/src/features/workspace/model.ts`; `apps/web/src/features/property-campaigns/`; `apps/web/src/server/property-campaign-save.ts`; `apps/web/src/server/property-package-*`; `apps/web/src/server/campaign-page-data.ts`; existing private-storage adapters and campaign approval/HighLevel boundaries. A dedicated financing blueprint and separate co-brand contract are preferable to making lender-only ad identity carry Realtor data.

Still to resolve before corresponding public release: authoritative rate/APR and MI/fee sources, permitted loan structures and assumptions, default preset owners/expiry, approved disclosure versions, original template visual sign-off, media permissions and storage setup, public origin/routing, and verified HighLevel installation/consent requirements. These do not prevent local synthetic development, but must not be invented by the implementation.

## Historical authoring result (PR #79)

This brief records the approved user outcome and proposed engineering specification. No payment calculator, report UI, flyer, public site, upload capability, live rate source, or provider integration was added by this authoring change. The previous PR #78 package remains the text/vector internal-review implementation until the increments above are delivered.
