# Uninstall runbook

**Execution status:** NOT EXECUTED

Require an authenticated tenant administrator request, tenant identity, integration inventory, data disposition choice, retention obligations, export decision, billing decision, webhook inventory, credential inventory, named operator, and approver. Stop if ownership or data disposition is ambiguous.

Create a dry-run evidence skeleton:

```powershell
node tooling/scripts/release/create-operation-evidence.mjs --operation uninstall --environment staging --correlation-id corr_uninstall_check_001
```

The approved sequence must disable new work, drain or cancel authorized jobs, revoke provider access, remove webhooks, reconcile billing, preserve required evidence, apply retention decisions, and verify tenant isolation. Record provider event IDs without secrets. No uninstall command is included because no tenant or provider authorization is configured. This command does not remove an integration or delete data.
