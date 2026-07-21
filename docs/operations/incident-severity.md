# Incident severity runbook

**Execution status:** NOT EXECUTED

Classify incidents by the highest observed impact:

| Severity | Trigger                                                                   | Response target                                |
| -------- | ------------------------------------------------------------------------- | ---------------------------------------------- |
| SEV-1    | Active safety, security, financial, privacy, or broad availability impact | Immediate paging and incident command          |
| SEV-2    | Major degraded service or bounded customer impact with no safe workaround | Page the owning team and name an incident lead |
| SEV-3    | Limited degradation with a safe workaround                                | Track, assign, and monitor                     |
| SEV-4    | No current customer impact                                                | Normal backlog and review                      |

Create a dry-run evidence skeleton:

```powershell
node tooling/scripts/release/create-operation-evidence.mjs --operation incident --environment staging --correlation-id corr_incident_check_001
```

Record detection source, severity rationale, incident lead, scribe, affected environments, start time, customer impact, known facts, hypotheses, decisions, action owners, communication timestamps, and resolution evidence. Reassess severity whenever impact changes. Never include credentials, customer content, or sensitive provider payloads. This command does not page responders or create an external incident.
