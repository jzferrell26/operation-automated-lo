# Homeowner valuation provider plan

> Category: Product operations | Version: 1.0 | Date: October 2026 | Status: Draft

Recommendation prepared after the owner confirmed there is no existing RentCast account and requested a recommendation. This is a proposed operating plan, not purchase authorization or a live configuration change.

**Related:**

- [Homeowner requirement](../../../requirements/in-work/prd-007-homeowner-reports/prd-007-homeowner-reports-index.md)
- [Single-LO direction](../../../requirements/in-work/prd-007-homeowner-reports/single-lo-owner-direction-2026-10-13.md)
- [Activation runbook](../../../../docs/operations/homeowner-avm-activation.md)

## Recommended account and pilot

Use a platform-owned RentCast API account. Automated LO makes server-side requests and delivers reports through the HighLevel plugin. LOs do not receive the provider key or need an independent RentCast account for this managed feature. Each customer remains one LO in an isolated workspace.

Start with the Developer plan for a controlled qualification. It includes 50 requests per provider billing month. Recommend a 25-attempt allowance for the first enabled pilot workspace, leaving some of the provider allowance for operator qualification and unexpected attempts. Keep all other workspaces disabled. Request outcome uncertainty consumes the application's attempt allowance; this does not assert the provider billed that attempt.

After qualification and explicit purchase authorization, recommend Foundation, currently $74 per month with 1,000 requests and $0.06 per additional request. Recommend a product allowance of 100 fresh valuation attempts per enabled LO per UTC calendar month. This allowance is a proposal, not a subscription price or a purchased entitlement.

Source checked October 14, 2026 UTC: [RentCast API pricing](https://www.rentcast.io/api), [billing behavior](https://developers.rentcast.io/reference/billing-and-pricing). The developer plan also bills overages, currently $0.20 per extra request. Free does not mean unlimited or an automatic spending stop.

## Shared budget before multiple LOs

The completion-resume increment adds a private shared budget alongside the per-workspace allowance, through migration `20261014170000_homeowner_provider_budget.sql`. It remains unconfigured and unqualified on the hosted deployment. Do not infer shared cost protection from ten separate 100-attempt limits or from an unapplied migration. Provider billing periods and the application's UTC calendar months can differ.

Before enabling multiple workspaces, apply and qualify that increment and bind its period to the actual provider billing cycle. It reserves the shared slot in the existing database transaction before manual or scheduled network attempts, refuses exhausted budgets, and preserves committed uncertain attempts. Follow [the operator configuration procedure](../../../../docs/operations/homeowner-avm-activation.md#configure-the-shared-provider-budget). A proposal for Foundation is a maximum of 900 application attempts in its provider billing period, leaving 100 included requests for controlled qualification and reconciliation. This remains a proposal, not an activated cap. All other uses of the provider key must also be counted or isolated. An application cap cannot guarantee a provider bill if callers use the key outside that accounting boundary.

At 100 requests per LO, nine fully utilized LOs use that proposed 900-attempt application budget. This is arithmetic, not a prediction that every LO will use the full allowance. Upgrade only from observed aggregate usage and an approved budget; do not silently bill customers or buy a higher provider plan.

## Existing report behavior

The first report calls only `/v1/avm/value`, requesting subject attributes and five comparable listings. It does not retrieve unrelated owner records or make a second rental lookup. Viewing a saved report, creating its PDF, and exact command retries reuse saved data. The current cache can reuse a fresh valuation for 30 days within the same workspace; an explicit value refresh authorizes another attempt.

The existing code reserves usage before the provider call and does not automatically repeat an uncertain lookup. Mortgage balances are confirmed input, not a RentCast-supplied claim. The report retains its estimate range, source dates and missing-input explanations.

Code references: `apps/web/src/server/homeowners/runtime.ts`, `rentcast.ts`, `service.ts`, `scheduler.ts`, and `packages/db/src/homeowner-repository.ts`. The monthly workspace limit defaults to zero. No provider key, live enable flag, allowance, hosted migration or delivery setting was changed for this recommendation.

## Data rights and activation

RentCast documents commercial applications, data storage and distribution to end users as permitted uses, subject to its API terms. The key must remain confidential and cannot be distributed to customers for independent use. This supports a platform account serving branded reports; it does not make the estimate an appraisal or supply lender-approved loan inputs. References: [data licensing](https://developers.rentcast.io/reference/introduction) and [API terms](https://www.rentcast.io/terms-api), checked October 14, 2026 UTC.

The account owner should create the API account and accept its terms, then provide the credential through the deployment's server-side secret interface. Qualify one known address with authorized data, confirm the returned address and listing comparables, reload the saved report and PDF, retry the original request, and verify provider usage. Follow the existing activation runbook and retain the evidence before enabling more workspaces. HighLevel contact and workflow connection is required only for linked reports and authorized delivery.

## HighLevel QR direction

The owner reminded us that Automated LO is a HighLevel plugin and can use HighLevel's QR capability. Prefer an approved listing URL that the LO can use in HighLevel Sites > QR Codes. Do not add a separate QR management screen. HighLevel documents PNG, SVG and PDF downloads and mutable dynamic destinations. A public generation API has not been established by this review, so automatic creation is not claimed. A later financing flyer that incorporates an external QR requires actual destination and artifact proof; a dynamic code cannot guarantee that a subsequent external edit preserves its destination.

Reference: [HighLevel QR generation and download](https://help.gohighlevel.com/support/solutions/articles/155000004583-qr-code-generation-and-download-guide), checked October 14, 2026 UTC.
