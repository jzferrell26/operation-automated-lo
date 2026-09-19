# Data export runbook

**Execution status:** NOT EXECUTED

Require an authenticated request, authorization proof, export scope, legal basis, tenant boundary, named operator, approver, expiration, and secure delivery destination. Stop if identity, scope, residency, or tenant ownership cannot be proven.

Create a dry-run evidence skeleton:

```powershell
node tooling/scripts/release/create-operation-evidence.mjs --operation export --environment staging --correlation-id corr_export_check_001
```

Record only non-sensitive metadata: request ID, scope, record counts, checksums, timestamps, encryption state, expiration, delivery confirmation, and deletion confirmation. Do not store exported customer content in operational evidence. No export command is included because an authorized subject and data target are absent. This command does not access or export data.

## Personal data stores (PRD-006a D1)

Two tables hold personal data and must be named in the scope of every retention, deletion, and export request that covers a person:

- `platform.user_credentials`: one row per person, holding their email address (normalized and as typed), the instant they confirmed it, and their password hash. The hash is a derived value and must never be exported to anyone, including the person it belongs to.
- `platform.credential_tokens`: password-reset, email-confirmation, and workspace-choice tokens, stored only as SHA-256 hashes and tied to a person by their id. A row names a person even though it holds no address.

`platform.auth_rate_limits` holds no personal data: its keys are keyed hashes of a client address or an email address, and it is out of scope for a subject request. Rotating `OALO_CSRF_SERVER_SECRET` discards every window in it.

No runtime database role holds any grant on these three tables. Reading or deleting a row in them is an owner-privileged operation performed with the migration login, under the same authorization, approval, and evidence requirements as every other step on this page.
