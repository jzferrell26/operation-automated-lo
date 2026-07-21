# Operational alert response runbook

**Execution status:** NOT EXECUTED

Alert records contain only opaque references, a correlation ID, a stable reason code, and one of
the documented response links below. Do not put emails, phone numbers, addresses, tokens,
authorization headers, provider payloads, or object contents in an alert.

Create a dry-run incident evidence skeleton before any external response:

```powershell
node tooling/scripts/release/create-operation-evidence.mjs --operation incident --environment staging --correlation-id corr_alert_response_001
```

## Storage private transfer

Stop the transfer. Confirm the correlation ID, tenant reference, configured private bucket, exact
object key, and expiry. Do not retry a bucket or visibility mismatch. Capture read-only evidence
before escalating to the storage owner.

## Public projection

Stop publication. Verify the approved campaign-version reference, source checksum, destination
key, and public-bucket identity. Withdraw any partial public projection only with the withdrawal
audit workflow.

## Projection withdrawal audit

Treat missing or mismatched immutable audit evidence as a failed withdrawal. Preserve the
correlation ID and opaque references, then escalate to the storage and compliance owners.

## Durable delivery

Use the correlation ID to inspect the idempotency record and retry classification. Do not replay
a delivery until its durable state and any downstream reconciliation are understood.
