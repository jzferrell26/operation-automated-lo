# Operations runbooks

Every runbook is fail-closed and starts in `NOT EXECUTED` state. Commands in this directory validate local contracts or create a dry-run evidence skeleton. They do not deploy, roll back, restore, reconcile, revoke, export, uninstall, retain, or delete external state.

Before any external mutation, record the named operator, approver, target environment, exact resource identifiers, maintenance window, stop conditions, rollback path, and evidence destination. Use provider-specific commands only after those facts are approved. Never place credentials in a command, evidence file, log, or ticket.

## Setup first

If the cloud stack is not connected to this repository yet, start with:

1. [cloud-environment-setup.md](cloud-environment-setup.md) — connect GitHub to Vercel, Trigger.dev, Supabase, R2, and KMS
2. [environment-inventory.template.md](environment-inventory.template.md) — record non-secret resource IDs for isolation evidence
3. [../production-environments.md](../production-environments.md) — environment variable contract
4. [../phase0-preview-environments.md](../phase0-preview-environments.md) — preview stub-only boundary
5. [deployment.md](deployment.md) — later release cutover after environments exist

Local inventory validation:

```powershell
node tooling/scripts/release/validate-runbook-inventory.mjs
```

An evidence skeleton has `status: not-run`. Change that state only from independently captured execution evidence.
