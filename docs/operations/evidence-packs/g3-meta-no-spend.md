# Evidence pack: G3 Meta no-spend

Wave 3. Unblocks gate G3.

## Need from user

- [ ] Authorized Meta App Test operator through HighLevel
- [ ] Controlled test assets; no live customer spend

## Checklist

| Case | Done | Sanitized evidence |
| --- | --- | --- |
| Draft create | [ ] | |
| Read-back parity vs approved fields | [ ] | |
| Explicit publish confirmation | [ ] | |
| Pause and resume | [ ] | |
| Reconciliation | [ ] | |
| Reporting | [ ] | |
| Housing Special Ad Category present on paid housing/mortgage drafts | [ ] | |

G4 discovery of alternate categories is not required (accepted constraint). Realtor identity must stay out of paid-ad projections.

## Server-only PIT seam

Deployed Meta/task workers use `OALO_GHL_LOCATION_PIT_JSON` with `locationId` equal to `OALO_GHL_READINESS_LOCATION_REF`. Retain only sanitized Meta request/response evidence in this pack. Never store the PIT JSON, access tokens, or live customer spend artifacts in git.
