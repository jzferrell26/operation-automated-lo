# Financing report increment: saved calculations and private outputs

Date: October 6, 2026. Owner: Jonathan Ferrell. Implementation and direct self-review: Chief.
Base: `0d2187a5`, merged PR #79. Branch: `chief/financing-report-2026-10-06`.
Rebase update, October 6: PR #81 now includes `main` at `4afdda8a` (merged PR #80). The studio UI and financing implementation are both retained. The dependency lockfile and version-scoped security overrides are unchanged from that new base; duplicate feature-branch overrides were unnecessary and removed.
Status: Implemented on the branch; verification and review are recorded in the associated QA report. Not merged, deployed or approved for public use.

## What this increment delivers

The [payment/report/site requirement](payment-flyers-and-co-branded-sites.md) now has a working financing comparison, rather than an open-house document with invented event dates. The new `/marketing/campaigns/financing` screen saves one to five fixed-rate purchase scenarios, a property, the author's saved lender identity and the selected saved Realtor identity. It has no ad-budget step and requires no open-house time.

The saved campaign displays the historical three-group structure: financing assumptions, cash to close, and housing expense. The report, a responsive private site preview and a downloadable print report all read the same saved inputs and calculated results. The report is linked from the existing property preparation page, and saved reports remain available through Campaigns. Home and the ad-library journey are not replaced.

An author can reuse a previous own comparison, including its cost items and property information. Quote confirmations, marketing permissions and the form's complete-cost confirmation are cleared for review. Original quote issue/expiry instants are retained when the displayed date is unchanged, including intraday and offset timestamps. Reuse is not a rate refresh, approval transfer or a centrally managed preset.

## Deliberately unfinished parts

This is a text-only report increment. It does not yet implement authorized photography uploads, headshots, logos, a final one-page photo flyer, a named lender-reviewed preset library, exact-output approval, a public property URL/QR, domain onboarding, or actual HighLevel lead capture. It does not deliver the five-funnel catalog. All outputs remain private illustrations with explicit notices, not finished consumer marketing.

The PDF is a readable multipage comparison with a supporting quote/cost appendix. Four or five scenarios use landscape. It is not represented as the final photo-led flyer or a tagged/PDF-UA document. Unsupported font characters return a clear failure without removing the original saved text; the report and HTML remain available.

## Financial contract

`packages/contracts/src/financing-comparison.ts` validates the input and result shapes. `packages/domain/src/financing-comparison.ts` performs deterministic arithmetic, reusing the existing fixed-rate amortization helper. Currency is integer cents. Rates use thousandths of one percent and down payments use basis points. The form parses decimal strings directly into scaled integers, so an empty input does not become zero and excessive decimal places are not silently rounded away.

A supplied upfront program fee is either cash-paid or financed into principal. Ordinary cost items are classified as closing costs, prepaids or initial escrow. Items paid before closing remain part of gross costs and are subtracted once, along with the deposit. Credits cannot exceed the supplied costs, and negative cash-back scenarios are refused rather than clamped to zero. Unknown required amounts produce incomplete totals, not optimistic totals with missing components treated as zero.

Rates, APRs, program fees and mortgage insurance are supplied by the author from a stated quote source. This is not a pricing service, APR calculator, program-eligibility engine or buydown model. Unsupported structures are refused. Conventional scenarios cannot finance ordinary costs through the program-fee input. VA monthly mortgage insurance is zero or unconfirmed, not an invented charge. These checks do not independently qualify a borrower or certify the lender's entered figures.

Future-issued quotes are refused. Expired or unconfirmed inputs remain inspectable in private drafts with warnings. No financing campaign can pass the existing ad-style approval path: preflight blocks it, and approval-snapshot construction independently refuses this blueprint even if an internal caller supplies a forged passing preflight. Public rate-bearing approval remains separate work.

## Authoritative source checks

The following current public references informed the engineering boundary, not a claim of legal certification or imported lender eligibility rules:

