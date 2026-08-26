# Evidence pack: G2 HighLevel App Test

Wave 1 of [`NEXT_BATCH_LEDGER.md`](../../../NEXT_BATCH_LEDGER.md).

## Unblocks

`001J-AC-022` through `024`, `001J-AC-028`, `001A-AC-005` through `016`, `018` through `023`, `026`, `028`, `038`, `001H-AC-002`, `003`, `005` (28 criteria currently `DEFERRED: LIVE HIGHLEVEL AUTH`).

## Need from user before start

- [ ] HighLevel **app approval** (current wait as of 2026-08-26)
- [ ] Authorized HighLevel App Test operator account or invite
- [ ] One controlled location for the install matrix
- [ ] Product owner confirms private App Test / founding beta boundary (G1 stays `ACCEPTED CONSTRAINT`)

## Operator commands

Fail-closed by default. Live capture requires the exact env flag `OALO_GHL_LIVE_CAPTURE=authorized` in the operator shell only (never commit that value).

```bash
pnpm --filter @oalo/ghl build
node tooling/scripts/ghl/run-g2-app-test-matrix.mjs --list
```

After App Test observations are sanitized into JSON files (one per `caseId`, no tokens/PII/spend):

```bash
mkdir -p tmp/g2-observations tmp/g2-sanitized-fixtures
# place observation JSON files under tmp/g2-observations/
OALO_GHL_LIVE_CAPTURE=authorized node tooling/scripts/ghl/run-g2-app-test-matrix.mjs \
  --observation-dir ./tmp/g2-observations \
  --out-dir ./tmp/g2-sanitized-fixtures
pnpm test:contracts
```

Sanitized outputs must pass `packages/ghl` evidence schemas (`source: sanitized-live-capture`, `externalStatus: CAPTURED_SANITIZED`). Only then copy approved fixtures into `tests/contracts/ghl/fixtures/` under review.

## Wave 1 residual asks (2026-08-26)

Harness readiness is complete on `main` (PR #27, `a530947`: `OALO_GHL_LIVE_CAPTURE=authorized` seam, matrix CLI, sanitization + unit tests). **Live capture remains parked** pending HighLevel **app approval**, then App Test operator access for one controlled location. Every matrix row stays open with the same exact ask:

| caseId | Residual ask |
| --- | --- |
| `signed_custom_page_context` | After HighLevel app approval: App Test operator access + controlled location; capture sanitized signed-context observation |
| `oauth_callback_success` | Same access; capture sanitized OAuth callback observation |
| `location_token_exchange` | Same access; capture sanitized per-location token exchange observation |
| `refresh_rotation` | Same access; capture sanitized refresh observation |
| `uninstall_blocks_work` | Same access; capture sanitized uninstall observation |
| `reinstall_restores_authority` | Same access; capture sanitized reinstall observation |
| `role_resolution` | Same access; capture sanitized role observation |
| `embedded_iframe_access` | Same access; capture sanitized iframe/embed observation |
| `first_party_fallback` | Same access; capture sanitized first-party fallback observation |

Do not flip any of the 28 `DEFERRED: LIVE HIGHLEVEL AUTH` criteria to `VERIFIED` until sanitized fixtures for the relevant cases land and pass `pnpm test:contracts`.

## Matrix checklist

| Case | caseId | Done | Sanitized artifact retained |
| --- | --- | --- | --- |
| Signed Custom Page context accepted | `signed_custom_page_context` | [ ] | |
| OAuth callback success | `oauth_callback_success` | [ ] | |
| Per-location token exchange | `location_token_exchange` | [ ] | |
| Refresh rotation | `refresh_rotation` | [ ] | |
| Uninstall blocks new work | `uninstall_blocks_work` | [ ] | |
| Reinstall restores authority | `reinstall_restores_authority` | [ ] | |
| Role resolution | `role_resolution` | [ ] | |
| Embedded / iframe access | `embedded_iframe_access` | [ ] | |
| First-party fallback when embed cookies fail | `first_party_fallback` | [ ] | |

## Prohibited in git

Tokens, client secrets, raw signed-context JWTs with live keys, customer contact payloads, Marketplace listing claims, or the literal shell export of `OALO_GHL_LIVE_CAPTURE=authorized` in committed docs/scripts defaults.

## After capture

1. Feed sanitized fixtures through existing GHL contract harness (`pnpm test:contracts`).
2. Flip each criterion in `PRODUCTION_EXECUTION_LEDGER.md` only with evidence coordinates.
3. Update this pack checkboxes and the next-batch watchdog log.
