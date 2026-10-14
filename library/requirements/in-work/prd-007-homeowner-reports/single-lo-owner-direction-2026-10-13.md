# Single loan officer account direction

Date: October 13, 2026. Owner: Jonathan Ferrell. Status: Accepted product direction; implementation verification remains separate.

The owner clarified during the completion task: "All contacts, single roles with add and remove options", followed by "This is a single-LO product. There are not going to be rolls." The second clarification governs the product model: each account belongs to one loan officer and has no user-facing role administration.

## Required behavior

- The connected account's contacts are available to its loan officer. Do not add per-user HighLevel contact visibility or a team contact-sharing matrix.
- The loan officer can view mortgage balances and manage their own homeowner reports, including adding and removing reports. Do not require a second app user or an assigned reviewer role for these account actions.
- Keep authentication, account isolation, current connection authorization, provider allowances, consent and revocation enforced internally. Removing role setup from the product does not authorize access to another loan officer's records.
- Use account and loan officer language in notices and setup actions. Do not tell the customer to find a separate workspace administrator or configure a team role.
- Preserve the existing explicit removal confirmation. Removing a report must explain the affected report history, share links and schedules, and must not claim to delete its HighLevel contact or erase recorded provider usage.
- This direction applies to the product experience beyond homeowner reports. New webinar preparation and review must avoid team or role administration while preserving authoritative actor provenance and internal access checks.

## Retention and evidence

The owner did not choose an automatic deletion interval. Preserve existing manual removal semantics and do not invent a scheduled retention period. Any legal, provider or audit retention obligations need their own evidence. This record does not assert regulatory compliance or imply that previously downloaded copies can be recalled.

L-5's product choice is all connected-account contacts. L-16's product choice is the single loan officer's access to their own balances and reports, with no configurable user roles. L-15's removal, export and retained audit behavior still needs an implementation audit; no automatic deletion interval is authorized by this clarification.

Implementation must prove authentication and cross-account refusal, permitted single-account read/add/remove actions, share revocation and scheduler behavior after removal, honest export/removal copy and absence of user-facing role setup. Existing synthetic reader/approver cases may continue testing internal security and legacy compatibility; they must not become customer onboarding options or be presented as product roles.