- [VA funding fee and closing costs](https://www.va.gov/housing-assistance/home-loans/funding-fee-and-closing-costs/), checked October 6: distinguishes funding fees from other closing costs, purchase-loan financing of that fee, and the absence of monthly mortgage insurance. No default funding-fee percentage was copied into this product.
- [CFPB Loan Estimate explainer](https://www.consumerfinance.gov/owning-a-home/loan-estimate/), checked October 6: supports keeping loan terms, mortgage payment, estimated housing expenses and cash to close distinguishable. The generated report explicitly says it is not a Loan Estimate.

The numeric regression fixtures are fictional illustrations, not live rates, actual borrowers or current lender offers. The financial assertions compare explicit supplied inputs and independent amortization reference values.

## Persistence, versioning and access

The new `financing-comparison` manifest is a third strict campaign blueprint. It uses the existing campaign version table and principal-bound repositories; no new migration is required. It stores the property, both textual identities/contact details, source quote inputs, calculated results, calculation version, template version and request hash. Existing library and property-package manifests remain supported.

Deployment compatibility is not the same as a schema migration: after financing records exist, a pre-financing application binary cannot parse the new manifest type. Roll forward with the new reader retained, or disable creation in a compatible build; do not roll back to an older reader or delete saved reports to make that reader work. Qualify any rollback build against all three persisted blueprint types before use.

The save boundary verifies the session and mutation role before reading the bounded request. Browser-supplied tenant, actor, branding, calculated-result, approval or publication overrides are refused. Workspace preferences are read once to capture a consistent brand/contact snapshot. Unknown partners and missing saved branding are explicit errors, not synthetic fallbacks for a real account.

Tenant/actor-scoped retry identifiers reuse the saved version on exact replay. Changed request content is refused. Real PostgreSQL tests exercise five concurrent first saves and verify one campaign version. Source and calculation hashes are checked again for report, output and reuse reads. Later brand changes do not alter the saved comparison or deterministic PDF bytes.

The PDF is rendered on authenticated request from versioned saved input, not stored as a newly approved artifact. Template `1.0.0` must remain supported when future renderers are introduced. The HTML's expired-status warning is evaluated at read time while the underlying quote values remain unchanged. No output is presented as an immutable approved public package.

GET output routes require a verified read session and tenant access. Responses are private/no-store/noindex. HTML encodes all supplied text, contains no scripts, remote images or forms, and uses the existing hashed-style content-security policy. PDF work is limited to two concurrent renders per process. This is not a distributed creation quota; general-release quota and data-lifecycle follow-ups remain open.

## Scope traceability

| Parent criterion | Result in this increment |
| --- | --- |
| PAY-001 | Reuse of an author's previous setup works; the complete saved-property/media/approved-preset three-action promise is not yet delivered. |
| PAY-002 to PAY-004 | Standalone financing type, one-to-five scenarios and tested cent-level monthly/cash accounting are implemented. Qualification is recorded in QA. |
| PAY-005 | Explicit quote source/validity, missing APR and private-review barriers exist. A public approval/release path is not implemented. |
| PAY-006 / PAY-007 | Saved names, companies and contact information work. Media, headshots, logos and full partner licensing remain later work. |
| PAY-008 / PAY-009 | Shared values and responsive text report/site plus print report are implemented. Final photo layout and visual sign-off remain open. |
| PAY-010 to PAY-013 | No public QR, sealed approved media package, public website, domain or HighLevel handoff is claimed. |
| PAY-014 / PAY-015 | Tenant/role access and source privacy are preserved. No restricted templates or external client assets are used. Full licensed-template/media handling remains later work. |
| PAY-016 | Local code, database and browser evidence is scoped in QA. Hosted release and complete-product evidence are not inferred. |

## Supporting maintenance

The financial term `principal and interest` is now explicitly allowed by the customer-vocabulary guard, while authentication-principal wording remains blocked. Tests exercise both cases. Shared Select layout and signed-session test fixtures replace duplicated setup rather than relaxing the zero-duplication gate.

Browser helpers now use the configured test origin, and an optional project-local synthetic store override stays within the checkout's `test-results` directory. The default runner behavior and off-origin blocking remain unchanged. This permits an isolated verification port without stopping another workflow or swapping that workflow's local data.

Security verification also found two transitive advisories. Exact patched overrides for `source-map-js@1.2.2` and `proxy-addr@2.0.8` replace vulnerable versions, with lockfile integrity recorded. The existing single development-only `braces` advisory exception is unchanged; no new audit exception or release-age exception is added. See the security report for primary advisory references and fresh results.

## Delivery boundary

This branch does not change hosted data, DNS, deployment settings, prices, billing, live ads or customer messages. No subagents were used. Source-client templates, correspondence and collaboration links remain outside this public repository. The next product layer is authorized media and reusable reviewed presets on top of the now-functioning comparison, followed by exact-output/public-domain qualification.
