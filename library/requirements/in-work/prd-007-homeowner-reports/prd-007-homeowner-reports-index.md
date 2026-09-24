# PRD-007: Homeowner reports

Status: Implementation complete; hosted live-provider activation pending. Product owner: Jonathan Ferrell. Authorized September 23, 2026 by "Let's build it."

This implements the first homeowner-report release from PRD-002e. It supersedes the backlog-only restriction for this feature; other PRD-002 add-ons remain separate. No unapproved subscription price is introduced.

## Experience

Jonathan's subsequent instruction prioritizes the AVM. A property-only report must accept an address without requiring a HighLevel contact or connection. The explicit property-only association uses an internal marker, never an invented CRM contact, and permits valuation, saved history, PDF output and refreshes. HighLevel identity verification and communication checks apply when associating a homeowner or requesting workflow delivery. A property-only lookup does not establish consumer communication consent.

Select an existing HighLevel contact, confirm a property, obtain a licensed valuation, confirm mortgage inputs, and generate a branded value/equity report. Save immutable report snapshots and reuse them for viewing and PDF output. Provide report history, revocable expiring share links, homeowner review requests, monthly refresh preferences and a deliberate HighLevel handoff. The demo uses labeled fictional sample data and browser-local persistence; authenticated reports use Postgres.

## Acceptance

1. All authenticated reads/writes derive the location and actor from the established session. Mutations use the existing CSRF gate. RLS and indexed composite foreign keys enforce tenant boundaries. Support and unrelated collaborator roles cannot read homeowner financial data.
2. RentCast requests run only on the server when live homeowner data is explicitly enabled and the API credential exists. Normalize value/range, subject attributes and comparable listing prices. Preserve unknown fields as unknown, label listings as listings, and never invent confidence scores or closed-sale prices.
3. Equity is available only when the mortgage source and every secured balance are known. A debt-free property requires an explicit declaration. Amortized balances use confirmed loan terms and a count of completed payments, with a visible estimate label. Missing additional liens never silently become zero.
4. Reports retain valuation retrieval time, mortgage-input date, source, range, disclosures and calculation version. Equity, sale-proceeds assumptions and hypothetical borrowing capacity are separate. A report is not an appraisal, offer or credit decision.
5. Report commands have durable idempotency keys and request fingerprints. A retry does not repeat a potentially billable call. Cached valuations can be reused without another call. Reservations and actual/uncertain usage remain auditable and enforce an explicit monthly lookup allowance.
6. Saving mortgage edits produces a new snapshot using the prior valuation. PDF and report reads do not call the valuation API. Dates and stale/missing data remain visible in both outputs.
7. Share links require an explicit action, expire, can be revoked, use opaque secrets, and return only the intended report. Shared responses have no-store/noindex/no-referrer policies. A link visit alone is not treated as homeowner intent; review requests are explicit and deduplicated.
8. Monthly enrollment defaults off, can be paused, and schedules by UTC calendar month. A scheduled refresh checks current authorization and communication eligibility. Failed/uncertain external calls are not blindly retried. Unavailable configuration does not claim that updates are being delivered.
9. HighLevel remains the contact and communication authority. Confirm contact-location ownership before retrieval or handoff, respect global/channel DND, update only the configured report-link custom field, and activate only the configured workflow following explicit user/enrollment authorization. An uncertain workflow write is held for review rather than resent.
10. Build the management, creation and branded report screens in the existing design system, including empty/error/loading states, mobile layout, both themes, keyboard controls and source/assumption explanations. Use current company/loan-officer branding as defaults.

## External activation

Provider rights, RentCast credentials, authenticated workspace configuration and the live database migration are required to qualify live valuations. A tenant-specific HighLevel connection is required only for linked homeowner reports and workflow delivery. Those are deployment configuration, not sample data. Implement and test the adapters without claiming a real provider call when credentials are absent. No message is sent to a real person as an implementation test.

Activation instructions: [Homeowner AVM activation](../../../../docs/operations/homeowner-avm-activation.md). Security and quality evidence are recorded in this requirement's `reports` folder.

## Technical references

- RentCast valuation: https://developers.rentcast.io/reference/value-estimate
- RentCast schema: https://developers.rentcast.io/reference/property-valuation-schema
- RentCast property records: https://developers.rentcast.io/reference/property-records
- HighLevel contact: https://marketplace.gohighlevel.com/docs/ghl/contacts/get-contact/
- HighLevel update: https://marketplace.gohighlevel.com/docs/ghl/contacts/update-contact/
- HighLevel workflow: https://marketplace.gohighlevel.com/docs/ghl/contacts/add-contact-to-workflow/

The first report uses one valuation request with subject attributes and comparable listings. It does not require a rental request or retrieve unrelated owner/loan records. That keeps the data footprint and billable work aligned with the first release.
