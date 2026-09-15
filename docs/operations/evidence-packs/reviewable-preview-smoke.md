# Evidence pack: Reviewable preview smoke (PRD-004a)

Parallel to Wave 1 G2; required before Marketplace submission (PRD-004c). Parent PRD-003 stays in `in-work/` until this pack passes.

## Unblocks

- PRD-003 parent completion (preview/review smoke exit gate).
- PRD-004b Test Link against a stable preview hostname.
- PRD-004c Marketplace submission (demo URL and OAuth callback).

Does **not** unblock the 28 `DEFERRED: LIVE HIGHLEVEL AUTH` criteria (see [g2-highlevel-app-test.md](./g2-highlevel-app-test.md)).

## Honest status (September 2026)

| Item | Status |
| --- | --- |
| PRD-003a–d code on `main` | **Done** (`70531fb`, `2ee2634`, `71c371d`, `26051b3`) |
| Vercel project `operation-automated-lo-web` | Exists; Phase 0 harness deployed |
| `/overview` on review URL | **Likely unlabeled synthetic** until 004a deploy + env wired |
| `OALO_DATABASE_URL` on preview | **Blocked** — operator must set on existing project only |
| Marketplace portal | **Unsigned-in** in automation browser; human sign-in required |

## Need from user before smoke

- [ ] Vercel access to `operation-automated-lo-web` (Preview + Production env)
- [ ] Review/staging Postgres URL for `OALO_DATABASE_URL` (not production seed)
- [ ] Server-only auth/OAuth secrets for preview env
- [ ] Confirm no second Vercel project will be created

## Smoke checklist

| Step | Done | Notes retained (no secrets in git) |
| --- | --- | --- |
| Preview deploy succeeds on `operation-automated-lo-web` | [ ] | Deployment URL, commit SHA |
| `OALO_DATABASE_URL` set server-only on preview | [ ] | Env name only, not value |
| `/overview` loads; spend/leads honest empty or not-connected | [ ] | Screenshot or operator note |
| Create Open House Boost on preview | [ ] | Campaign ref (non-PII) |
| Reload page; campaign still present | [ ] | Confirms Postgres, not local FS |
| List/detail show persisted state | [ ] | |
| Approver records human approval | [ ] | Approved state after reload |
| No provider publish, Meta, lead, or Stripe side effects | [ ] | |

## Prohibited in git

- `OALO_DATABASE_URL` values, OAuth client secrets, tokens, refresh secrets
- Customer PII from Test Link sessions
- Literal `OALO_GHL_LIVE_CAPTURE=authorized` in committed defaults

## After smoke passes

1. Update PRD-003 index parent status and move folder to `completed/` when quality gate passes.
2. Point Developer Portal OAuth callback and Custom Page URL at the verified preview hostname (004b).
3. Do not submit Marketplace until 004b Test Link also passes.

## Related

- [PRD-004a](../../library/requirements/in-work/prd-004-reviewable-go-live/prd-004a-reviewable-go-live-preview-deploy-smoke.md)
- [HighLevel Marketplace submission packet](../../library/knowledge/private/product/highlevel-marketplace-submission.md)
- [G2 App Test pack](./g2-highlevel-app-test.md)
