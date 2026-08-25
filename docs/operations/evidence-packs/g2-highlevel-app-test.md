# Evidence pack: G2 HighLevel App Test

Wave 1 of [`NEXT_BATCH_LEDGER.md`](../../../NEXT_BATCH_LEDGER.md).

## Unblocks

`001J-AC-022` through `024`, `001J-AC-028`, `001A-AC-005` through `016`, `018` through `023`, `026`, `028`, `038`, `001H-AC-002`, `003`, `005` (28 criteria currently `DEFERRED: LIVE HIGHLEVEL AUTH`).

## Need from user before start

- [ ] Authorized HighLevel App Test operator account or invite
- [ ] One controlled location for the install matrix
- [ ] Product owner confirms private App Test / founding beta boundary (G1 stays `ACCEPTED CONSTRAINT`)

## Matrix checklist

| Case | Done | Sanitized artifact retained |
| --- | --- | --- |
| Signed Custom Page context accepted | [ ] | |
| OAuth callback success | [ ] | |
| Per-location token exchange | [ ] | |
| Refresh rotation | [ ] | |
| Uninstall blocks new work | [ ] | |
| Reinstall restores authority | [ ] | |
| Role resolution | [ ] | |
| Embedded / iframe access | [ ] | |
| First-party fallback when embed cookies fail | [ ] | |

## Prohibited in git

Tokens, client secrets, raw signed-context JWTs with live keys, customer contact payloads, or Marketplace listing claims.

## After capture

1. Feed sanitized fixtures through existing GHL contract harness (`pnpm test:contracts`).
2. Flip each criterion in `PRODUCTION_EXECUTION_LEDGER.md` only with evidence coordinates.
3. Update this pack checkboxes and the next-batch watchdog log.
