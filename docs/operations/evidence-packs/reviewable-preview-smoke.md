# Evidence pack: Reviewable preview smoke (PRD-004a)

Parallel to Wave 1 G2; required before Marketplace submission (PRD-004c). Parent PRD-003 stays in `in-work/` until operator smoke passes (`GGL-B01`–`B03`).

## Unblocks

- PRD-003 parent completion (preview/review smoke exit gate).
- PRD-004b Test Link against a stable preview hostname (`GGL-B05`–`B07`).
- PRD-004c Marketplace submission (`GGL-B09`).

Does **not** unblock the 28 `DEFERRED: LIVE HIGHLEVEL AUTH` criteria (`GGL-B10`; see [g2-highlevel-app-test.md](./g2-highlevel-app-test.md)).

## Honest status (September 2026, `main` at `c140f11`)

| Item | Status |
| --- | --- |
| PRD-003a–d code | **Done** (`70531fb`, `2ee2634`, `71c371d`, `26051b3`) |
| PRD-004a in-repo code (PR #61) | **Done** — `GGL-001`/`GGL-002` VERIFIED in review mode; `GGL-003`/`GGL-004`/`GGL-005`/`GGL-007` VERIFIED |
| `GGL-008` / `GGL-009` (create/approve round trips) | **VERIFIED** (CI run `35058370796` at `dab2ec6`, PR #65, `c140f11`); reproduce with `pnpm test:db` (the gate provisions the disposable database itself) |
| Vercel project `operation-automated-lo-web` | Exists; operator deploy not observed (`GGL-B01`) |
| `OALO_DATABASE_URL` on preview | **Blocked** (`GGL-B03`) — operator must set server-only on existing project |
| `OALO_REVIEW_SURFACE=authorized` on preview | **Required** for honest `/overview` and `/reports` (`GGL-001`/`GGL-002`). Without it, default preview serves **labeled** synthetic demo metrics and does not satisfy review URL criteria |
| Marketplace portal | **Unsigned-in** (`GGL-B04`–`B06`) |

Ledger: [`EXECUTION_LEDGER.md`](../../../EXECUTION_LEDGER.md) Gauntlet section, rows `GGL-*` and `GGL-B*`. PR #66 was a separate, closed and unmerged approach to the same gate; it is not the gate's proof and is not reopened.

## Need from user before smoke

- [ ] Vercel access to `operation-automated-lo-web` (Preview env; root `apps/web`)
- [ ] Review/staging Postgres URL for `OALO_DATABASE_URL` (not production seed)
- [ ] Server-only `OALO_REVIEW_SURFACE=authorized` on the review preview URL
- [ ] Server-only auth/OAuth secrets for preview env (see [`production-environments.md`](../../production-environments.md))
- [ ] Confirm no second Vercel project will be created
- [ ] The five PRD-005e operator asks (an isolated review Postgres, the server-only variable names on the existing project's Preview environment, the seeded passwords through `--set-password`, one run of the seeding script, and presence for the seven-point proof), stated operatively in [the review session seeding runbook](../review-session-seeding.md) and originally in [PRD-005e, section "Exact operator ask"](../../../library/requirements/in-work/prd-005-authenticated-review-runtime/prd-005e-authenticated-review-runtime-deployed-qualification.md) (restated 2026-09-21 after PRD-006a D9)

## Production tonight operator sequence

1. Set server-only env on `operation-automated-lo-web` preview: `OALO_DATABASE_URL`, `OALO_REVIEW_SURFACE=authorized`, plus required `OALO_*` contract vars from [`production-environments.md`](../../production-environments.md).
2. Deploy or promote preview; record deployment URL and commit SHA (`GGL-B01`).
3. Open `/overview` and `/reports` on the review URL; confirm honest not-connected states, not unlabeled synthetic spend/leads (`GGL-001`/`GGL-002`).
4. Create Open House Boost → reload → approve; confirm Postgres persistence (`GGL-B03`).
5. Retain smoke log outside git (`GGL-B02`).

## Smoke checklist

| Step | GGL row | Done | Notes retained (no secrets in git) |
| --- | --- | --- | --- |
| Preview deploy on `operation-automated-lo-web` only | B01 | [ ] | Deployment URL, commit SHA |
| `OALO_DATABASE_URL` set server-only on preview | B03 | [ ] | Env name only, not value |
| `OALO_REVIEW_SURFACE=authorized` set server-only | B03 | [ ] | Required for honest review surfaces |
| `/overview` honest not-connected (review mode) | B03 | [ ] | Screenshot or operator note |
| `/reports` honest not-connected (review mode) | B03 | [ ] | No misleading synthetic spend |
| Create Open House Boost on preview | B03 | [ ] | Campaign ref (non-PII) |
| Reload page; campaign still present | B03 | [ ] | Confirms Postgres |
| Approver records human approval | B03 | [ ] | Approved state after reload |
| Smoke log retained outside git | B02 | [ ] | |
| No provider publish, Meta, lead, or Stripe side effects | B03 | [ ] | |

## Prohibited in git

- `OALO_DATABASE_URL` values, OAuth client secrets, tokens, refresh secrets
- Customer PII from Test Link sessions
- Literal `OALO_GHL_LIVE_CAPTURE=authorized` in committed defaults

## After smoke passes

1. Update PRD-003 index; move folder to `completed/` when quality gate passes.
2. Point Developer Portal OAuth callback and Custom Page URL at the verified preview hostname (004b, `GGL-B05`).
3. Do not submit Marketplace until 004b Test Link also passes (`GGL-B06`–`B07`).

## Related

- [PRD-004a](../../../library/requirements/in-work/prd-004-reviewable-go-live/prd-004a-reviewable-go-live-preview-deploy-smoke.md)
- [HighLevel Marketplace submission packet](../../../library/knowledge/private/product/highlevel-marketplace-submission.md)
- [G2 App Test pack](./g2-highlevel-app-test.md)
- [Production environment contract](../../production-environments.md)
