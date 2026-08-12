# 2026 Build Readiness and Research Gate

Research decision date: July 20, 2026.

## Verdict

The public-source research pass is complete for the PRD-001 product and construction architecture. It confirms that HighLevel exposes the installation, embedded UI, CRM, ad draft, explicit ad publish, and reporting surfaces required by Operation Automated LO. It also defines the deployable units, repository topology, tenant database, runtime contracts, durable work, rendering, delivery, testing, observability, and recovery model needed to construct the system.

Production feature implementation is not yet authorized because G1 through G7 remain blocked. Public documentation cannot prove several account-state and policy behaviors. The authorized next technical phase is Phase 0: the platform scaffold, golden rendering fixtures, security harness, and time-boxed HighLevel App Test integration harness defined in the construction documents. Production feature implementation begins only after each of G1 through G7 is marked `PASS`, `ACCEPTED CONSTRAINT`, or `DEFERRED OUT OF CORE` by its named owner.

On July 20, 2026, the product owner explicitly directed: "Proceed, we are moving without the 15 paid founders." G8 is therefore `ACCEPTED CONSTRAINT`, never `PASS`. No evidence of 15 paid founders exists, and commercial validation remains unproven. The 15-paid-founder threshold is a post-start commercial validation target, not an implementation prerequisite. This decision does not resolve G1 through G7 or authorize production traffic.

PRD-002 add-ons are not research-complete for implementation as a group. Add-ons that depend on licensed property, valuation, mortgage, or consumer data remain blocked until a provider contract proves permitted use, resale rights, retention, deletion, refresh cadence, and unit economics.

## What research-complete means

Research-complete does not mean every external system is predictable from documentation. It means:

1. Every core dependency has an official primary source or is labeled as an inference.
2. Every behavior that documentation cannot prove has a specific sandbox or review test.
3. Every legal, lender, provider-contract, and Marketplace decision has a named approval gate.
4. Every unresolved item either blocks implementation or is explicitly excluded from the first release.
5. No implementation assumption is silently treated as a confirmed platform contract.
6. A build team has construction specifications for code topology, data, runtime, delivery, operations, and acceptance gates rather than only a vendor list.

The construction specifications are [the system build blueprint](../architecture/system-build-blueprint.md), [the system data model](../architecture/system-data-model.md), [the system runtime contracts](../architecture/system-runtime-contracts.md), and [the system delivery and operations plan](../architecture/system-delivery-and-operations.md).

## Readiness labels

| Label | Meaning |
| --- | --- |
| `CONFIRMED` | Supported by current official documentation and suitable for architectural planning. |
| `APP TEST` | Must be proved in HighLevel App Test and connected Meta test assets before product implementation relies on it. |
| `MARKETPLACE REVIEW` | Requires written confirmation or approval from HighLevel because public documentation does not establish the proposed distribution or permission pattern. |
| `COUNSEL / LENDER` | Requires mortgage counsel or the participating lender's compliance owner. |
| `PROVIDER CONTRACT` | Requires executed data rights and commercial terms. |
| `DEFERRED` | Excluded from the core build. |

## Confirmed 2026 platform findings

### HighLevel installation and application shell

| Finding | Status | Product consequence |
| --- | --- | --- |
| A public third-party application should use HighLevel OAuth rather than a Private Integration Token. | `CONFIRMED` | Use OAuth 2.0 for Marketplace installation, webhooks, Custom Page, and multi-location operation. |
| Direct sub-account install can produce location authority. Agency install can produce company authority that is exchanged for location tokens. | `CONFIRMED` | Support both entry paths, but bind all runtime commands to one active installed location. |
| A Custom Page renders the externally hosted app inside HighLevel. Signed user context is the secure identity handoff. | `CONFIRMED` | Keep the product externally hosted, validate context on the backend, and maintain a first-party authenticated fallback for iframe or cookie problems. |
| Private apps created on or after November 18, 2025 are limited to five agencies unless the app becomes public or passes the available security-review path. | `CONFIRMED` | The founding beta must remain inside the documented cap, then pursue public Marketplace review or the approved security-review path before expansion. |
| Externally billed paid apps use a Billing URL and must report the payment result to HighLevel's billing webhook. | `CONFIRMED` | The install-to-payment-to-authorization path must be tested as one idempotent workflow. |

