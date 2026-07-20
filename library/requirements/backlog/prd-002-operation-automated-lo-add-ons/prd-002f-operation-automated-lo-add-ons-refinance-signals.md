# PRD-002f: Licensed Refinance Opportunity Signals

> **Status:** Backlog
> **Priority:** P2
> **Effort:** XL (> 3d)

## Goal

Surface explainable, licensed refinance opportunity signals and activate an approved HighLevel workflow without turning Operation Automated LO into a servicing database or automated lending decision system.

## Candidate signals

- Market-rate movement relative to a stored or provider-authorized baseline
- Potential PMI removal
- Potential cash-out equity threshold
- VA or FHA streamline eligibility indicator
- Active-listing or property-event signal when licensed

Every signal is an indicator for loan-officer review, not a promise of eligibility, savings, approval, or available terms.

## Acceptance criteria

- Each signal declares its provider, source fields, refresh time, calculation version, threshold version, confidence, and expiration.
- Provider contracts permit the intended mortgage-marketing and Marketplace resale use.
- Signal evaluation uses only authorized data with a documented permissible purpose and consumer communication basis.
- The UI explains why a signal appeared and which facts require loan-officer confirmation.
- A signal cannot send a message or create an opportunity until the tenant enables an approved GHL workflow and applicable consent rules pass.
- Workflow activation is idempotent and records contact, signal version, actor or policy, workflow ID, and outcome.
- URLs, logs, analytics, and support notifications use opaque identifiers and exclude raw contact, loan, rate, value, equity, and signal-source records.
- Snooze, dismiss, incorrect-data, and provider-disconnect actions are available and audited.
- False-positive rate, contact rate, appointment rate, complaint rate, and opt-out rate are measured before expansion.
- No signal is shown when source data is stale, incomplete, revoked, or below the configured confidence threshold.

## Commercial gate

Require verified provider economics and at least five paid design partners at a provider-cost-plus-$149-to-$299 monthly hypothesis. Kill or reshape if false positives or compliance review make the outreach unusable.

## Out of scope

- Automated loan qualification
- Credit decisioning
- Bulk unsolicited messaging
- Credit-report or bank-data ingestion
- Independent borrower database

## Related

- [PRD-002 index](./prd-002-operation-automated-lo-add-ons-index.md)
- [GHL Marketplace and scopes](../../../knowledge/private/integrations/ghl-marketplace-and-scopes.md)
