# HighLevel Marketplace Submission Packet

> Category: Product Operations | Version: 1.1 | Date: September 2026 | Status: Active

Internal operator packet for Automated LO Marketplace listing, sandbox App Test, and Test Link install. This document does **not** authorize production provider traffic, live leads, Stripe billing, or flipping deferred G2 acceptance criteria without sanitized fixtures.

**Related:**

- [Project map](project-map.md)
- [G2 App Test evidence pack](../../../../docs/operations/evidence-packs/g2-highlevel-app-test.md)
- [PRD-003: Authenticated Product Activation](../../../requirements/in-work/prd-003-authenticated-product-activation/prd-003-authenticated-product-activation-index.md)
- [PRD-004: Reviewable Go-Live](../../../requirements/in-work/prd-004-reviewable-go-live/prd-004-reviewable-go-live-index.md)
- [Reviewable preview smoke evidence pack](../../../../docs/operations/evidence-packs/reviewable-preview-smoke.md)
- [Agent terrain map](../../../../.cursor/rules/core/the-map.mdc)

---

## What "reviewable" means

A HighLevel reviewer and a sandbox location can install Automated LO, create an Open House Boost, persist it in Postgres, and record a human approval. The product is hosted on the existing Vercel project (`operation-automated-lo-web.vercel.app`) and submitted to the Marketplace for that demonstrated scope only.

The listing must describe **only** Open House Boost create, persist, and approve. Do not advertise automatic ad publishing, lead delivery, or billing.

---

## App Test: try sandbox and Test Link now

**Do not wait for prior Marketplace approval before App Test.**

Official HighLevel docs do **not** list prior Marketplace approval as a prerequisite for:

1. **Testing** → Create App Test Account ([SandboxAccount](https://marketplace.gohighlevel.com/docs/oauth/SandboxAccount/))
2. **My Apps** → Manage → Versions → **Test Link** ([TestingApp](https://marketplace.gohighlevel.com/docs/oauth/TestingApp/))

**Operator action now:** sign in to [marketplace.gohighlevel.com](https://marketplace.gohighlevel.com/login), open the Automated LO app (or confirm none exists yet), and try Create App Test Account plus Test Link against a sandbox location. Record what **this** developer account actually allows. Portal UI may differ from docs; note any mismatch.

**Do not invent G2 evidence.** Live OAuth/session matrix capture stays fail-closed until sanitized observations pass `pnpm test:contracts`. The harness on `main` is ready; operator run is not.

---

## Listing type (decision gate)

Listing type is chosen **when the app is first created**. Do not create a new app entry until the existing Automated LO app is inspected (Profile + Manage → Versions).

| Type | Visibility | Fit for current product |
| --- | --- | --- |
| **Standard** | HighLevel-domain accounts only | Factual "HighLevel" copy allowed. Matches today's shell, onboarding, overview, and fixtures. |
| **White-label** | White-label and HighLevel-domain accounts | Zero HighLevel/GHL in listing, screenshots, OAuth, embedded UI, support copy, or company site. Today's product would fail that audit. |

**Default recommendation:** if creating new, pick **Standard** for the first reviewable listing unless an explicit terminology pass is planned first. If the app already exists, keep its current type.

---

## Developer Portal inspection checklist

Human + `gohighlevel-guardian`. Do not submit for review in the inspection-only pass.

- [ ] Confirm Automated LO app: name, version, visibility, publisher
- [ ] OAuth scopes, HTTPS callback URL, Custom Page URL
- [ ] Testing → Create App Test Account enabled (or record why not)
- [ ] Test Link steps recorded against a sandbox location
- [ ] Listing type noted (Standard vs White-label)

---

## Submission packet (when demo is ready)

Complete only after [PRD-004a](../../../requirements/in-work/prd-004-reviewable-go-live/prd-004a-reviewable-go-live-preview-deploy-smoke.md) preview smoke and [PRD-004b](../../../requirements/in-work/prd-004-reviewable-go-live/prd-004b-reviewable-go-live-portal-and-test-link.md) Test Link pass.

| Artifact | Requirement |
| --- | --- |
| Profile | Logo, description, support email |
| Screenshots | Open House Boost create → persist → approve only |
| Pricing | As applicable for founding scope |
| OAuth | HTTPS callback on verified preview/staging domain |
| Demo video | Loom: install → setup → create → approve → disconnect |
| Claims | Match the demo exactly; no Meta publish, leads, or billing claims |

If White-label is chosen, run a customer-facing terminology audit first (current shell copy would fail).

---

## Product and evidence boundaries

| Area | Honest status (September 2026) |
| --- | --- |
| PRD-003a campaign persistence | **Done** on `main` (`70531fb`, PR #54) |
| PRD-003b session command context | **Done** (`2ee2634`, PR #55) |
| PRD-003c human approval | **Done** (`71c371d`, PR #57) |
| PRD-003d workspace reads | **Done** (`26051b3`, PR #58) |
| Labeled review dashboard | **Merged** (`6f64201`, PR #53) |
| PRD-004 reviewable go-live | **In work:** 004a preview smoke blocked on env; 004b portal unsigned-in; 004c after smoke |
| Preview/review smoke (004a) | **Blocked:** operator must set review env + `OALO_DATABASE_URL` on `operation-automated-lo-web`. `/overview` may still be unlabeled synthetic until deploy. |
| Marketplace portal inspect | **Unsigned-in** in automation browser; human sign-in required for 004b |
| G2 live App Test matrix | Harness ready; **no sanitized fixtures**; do not flip deferred ACs |
| G1 Marketplace listing as launch gate | `ACCEPTED CONSTRAINT` (listing proof not required for founding launch) |
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
| Wave 1 G2 matrix | [g2-highlevel-app-test.md](../../../../docs/operations/evidence-packs/g2-highlevel-app-test.md) |
| External evidence waves | [NEXT_BATCH_LEDGER.md](../../../../NEXT_BATCH_LEDGER.md) |
| AC status | [PRODUCTION_EXECUTION_LEDGER.md](../../../../PRODUCTION_EXECUTION_LEDGER.md) |
| HighLevel sandbox | [SandboxAccount](https://marketplace.gohighlevel.com/docs/oauth/SandboxAccount/) |
| HighLevel testing | [TestingApp](https://marketplace.gohighlevel.com/docs/oauth/TestingApp/) |

## Changelog

- v1.2 (2026-09-15): Added PRD-004 go-live track (004a preview smoke, 004b portal/Test Link, 004c submission). Reviewable preview smoke evidence pack. Portal unsigned-in; `/overview` may be unlabeled synthetic until 004a.
- v1.1 (2026-09-15): 003c (`71c371d`, PR #57) and 003d (`26051b3`, PR #58) done on `main`. Preview/review smoke blocked on existing-project env + Postgres. Do not create a second Vercel project. Do not submit Marketplace until that smoke passes.
- v1.0 (2026-09-15): Initial packet recreated on `main`. App Test is "try sandbox + Test Link now"; prior approval is not documented as required. PRD-003 in-work with 003a merged (`70531fb`), 003b merged (`2ee2634`).
