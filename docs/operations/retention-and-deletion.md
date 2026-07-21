# Retention and deletion runbook

**Execution status:** NOT EXECUTED

Require a documented retention policy, legal-hold check, tenant and subject scope, authenticated authorization, named operator, approver, exact systems of record, backups policy, and verification plan. Stop if a legal hold exists or scope crosses a tenant boundary.

Create dry-run evidence skeletons:

```powershell
node tooling/scripts/release/create-operation-evidence.mjs --operation retention --environment staging --correlation-id corr_retention_check_001
node tooling/scripts/release/create-operation-evidence.mjs --operation deletion --environment staging --correlation-id corr_deletion_check_001
```

Retention evidence records policy version, classification, system, start and expiry, exceptions, and approval. Deletion evidence records opaque identifiers, system acknowledgements, counts, timestamps, backup disposition, downstream processor results, and independent verification. Do not place deleted content in evidence. No retention or deletion command is included because approved resources and provider authorization are absent. These commands do not change retention or delete data.
