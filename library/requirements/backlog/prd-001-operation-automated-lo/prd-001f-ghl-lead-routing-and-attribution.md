# PRD 001f: GHL Lead Routing and Attribution

## Goal

Capture an Open House Boost lead with defensible consent evidence, route it idempotently into the correct HighLevel location, and connect later pipeline outcomes to the campaign.

## Scope

- Public lead endpoint
- Consent receipt
- Contact match, create, or update
- Namespaced campaign tag
- Opportunity create or update
- Assignment, pipeline, stage, calendar, and optional workflow handoff
- Synthetic lead test
- Webhook and periodic reconciliation for milestones

## Acceptance criteria

### Public submission

- The endpoint accepts only an active, approved, published campaign version.
- Input schema, length, type, and format limits are enforced.
- Bot and abuse controls apply tenant and IP-derived rate limits without storing unnecessary raw identifiers.
- Submission uses a server-issued idempotency key.
- The consent disclosure is visible and not pre-checked.
- The receipt records campaign, version, disclosure content or hash, channel choices, timestamp, phone or email destination as appropriate, and safe request metadata.
- Personal data is never put in a URL or analytics event.

### GHL routing

- Destination location comes from the campaign, not the request.
- Contact matching follows a documented email and phone normalization strategy.
- Retry cannot create duplicate contacts or opportunities for the same submission.
- The app applies one namespaced campaign tag and records the campaign attribution key.
- The app creates or updates the opportunity in the configured pipeline and stage.
- The app applies the configured owner or assignment rule.
- The app adds the contact to one existing configured workflow only when consent and tenant policy permit it.
- Existing GHL DND and consent state is checked before workflow enrollment.

### Failure handling

- Submission success is not shown until the durable lead job is accepted.
- Provider failures retry safely and appear in an exception queue.
- A partial result is reconciled before any retry.
- Support can replay a failed routing command without resubmitting consumer data from the browser.
- Raw lead payload is removed from the queue after successful routing and the defined audit window.

### Attribution

- The product stores GHL contact and opportunity IDs plus campaign linkage, not a full copy of the CRM record.
- Opportunity, appointment, application, and funded or closed milestones are append-only normalized events.
- GHL webhooks are signature-verified and idempotent.
- Periodic reconciliation corrects missed or out-of-order webhook notifications.
- Attribution reports distinguish observed, inferred, and manually confirmed milestones.

### Synthetic test

- An authorized user can send a clearly labeled test lead.
- The test verifies contact, tag, opportunity, owner, workflow, and notification behavior.
- Test records are tagged and excluded from production campaign metrics.
- A campaign cannot publish until its lead path has passed or an authorized exception with reason is recorded.

## Out of scope

- Sending SMS, email, calls, or voicemail from the application
- Replacing GHL workflows
- Borrower application or credit data
- Database reactivation
- Multi-touch statistical attribution

## Verification

- Tests cover duplicate submissions, contact collisions, expired token, stale mappings, DND, workflow failure, partial provider success, webhook replay, out-of-order events, and cross-tenant routing.
- Counsel and lender compliance approve the consent and handoff evidence before production.
