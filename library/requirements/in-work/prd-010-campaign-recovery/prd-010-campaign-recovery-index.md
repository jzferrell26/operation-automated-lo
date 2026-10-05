# PRD-010: Campaign recovery

Status: In work. Owner: Jonathan Ferrell. Implementation lead: Chief.
Decision date: October 5, 2026. Base: `adeed9e0`, PR #75, fetched from `origin/main`.
Branch: `chief/campaign-recovery-2026-10-05`.

Latest October 5 owner direction: [Five finished funnels, not a funnel builder](turnkey-five-funnel-product.md) is the primary product contract. AutomatedLO must include five complete ready-made journeys in the customer's branding, with guided domain setup and verified lead handoff rather than creative work, prompting or developer hiring. The payment/report/site below remains the flagship immediate increment. Exactly five is specified; the final named roster and performance evidence are not yet established. This supersedes a toolbox-first experience, not provider safeguards or the existing working ad library.

October 5 owner clarification: [Payment flyers, financing reports and co-branded property sites](payment-flyers-and-co-branded-sites.md) are the next campaign-product priority. Preserve the original financing-assumptions, cash-to-close and housing-expense comparison, with a clean photo-led design, reusable dual-brand profiles and a few-click workflow. Report, PDF and responsive site must consume the same saved comparison. This is an approved outcome and an authored implementation brief, not a completed feature. PR #78 is now merged as `d5ef89b0`; its text/vector draft package is the starting point, not this payment system. The Batch B entries below retain their implementation-era context.

Batch A passed `pnpm verify:offline` and Jonathan merged PR #76 on October 5 at 15:04:43 UTC, main commit `0b47805e`. Merge is verified; hosted deployment is not implied. [Batch B](batch-b-campaign-package.md) now connects private page, flyer, QR and copy outputs to the saved campaign. The earlier [QA record](qa/2026-10-05-qa-report.md) remains a historical snapshot of Batch A's verification and release holds.

Batch B's implementation and configured offline gate are complete, with additional real-PostgreSQL and rendered-file evidence in the [package QA report](qa/2026-10-05-package-qa-report.md). The continuation branch is `chief/campaign-package-2026-10-05`. [Deployment notes](deployment.md) require the new additive migration before hosted generation. Batches C through F remain subsequent product work; a private draft package is not a public campaign.

## Outcome

Turn one property and one Realtor relationship into a complete, reviewable marketing campaign connected to the loan officer's existing HighLevel account. One campaign owns its inputs, collateral, separately branded paid promotion, approvals, follow-up handoff, and outcome evidence. HighLevel remains the CRM.

Open House Boost is the first underlying blueprint, not the whole product. The interface may call it a property campaign. A collection of ad templates is a useful capability, not the complete product outcome.

## Why this direction changes

Jonathan delegated recovery on October 5 after reviewing the original July product goal. This is a new direction, not evidence that Claude ignored instructions. PRD-009's October 1 OD-H explicitly requested the curated ad library and removed property intake. Its lighter interface, six-section navigation, no-CRM boundary, curated library, and saved homeowner reports remain useful and stay.

The earlier conversation also incorrectly identified lender-only paid ads as drift. Preserve compliance control 9: Realtor co-branding is for permitted collateral only. Paid ads retain a separate loan-officer or lender identity and their own review. This recovery does not authorize co-branded paid ads.

## Authority and limits

This decision supersedes PRD-009's library-only product scope and permanent removal of property intake for work explicitly delivered here. It does not erase historical criteria, pretend older tests covered this flow, reinstate the deleted CRM pages, or roll back PR #75 wholesale. Historical records remain historical; this document is the current recovery brief.

Preserve G1, G4, and G8 as accepted constraints. Do not restore public Marketplace distribution or fifteen paid founders as prerequisites to local product work. Commercial validation remains unproven. Existing live-provider, lender-review, data-rights, and launch gates remain unresolved until supported by evidence.

Work directly and sequentially in the isolated recovery worktree. Do not spawn agents, reset other worktrees, change dependency versions, copy credentials, apply hosted migrations, change hosted environment variables, merge, publish ads, spend money, send customer messages, or activate billing in this batch. Use the existing application, database contracts, and design system rather than creating another stack.

## Recovery sequence

