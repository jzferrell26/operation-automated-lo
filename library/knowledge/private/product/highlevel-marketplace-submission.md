# HighLevel Marketplace Submission Packet

> Category: Product Operations | Version: 1.3 | Date: September 2026 | Status: Active

Internal operator packet for Automated LO Marketplace listing, sandbox App Test, and Test Link install. This document does **not** authorize production provider traffic, live leads, Stripe billing, or flipping deferred G2 acceptance criteria without sanitized fixtures.

**Related:**

- [Project map](project-map.md)
- [G2 App Test evidence pack](../../../../docs/operations/evidence-packs/g2-highlevel-app-test.md)
- [Reviewable preview smoke evidence pack](../../../../docs/operations/evidence-packs/reviewable-preview-smoke.md)
- [Production environment contract](../../../../docs/production-environments.md)
- [Go-live raid ledger (GGL rows)](../../../../EXECUTION_LEDGER.md#gauntlet-raid-go-live-remaining-in-repo-code)
- [PRD-003: Authenticated Product Activation](../../../requirements/in-work/prd-003-authenticated-product-activation/prd-003-authenticated-product-activation-index.md)
- [PRD-004: Reviewable Go-Live](../../../requirements/in-work/prd-004-reviewable-go-live/prd-004-reviewable-go-live-index.md)
- [Agent terrain map](../../../../.cursor/rules/core/the-map.mdc)

---

## What "reviewable" means

A HighLevel reviewer and a sandbox location can install Automated LO, create an Open House Boost, persist it in Postgres, and record a human approval. The product is hosted on the existing Vercel project (`operation-automated-lo-web.vercel.app`) and submitted to the Marketplace for that demonstrated scope only.

The listing must describe **only** Open House Boost create, persist, and approve. Do not advertise automatic ad publishing, lead delivery, or billing.

---

## Production tonight path (operator order)

| Step | GGL row | Owner | Action |
| --- | --- | --- | --- |
| 1 | B01, B03 | Operator / `release-deploy-guardian` | Wire preview env on `operation-automated-lo-web`: `OALO_DATABASE_URL`, `OALO_REVIEW_SURFACE=authorized`, other server-only secrets |
| 2 | B02, B03 | Operator | Run [reviewable-preview-smoke.md](../../../../docs/operations/evidence-packs/reviewable-preview-smoke.md); retain log outside git |
| 3 | B04–B06 | Human + `gohighlevel-guardian` | Sign in to Developer Portal; inspection checklist; Test Link install |
| 4 | B07 | Operator | Create → persist → approve on preview after Test Link |
| 5 | B09 | `library-guardian` + `ux-ui-guardian` | Complete listing packet + Loom; submit for review |
| Parallel | B10 | Operator + `gohighlevel-guardian` | G2 matrix capture after Test Link; **do not flip** deferred ACs without fixtures |

In-repo code for honest review surfaces is **done** on `main` (`f4b79f7`, PR #61). `GGL-001`/`GGL-002` hold only when `OALO_REVIEW_SURFACE=authorized` is set on the review URL.

---

## App Test: try sandbox and Test Link now

**Do not wait for prior Marketplace approval before App Test.**

Official HighLevel docs do **not** list prior Marketplace approval as a prerequisite for:

1. **Testing** → Create App Test Account ([SandboxAccount](https://marketplace.gohighlevel.com/docs/oauth/SandboxAccount/))
2. **My Apps** → Manage → Versions → **Test Link** ([TestingApp](https://marketplace.gohighlevel.com/docs/oauth/TestingApp/))

**Operator action now:** sign in to [marketplace.gohighlevel.com](https://marketplace.gohighlevel.com/login), open the Automated LO app (or confirm none exists yet), and try Create App Test Account plus Test Link against a sandbox location. Record what **this** developer account actually allows. Portal UI may differ from docs; note any mismatch (`GGL-B04`–`B06`).

**Do not invent G2 evidence.** Live OAuth/session matrix capture stays fail-closed until sanitized observations pass `pnpm test:contracts` (`GGL-B10`).

---

## Listing type (decision gate)

Listing type is chosen **when the app is first created**. Do not create a new app entry until the existing Automated LO app is inspected (Profile + Manage → Versions).

| Type | Visibility | Fit for current product |
| --- | --- | --- |
| **Standard** | HighLevel-domain accounts only | Factual "HighLevel" copy allowed. Matches today's shell, onboarding, overview, and fixtures. |
| **White-label** | White-label and HighLevel-domain accounts | Zero HighLevel/GHL in listing, screenshots, OAuth, embedded UI, support copy, or company site. Today's product would fail that audit. |

**Default recommendation:** if creating new, pick **Standard** for the first reviewable listing unless an explicit terminology pass is planned first. If the app already exists, keep its current type.

---

## Developer Portal inspection checklist (`GGL-B04`)

Human + `gohighlevel-guardian`. Do not submit for review in the inspection-only pass.

- [ ] Confirm Automated LO app: name, version, visibility, publisher
- [ ] OAuth scopes, HTTPS callback URL, Custom Page URL (must match preview hostname, `GGL-B05`)
- [ ] Testing → Create App Test Account enabled (or record why not)
- [ ] Test Link steps recorded against a sandbox location (`GGL-B06`)
- [ ] Listing type noted (Standard vs White-label)

---

## Submission packet (when demo is ready, `GGL-B09`)

Complete only after [PRD-004a](../../../requirements/in-work/prd-004-reviewable-go-live/prd-004a-reviewable-go-live-preview-deploy-smoke.md) operator smoke and [PRD-004b](../../../requirements/in-work/prd-004-reviewable-go-live/prd-004b-reviewable-go-live-portal-and-test-link.md) Test Link pass.

| Artifact | Requirement |
| --- | --- |
| Profile | Logo, description, support email |
| Screenshots | Open House Boost create → persist → approve only; **no misleading synthetic spend/lead metrics** (`004C-AC-004`) |
| Pricing | As applicable for founding scope |
| OAuth | HTTPS callback on verified preview/staging domain |
| Demo video | Loom: install → setup → create → approve → disconnect; must match live Test Link (`004C-AC-003`) |
| Claims | Match the demo exactly; no Meta publish, leads, or billing claims (`004C-AC-002`) |

If White-label is chosen, run a customer-facing terminology audit first (current shell copy would fail).

---

## Product and evidence boundaries

| Area | Honest status (September 2026) |
| --- | --- |
| PRD-003a–d | **Done** on `main` (`70531fb`, `2ee2634`, `71c371d`, `26051b3`) |
| PRD-004a in-repo code | **Done** (`f4b79f7`, PR #61); `GGL-001`–`GGL-007`, `GGL-010` VERIFIED |
| Honest review surfaces | **Requires** `OALO_REVIEW_SURFACE=authorized` on review URL |
| Operator preview smoke | **Blocked** (`GGL-B01`–`B03`) |
| Portal + Test Link | **Blocked** (`GGL-B04`–`B07`; portal unsigned-in) |
| Marketplace listing submit | **Blocked** (`GGL-B09`) |
| G2 live App Test matrix | Harness ready; **no sanitized fixtures**; do not flip deferred ACs (`GGL-B10`) |
| G1 Marketplace listing as launch gate | `ACCEPTED CONSTRAINT` |
| Production provider traffic | Disabled |

---

## Prohibited in git and listing

- Tokens, client secrets, raw signed-context JWTs with live keys
- Customer contact payloads or PII from App Test
- Marketplace claims beyond the demonstrated scope
- Literal `OALO_GHL_LIVE_CAPTURE=authorized` in committed defaults
- `OALO_GHL_LOCATION_PIT_JSON` in repo or evidence packs

---

## Sources

| Topic | Authoritative source |
| --- | --- |
| Preview smoke | [reviewable-preview-smoke.md](../../../../docs/operations/evidence-packs/reviewable-preview-smoke.md) |
| Wave 1 G2 matrix | [g2-highlevel-app-test.md](../../../../docs/operations/evidence-packs/g2-highlevel-app-test.md) |
| GGL ledger | [EXECUTION_LEDGER.md](../../../../EXECUTION_LEDGER.md) |
| External evidence waves | [NEXT_BATCH_LEDGER.md](../../../../NEXT_BATCH_LEDGER.md) |
| AC status | [PRODUCTION_EXECUTION_LEDGER.md](../../../../PRODUCTION_EXECUTION_LEDGER.md) |
| HighLevel sandbox | [SandboxAccount](https://marketplace.gohighlevel.com/docs/oauth/SandboxAccount/) |
| HighLevel testing | [TestingApp](https://marketplace.gohighlevel.com/docs/oauth/TestingApp/) |

## Changelog

- v1.3 (2026-09-16): Production tonight operator path with `GGL-B*` rows. PR #61 (`f4b79f7`) code done; `OALO_REVIEW_SURFACE=authorized` prerequisite documented.
- v1.2 (2026-09-15): Added PRD-004 go-live track. Reviewable preview smoke evidence pack.
- v1.1 (2026-09-15): 003c/003d done on `main`. Preview smoke blocked on env.
- v1.0 (2026-09-15): Initial packet recreated on `main`.
