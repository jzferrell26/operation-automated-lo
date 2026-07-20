# Reusable Source-Asset Inventory

## Purpose

This inventory identifies reusable product patterns from Jonathan's existing repositories. It is an architecture input, not permission to copy each codebase wholesale. Each source has its own dependencies, tenant assumptions, and security posture. Reuse should happen through extraction into new modules with new tests and explicit ownership.

Research snapshot: July 19, 2026.

## Source revisions reviewed

| Source | Local revision | Proven pattern | Reuse decision |
| --- | --- | --- | --- |
| `wealth-build-studio` | `fa1d00d1fb7d` | Deal-to-listing marketing panel, PDF generation, public-listing publish flow, GHL-resolved owner identity | Extract the campaign input and asset-generation contracts. Do not reuse Whetstone branding or browser-only PDF assumptions. |
| `florida-fast-offer` | `55ad3d92f319` | Server-rendered public property route, gallery, facts, agent contact, resource calls to action, social metadata | Rebuild as a tenant-themed public campaign renderer. Preserve server-side validation and safe public data projection. |
| `operation-print-money` | `78d19e207319` | Signed OAuth state, explicit confirmation before external writes, encrypted token handling, execution audit records | Reuse the safety model and test patterns. Generalize it for campaign and ad operations. |
| `voyze` | `30b3dc31c9be` | GHL as front door, encrypted OAuth tokens, request-time GHL reads, immutable versioned brand truth | Reuse the data-ownership boundary and append-only version pattern. |
| `brand-engine-template` | `97a9b970defc` | Configuration-driven brand profile, pure preflight checks, banned phrases, merge-token allowlist, CAN-SPAM tokens, approval-gated delivery | Extract a tenant-safe campaign preflight package. Extend it with mortgage disclosures and channel rules. |
| `loan-charm-suite` | `93f70d703633` | Structured loan and property domain, GHL opportunity link, explicit stage transitions, stage-change webhook payload | Reuse only the domain vocabulary and event-contract lessons. Do not make this product a LOS. |

## What the Whetstone and Florida products prove

The current products already demonstrate the end-to-end content path:

1. A deal supplies property facts and photos.
2. A user completes or corrects listing details.
3. The application generates a marketing packet.
4. The application publishes a public listing record and returns a URL.
5. A server-rendered property page exposes a deliberately limited public projection.
6. The page carries the assigned GHL user's name, email, and phone.

The scalable product should preserve that sequence but replace per-project implementation with shared tenant primitives:

- `BrandProfile`
- `PartnerProfile`
- `PropertyCampaignInput`
- `CampaignBlueprintVersion`
- `CampaignArtifact`
- `ApprovalDecision`
- `ChannelLaunch`
- `AttributionEvent`

The public renderer should read a frozen campaign version by public slug or opaque identifier. It should not query a raw GHL opportunity or expose the application's internal campaign record.

## What the Brand Engine proves

The Brand Engine establishes four important design rules:

1. Client variation belongs in validated configuration, not source-code forks.
2. Preflight should be a pure, deterministic function that can block delivery.
3. Merge tokens require an allowlist.
4. Generation and publication are separate actions.

Operation Automated LO should add these preflight rule groups:

- Required NMLS and company disclosures
- Equal Housing Opportunity asset requirement when mandated by tenant policy
- Prohibited or unapproved rate and payment claims
- Trigger-term disclosure completeness
- State and lender-specific disclaimer blocks
- Property-photo and listing-permission attestation
- Meta Special Ad Category selection
- Prohibited targeting dimensions
- Consent language and lead-form destination checks
- Partner logo and name-use approval

## What Voyze proves

Voyze's architecture decision that GHL is the front door, not the database, should carry forward with one refinement.

GHL remains the system of record for:

- Contacts
- Opportunities and pipeline stages
- Calendars and appointments
- Conversations and messaging status
- Connected Meta assets
- Ad entities and ad reporting when created through HighLevel

Operation Automated LO becomes the system of record for its own product concepts:

- Brand and compliance profile versions
- Realtor partner approvals
- Campaign blueprints and frozen versions
- Generated page, PDF, and creative assets
- Approval events
- Publish commands and normalized provider results
- Attribution links between a campaign and GHL object IDs
- Audit and support events

This avoids copying the client's CRM while still allowing the application to own durable campaign artifacts and approvals that do not exist as first-class GHL objects.

## What Operation Print Money proves

The existing GHL execution work provides the correct safety posture:

- OAuth state is signed and time-limited.
- External writes require an explicit confirmation action.
- Tokens are decrypted only in server memory.
- Refresh tokens rotate and are written back encrypted.
- Execution events record safe summaries, not secrets or raw provider payloads.
- API adapters are injectable so tests do not require customer credentials.

For Operation Automated LO, the same model must apply to every consequential action:

- Create or update a contact
- Create or update an opportunity
- Add a contact to a workflow
- Create an ad draft
- Publish, pause, or resume an ad
- Change a live budget

Deletion operations should not be exposed in the initial product even when the broad GHL scope technically permits them.

## Extraction sequence

1. Define clean domain schemas in the new repository.
2. Reimplement the public page projection with tenant isolation and output encoding.
3. Move PDF generation to a server-side rendering worker so output is deterministic and does not depend on a user's browser.
4. Extract Brand Engine preflight rules into pure packages, then add mortgage rule plugins.
5. Implement the OAuth and audited-command foundation using the Operation Print Money safety contract.
6. Add source adapters only after each external contract is proven in a sandbox.

## Explicit non-reuse

- No hardcoded customer brand values
- No browser-side credentials
- No fixed webhook URLs
- No direct copying of production database schemas without tenant and retention review
- No public-listing query that returns private opportunity or borrower fields
- No fire-and-forget stage or campaign webhooks without durable retry and idempotency
- No claim that the inherited preflight rules constitute legal approval