Primary evidence: [HighLevel authorization](https://marketplace.gohighlevel.com/docs/Authorization/authorization_doc/), [target-user sub-account tokens](https://marketplace.gohighlevel.com/docs/Authorization/TargetUserSubAccount/index.html), [Custom Pages](https://marketplace.gohighlevel.com/docs/2023-02-21/marketplace-modules/CustomPages/index.html), [signed user context](https://marketplace.gohighlevel.com/docs/2021-07-28/other/user-context-marketplace-apps/index.html), [private-app limit](https://marketplace.gohighlevel.com/docs/MarketplacePolicies/PrivateAppInstallLimits/), and [external billing](https://marketplace.gohighlevel.com/docs/oauth/Billing/).

### HighLevel permissions and Meta execution

| Finding | Status | Product consequence |
| --- | --- | --- |
| `adPublishing.readOnly` covers Meta connection, asset, campaign, reporting, and related discovery endpoints. | `CONFIRMED` | Onboarding and reporting can remain read-only until publishing is activated. |
| `adPublishing.write` is broad. It includes Meta draft and publish operations plus destructive operations, audience mutation, other ad channels, integration changes, and reselling actions. | `CONFIRMED` | OAuth consent alone is not adequate authorization. The backend must expose an explicit route and method allowlist and deny every non-core operation. |
| Campaign upsert and campaign publish are separate endpoints. | `CONFIRMED` | Create or update a provider draft, read it back, compare it to the frozen approval, then call publish only after an explicit confirmation. |
| HighLevel exposes publish progress, pause, resume, and reporting endpoints. | `CONFIRMED` | Durable publish orchestration and normalized operational reporting are viable without storing direct Meta credentials. |
| A paired core app and Ads Publisher companion would improve least privilege, but public documentation does not confirm that HighLevel will approve this pattern. | `MARKETPLACE REVIEW` | Obtain written confirmation. If rejected, use one app with the broad-scope disclosure, hard action allowlist, and dedicated security tests. |

Primary evidence: [HighLevel scopes](https://marketplace.gohighlevel.com/docs/Authorization/Scopes/index.html), [Facebook Ad Manager endpoints](https://marketplace.gohighlevel.com/docs/ghl/ad-publishing/facebook-ads/index.html), [campaign upsert](https://marketplace.gohighlevel.com/docs/ghl/ad-publishing/fb-upsert-campaign/), and [explicit campaign publish](https://marketplace.gohighlevel.com/docs/ghl/ad-publishing/fb-publish-campaign/).

### OAuth, webhooks, rate limits, and retries

| Finding | Status | Product consequence |
| --- | --- | --- |
| HighLevel documents one-day access tokens, one-year refresh tokens, refresh rotation, burst limits, and daily limits. | `CONFIRMED` | Treat returned expirations as authoritative, coordinate one tenant-scoped refresh, apply bounded concurrency, and honor rate-limit headers. |
| HighLevel's current webhook verification uses `X-GHL-Signature` with Ed25519. The legacy signature is deprecated on September 1, 2026. | `CONFIRMED` | A new implementation uses Ed25519 from its first commit. Do not add the legacy verifier to new code. |
| HighLevel can pause unhealthy webhook delivery through its circuit breaker. | `CONFIRMED` | Acknowledge only verified events quickly, queue work durably, monitor delivery health, and reconcile critical state by read-back. |

Primary evidence: [OAuth FAQ](https://marketplace.gohighlevel.com/docs/oauth/Faqs/) and [webhook integration guide](https://marketplace.gohighlevel.com/docs/2021-07-28/webhook/WebhookIntegrationGuide/index.html).

### Meta housing and financial-services policy

| Finding | Status | Product consequence |
| --- | --- | --- |
| Ads related to housing or financial products and services require the applicable Special Ad Category. | `CONFIRMED` | The campaign blueprint cannot offer an uncategorized path. |
| Special-category advertising restricts audience selection, and detailed targeting exclusions were removed from active campaigns beginning March 31, 2025. | `CONFIRMED` | Do not build the product around detailed exclusions, protected-class proxies, ZIP targeting, or unsupported custom/lookalike audience behavior. |
| A loan-officer or lender-branded paid campaign can touch both housing and financial-services policy even when the associated property collateral is co-branded. Public HighLevel documentation does not establish the correct category array for every campaign variant. | `APP TEST` and `COUNSEL / LENDER` | Keep Realtor identity out of every paid-ad projection. Validate property-only, mortgage-only, and combined campaigns against the actual HighLevel request contract and Meta test response. Lender compliance approves the supported template. |

Primary evidence: [Meta campaign creation and Special Ad Categories](https://www.facebook.com/help/messenger-app/621956575422138/), [Meta audience guidance](https://www.facebook.com/help/messenger-app/717368264947302/), [Meta discriminatory-practices policy](https://transparency.meta.com/policies/ad-standards/unacceptable-content/discriminatory-practices/), and [HighLevel campaign upsert](https://marketplace.gohighlevel.com/docs/ghl/ad-publishing/fb-upsert-campaign/).

## Recommended production architecture

This is the 2026 reference architecture for the founding product. Vendor choices can change only through an architecture decision that preserves the listed invariants.

| Layer | Decision | Why |
| --- | --- | --- |
| Application | Modular monolith on Node 24 LTS, pnpm, Turborepo, TypeScript 7 after compatibility checks, and Next.js 16.2.10 or a later patched stable 16.2 release at scaffold time | One codebase and shared packages serve the embedded workspace, first-party fallback, approval surfaces, thin API handlers, durable tasks, and public campaign pages. Preview Next.js releases are excluded. |
| Deployment | Vercel for the web application and short request handlers | It provides a straightforward Next.js production target. Keep durable and renderer work outside the browser request lifecycle. |
| Identity | HighLevel signed user context exchanged for a short-lived product session | HighLevel is the authenticated front door. Browser query parameters never establish tenant or role authority. |
| Database | One Supabase Postgres system with an `app_runtime` role, forced RLS, transaction-local location context, Supavisor runtime pooling, direct migrations, backups, and point-in-time recovery | One database scales better than one project per customer. Database policy and application authorization jointly enforce location isolation. Runtime has no table ownership, service-role credential, or RLS bypass. |
| Durable workflows | Trigger.dev tasks with tenant-scoped concurrency plus product-owned command, inbox, outbox, provider-operation, idempotency, and reconciliation records | Durable work and Chromium rendering share one isolated task plane. Trigger.dev supports retries, waits, per-tenant queues, preview branches, and a Playwright build extension, but the product database remains authoritative. Task payloads contain opaque references only. |
| Object storage | One private and one published Cloudflare R2 bucket per environment with immutable tenant-prefixed keys, short-lived presigned transfers, media validation, checksums, and lifecycle rules | Private source assets remain inaccessible publicly. Public campaign assets use versioned immutable projections rather than exposing the source bucket. |
| Rendering | Version-pinned Playwright Chromium installed in the Trigger.dev task image, with bundled fonts, denied arbitrary network access, and deterministic render fixtures | Server-side PDF and screenshot generation reproduces approved artifacts without a third founding deployable. Rendering retains its own memory, concurrency, retry, and task-image boundary. |
| Billing | Stripe-hosted Checkout and Customer Portal for the founding external-billing path, followed by HighLevel billing-webhook authorization | Hosted payment UI prevents raw card data from reaching the product. Marketplace billing can be evaluated after HighLevel confirms the public listing and commercial model. |
| AI | Provider-neutral server-side model router using product-owned API credentials, structured outputs, prompt and model versions, per-location budgets, and a usage ledger | ChatGPT and Claude consumer subscriptions are not product infrastructure. Models draft content only and never determine facts, compliance, approval, budget, or publication. |
| Token security | Per-installation AES-256-GCM envelope encryption protected by environment-specific AWS KMS keys | Provider-token plaintext stays out of the database, browser, task payload, logs, traces, and analytics. Vercel uses OIDC for KMS access. |
| Observability | OpenTelemetry traces, structured redacted logs, error monitoring, audit events, and correlation IDs | Every consequential command is diagnosable across web, tasks, rendering, HighLevel, Stripe, and Meta without exposing secrets or consumer records. |

Primary architecture evidence: [Node releases](https://nodejs.org/en/about/previous-releases), [Next.js releases](https://nextjs.org/blog), [Next.js support policy](https://nextjs.org/support-policy), [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Supabase connection modes](https://supabase.com/docs/guides/database/connecting-to-postgres), [Supabase branching](https://supabase.com/docs/guides/deployment/branching), [Trigger.dev execution](https://trigger.dev/docs/how-it-works), [Trigger.dev tenant queues](https://trigger.dev/docs/queue-concurrency), [Trigger.dev Playwright extension](https://trigger.dev/docs/config/extensions/playwright), [R2 presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/), [Vercel OIDC](https://vercel.com/docs/oidc), [AWS KMS encryption context](https://docs.aws.amazon.com/kms/latest/developerguide/encrypt_context.html), and [Stripe webhooks](https://docs.stripe.com/webhooks).

## Core App Test contract suite

The harness records sanitized request and response fixtures, HTTP status, safe provider IDs, granted scopes, and observed account state. Secrets, tokens, customer data, and live spend are prohibited from fixtures.

### Installation and session

- Direct sub-account install, callback, install event, signed context, session creation, uninstall, and reinstall.
- Agency install, installed-location discovery, location-token exchange, partial bulk install, and removal of one location.
- Scope decline, scope upgrade, refresh rotation, concurrent `401` requests, expired refresh token, and reconnect.
- Embedded Custom Page operation with modern third-party-cookie restrictions and the first-party fallback.

### Meta and HighLevel Ads Manager

- Read connection health, ad accounts, pages, Instagram identities, forms, pixels, budget limits, and targeting options.
- Upsert campaign, ad set, and ad without publishing or spending.
- Read back all approved material fields and compare them to the frozen product version.
- Prove that publish is a separate explicit action and test progress to terminal success and failure.
- Pause, resume, duplicate-as-new-draft, provider rejection, timeout after write, reconciliation, and idempotent retry.
- Verify that product code cannot call deletes, audience-member operations, integration changes, Google, LinkedIn, reselling, or autonomous budget changes.
- Test property-only, mortgage-only, and combined property-plus-mortgage Special Ad Category payloads. Record which category values and combinations HighLevel accepts and how Meta classifies them.
- Verify lead-form mapping and the exact path by which a Meta test lead appears in HighLevel before adding any product-side contact write.

### Billing and Marketplace lifecycle

- Stripe Checkout success, cancellation, duplicate callback, delayed webhook, failed payment, refund, subscription cancellation, and plan change.
- HighLevel Billing URL parameter validation and one billing-webhook authorization per company or location.
- Install without payment, payment without install completion, bulk location billing, uninstall, reinstall, and account transfer behavior.
- Written HighLevel decision on paired core and Ads Publisher apps, requested scopes, public listing path, and internal versus external billing eligibility.

### Webhooks and operations

- Ed25519 signature verification against the raw body, invalid signature, altered body, replay, duplicate delivery, out-of-order delivery, and delayed delivery.
- Fast acknowledgement, durable handoff, bounded per-location concurrency, `429`, transient `5xx`, terminal `4xx`, dead-letter handling, and reconciliation after circuit-breaker interruption.

## Core implementation start gates

| Gate | Evidence required | Owner | Current status |
| --- | --- | --- | --- |
| G1: Distribution contract | Direct and agency App Test pass, plus a written decision on paired apps and the post-five-agency path | Product and HighLevel Marketplace | `BLOCKED: APP TEST / MARKETPLACE REVIEW` |
| G2: OAuth and session contract | Install, signed context, token exchange, refresh, uninstall, reconnect, and iframe fallback tests pass | Engineering and security | `BLOCKED: APP TEST` |
| G3: Meta publish contract | Draft, read-back, approval match, explicit publish, progress, pause, resume, rejection, uncertain write, and reporting tests pass | Engineering | `BLOCKED: APP TEST` |
| G4: Special Ad Category contract | Supported campaign classification and targeting matrix approved from real test responses | Lender compliance, counsel, and engineering | `BLOCKED: APP TEST / COUNSEL / LENDER` |
| G5: Lead routing contract | One no-spend Meta test lead proves form mapping, GHL contact, opportunity, assignment, workflow, notification, and attribution behavior | Engineering and operations | `BLOCKED: APP TEST` |
| G6: Billing lifecycle | Hosted Stripe flow and HighLevel billing authorization pass every listed state transition | Product, finance, and engineering | `BLOCKED: APP TEST` |
| G7: Legal operating model | Terms, privacy, DPA, retention, consent, RESPA, Regulation Z, fair-lending, email, SMS, and lender blueprint approvals are documented | Counsel and lender compliance | `BLOCKED: COUNSEL / LENDER` |
| G8: Demand | At least 15 paid founders accept the defined core offer | Product | `ACCEPTED CONSTRAINT: COMMERCIAL VALIDATION UNPROVEN` |

No feature team should build the production campaign system while any of G1 through G7 remains `BLOCKED`. Production stays unauthorized until each is `PASS`, `ACCEPTED CONSTRAINT`, or `DEFERRED OUT OF CORE`. The App Test harness, golden render fixtures, security threat modeling, and paid-founder demo are permitted because they produce missing evidence rather than depending on it. G8 remains an accepted commercial risk and must not be reported as validated demand.

## PRD-002 add-on readiness

| Add-on | Research state | Requirement before implementation |
| --- | --- | --- |
| Domains and analytics | Architecture known, implementation blocked | Domain ownership, DNS verification, certificate lifecycle, takeover prevention, analytics retention, and paid demand tests. |
| Realtor workspace | Architecture known, implementation blocked | Core tenant and campaign authorization must pass, then collaborator roles and invite lifecycle must pass a dedicated cross-tenant test. |
| Blueprint packs | Product hypothesis only | Each pack needs paid demand, lender/compliance rules, Meta classification where applicable, and current provider contract tests. |
| Financing scenarios | Not provider or compliance complete | Select lender-approved calculations, rate source, timestamp rules, disclosure rules, and liability owner. |
| Homeowner intelligence | `PROVIDER CONTRACT` blocked | Select a licensed property and valuation provider and prove resale, display, storage, refresh, correction, and deletion rights. |
| Refinance signals | `PROVIDER CONTRACT` and `COUNSEL / LENDER` blocked | Select lawful data inputs, permissible purpose, model rules, consumer correction path, refresh cadence, and false-positive controls. |
| Agency portfolio | Depends on core Marketplace approval | Prove agency and location authorization, delegated administration, support boundaries, billing hierarchy, and white-label rights. |
| Creative media packs | Model evaluation incomplete | Select approved media providers, measure cost and failure rates, define moderation and likeness rights, and prove deterministic campaign linkage. |

## Research maintenance

- Recheck HighLevel scopes, Marketplace policy, private-app limits, Ads Manager endpoints, billing, and webhook requirements immediately before implementation and before Marketplace submission.
- Recheck Meta Special Ad Category, audience, lead-ad, and financial-ad rules before each blueprint release.
- Re-run model quality, price, retention, and fallback evaluation before production and at least quarterly.
- Re-run provider-contract review before every licensed-data add-on release.
- Record every changed external assumption in an ADR or PRD revision with its effective date and migration impact.

## Final research conclusion

Operation Automated LO is technically viable as a scalable HighLevel Marketplace application. The correct 2026 build is a shared modular monolith with a web deployable, a durable task deployable, one RLS-enforced product database, immutable object storage, and HighLevel as the CRM and connected-ad authority. It is not a collection of per-customer Lovable deployments and not a direct-Meta credential store. Product and construction research are complete enough to begin the Phase 0 evidence harness and platform scaffold. G8 is an accepted constraint with unproven commercial validation. Production feature traffic remains a no-go until G1 through G7 are resolved.
