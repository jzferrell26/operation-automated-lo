# Retention and deletion runbook

**Execution status:** NOT EXECUTED

Require a documented retention policy, legal-hold check, tenant and subject scope, authenticated authorization, named operator, approver, exact systems of record, backups policy, and verification plan. Stop if a legal hold exists or scope crosses a tenant boundary.

Create dry-run evidence skeletons:

```powershell
node tooling/scripts/release/create-operation-evidence.mjs --operation retention --environment staging --correlation-id corr_retention_check_001
node tooling/scripts/release/create-operation-evidence.mjs --operation deletion --environment staging --correlation-id corr_deletion_check_001
```

Retention evidence records policy version, classification, system, start and expiry, exceptions, and approval. Deletion evidence records opaque identifiers, system acknowledgements, counts, timestamps, backup disposition, downstream processor results, and independent verification. Do not place deleted content in evidence. No retention or deletion command is included because approved resources and provider authorization are absent. These commands do not change retention or delete data.

## Personal data stores (PRD-006a D1)

Two tables hold personal data and must be named in the scope of every retention, deletion, and export request that covers a person:

- `platform.user_credentials`: one row per person, holding their email address (normalized and as typed), the instant they confirmed it, and their password hash. The hash is a derived value and must never be exported to anyone, including the person it belongs to.
- `platform.credential_tokens`: password-reset, email-confirmation, and workspace-choice tokens, stored only as SHA-256 hashes and tied to a person by their id. A row names a person even though it holds no address.

`platform.auth_rate_limits` holds no personal data: its keys are keyed hashes of a client address or an email address, and it is out of scope for a subject request. Rotating `OALO_CSRF_SERVER_SECRET` discards every window in it.

No runtime database role holds any grant on these three tables. Reading or deleting a row in them is an owner-privileged operation performed with the migration login, under the same authorization, approval, and evidence requirements as every other step on this page.

## The guided setup's own data (PRD-006c D4)

`platform.user_preferences` holds one row per person, per workspace, per key. It is tenant data, so it is in scope for any request that covers a person and for any request that covers a workspace.

Two keys exist:

- `guided_setup.v1`: where the person got to in the guided setup. It names no one and describes nothing about them beyond a step number, but it is keyed by their id, so it is part of their record.
- `setup_profile.v1`: personal data. The fields are `displayName`, `company`, `nmlsNumber`, `phone`, `realtorName`, and `realtorBrokerage`. The first four are the person's own; the last two name a Realtor partner, who is a third party and whose name must be handled with the same care.

The application role holds `select`, `insert`, and `update` on this table and no `delete`. Removing a row is an owner-privileged operation performed with the migration login, under the same authorization, approval, and evidence requirements as every other step on this page.