| Batch | Deliverable | Proof required |
| --- | --- | --- |
| A, merged | Authenticated property-campaign preparation, saved branding and partner selection, immutable draft persistence, and a revisitable campaign record with honest missing-output states | Successful save and reload through the actual handlers; validation, permissions, replay protection, and UI tests; no invented routing or rendered assets |
| B, current | Connect the existing page, PDF, QR, and copy generation components to that same campaign record | One representative property produces inspectable outputs from the same frozen inputs; failures are recoverable and never labelled complete |
| Payment package, next | Photo-led financing report, co-branded payment flyer and matching property-site experience, per the owner clarification | PAY-001 through PAY-016; tested inputs/calculations and identical saved values across outputs. No generic reuse of client-restricted source templates. |
| C | Exact-output review and separate collateral/paid-ad approvals, integrated with the payment-package release | A material change invalidates the relevant approval; no generated reference is mistaken for an approved artifact |
| D | Verified HighLevel installation, lead handoff, and campaign attribution | Authorized test lead, tenant-correct contact/opportunity/workflow evidence, no duplicate writes, and actual campaign-linked outcome reads |
| E | Explicit Meta draft, read-back, publish, and results | Authorized provider contract tests, current lender/provider review, separate launch confirmation, bounded spend, and recorded results |
| F | Make the proven campaign path the default first-run experience and validate the founding offer | New-account journey proof, visual sign-off, support burden measured, and commercial evidence rather than assumed demand |
| Five-funnel completion | Provision the selected finished journeys, guided custom domain and outcome-first Home experience | FUN-001 through FUN-012; complete branded visitor and lead journeys without client-side design or external developer work. No fake winner claim or automatic provider activation. |

Batch A is preparation, not a completed campaign and not a launch-ready product. Do not replace the existing default experience with another unfinished promised workflow before the generated-output path is proven. The curated ad path must remain functional throughout recovery.

## Batch A acceptance criteria

| ID | Criterion | Evidence |
| --- | --- | --- |
| REC-001 | A separate property preparation route uses the existing authentication, role, request-origin, and tenant boundaries. Browser-supplied tenant, actor, brand, routing, or approval fields are refused. | Handler and schema tests |
| REC-002 | Brand and partner identity are read from saved workspace data on the server and frozen into the campaign. Missing brand or an unknown partner cannot be silently substituted. | Persistence tests |
| REC-003 | Property address, description, state, and explicit event times are validated. Permission checkboxes start unconfirmed; selecting a partner is not consent. | Schema and form tests |
| REC-004 | Repeating the same save does not create another campaign. Reusing its request identifier for different content refuses the write and preserves the saved record. | Replay tests |
| REC-005 | The campaign persists in the existing campaign store and is readable at its own authenticated address. Older manifests and the curated library remain supported. | Read-model and regression tests |
| REC-006 | No photo, page, PDF, QR destination, ad, permission, approval, or working lead route is invented. Reserved references are not generation evidence. Routing remains missing and publication remains unauthorized. | Contract, handler, and UI tests |
| REC-007 | The saved campaign shows the full intended outcome and distinguishes saved preparation from outputs not generated and connections not verified. It does not add CRM pages or fake metrics. | Component and browser checks |
| REC-008 | Validation failures and uncertain network responses preserve the user's inputs. The form prevents duplicate submissions and offers a safe path to the campaign list. | Interaction tests |
| REC-009 | Security self-review precedes quality self-review. Verification reports distinguish local tests, hosted checks, CI, and work not run. | Dated recovery report |

## Initial audit evidence

- `library/knowledge/private/product/product-definition.md`: original job and outcome, with the later OD-H supersession retained.
- `library/requirements/completed/prd-009-marketing-toolkit/prd-009-marketing-toolkit-index.md`: owner decisions, boundaries, and deliberate removal of property intake.
- `apps/web/src/server/open-house-draft.test-support.ts`: the old compiler now exists only as test support and records a local routing reference as valid. Do not restore that assertion into the new preparation path.
- `apps/web/src/server/campaign-preflight-handler.ts`: the current creation endpoint accepts only library ads.
- `apps/web/src/server/campaign-persistence-runtime.ts`: existing principal-bound campaign persistence to reuse.
- `apps/web/src/server/campaign-page-data.ts`: historical property campaigns currently lose their property context in the displayed projection.

The three PRD-008 hosted migrations are unverified in repository records, not proven absent from the hosted database. Provider activation and hosted migration checks are separate from this local batch. No new production-ready claim follows from a passing local test.
