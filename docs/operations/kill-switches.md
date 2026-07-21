# Kill switch runbook

**Execution status:** NOT EXECUTED

Kill switches must be narrow, reversible, auditable, and disabled by default. Require a named incident lead, exact switch, environment, expected blast-radius reduction, owner, approval, verification query, and reversal condition. Stop if a switch could broaden access or enable production traffic.

Create a dry-run evidence skeleton:

```powershell
node tooling/scripts/release/create-operation-evidence.mjs --operation kill-switch --environment staging --correlation-id corr_killswitch_check_001
```

Capture the prior state, approved state, activation time, provider event ID, observed effect, residual risk, monitoring interval, and reversal evidence. No switch mutation command is included because the switch registry and provider authorization are not configured here. This command does not change a feature flag or provider setting.
