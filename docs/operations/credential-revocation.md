# Credential revocation runbook

**Execution status:** NOT EXECUTED

Treat suspected exposure as an incident. Identify the credential by non-secret metadata only, its environment, permissions, dependent services, owner, approver, replacement plan, and verification method. Never paste the credential value into evidence or commands.

Create a dry-run evidence skeleton:

```powershell
node tooling/scripts/release/create-operation-evidence.mjs --operation credential-revocation --environment staging --correlation-id corr_revoke_check_001
```

Revoke before replacement when active misuse is suspected. Otherwise use an approved overlap window, update consumers, verify the new credential, revoke the old credential, and search authorized audit logs for use after revocation. Record provider event IDs and dependency checks. No revocation command is included because provider identity and authorization are intentionally absent. This command does not revoke or rotate credentials.
