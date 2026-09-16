# Requirements Coverage and Library Drift Report: Production Tonight

> Type: Requirements coverage + library drift | Date: 2026-09-16 | Author: `library-guardian` | Baseline: `origin/main` at `deeb3e2`

A documentation-side audit answering one question: does every remaining item on the production-tonight path have an owning requirement document? This is **not** a QA report and **not** a security audit. It asserts no verdict on implementation correctness; `quality-guardian` and `security-guardian` own those, and neither has run against this branch.

**Related:**

- [PRD-004: Reviewable Go-Live](../in-work/prd-004-reviewable-go-live/prd-004-reviewable-go-live-index.md)
- [Go-live raid ledger](../../../EXECUTION_LEDGER.md#gauntlet-raid-go-live-remaining-in-repo-code)
- [Production tonight operator runbook](../../knowledge/private/operations/production-tonight-operator-runbook.md)
- [Project map](../../knowledge/private/product/project-map.md)

---

## Summary

| Question | Answer |
| --- | --- |
| Do all 16 parked Gauntlet rows (`GGL-B01` through `GGL-B16`) have an owning requirement document? | **Yes, after this branch.** Two did not before it. |
| Were any acceptance-criterion statuses changed? | **No.** No `PRODUCTION_EXECUTION_LEDGER.md` criterion row was edited. |
| Were any of the 28 `DEFERRED: LIVE HIGHLEVEL AUTH` rows flipped? | **No.** |
| Were G1, G4, or G8 reopened? | **No.** |
| Any new locally provable work identified? | **One:** `GGL-B16`, now owned by PRD-004d. Everything else needs an operator, a portal, or provider fixtures. |
| Library schema v2 drift | No blocking drift. One low-severity finding (missing folder READMEs), recorded below, not fixed here. |

## Coverage: every parked row has an owner

| Row | Subject | Owning requirement document | State |
| --- | --- | --- | --- |
| `GGL-B01` | Preview deploy on `operation-automated-lo-web` only | PRD-004a `004A-AC-001` | Blocked: operator |
| `GGL-B02` | Smoke log retained, no tokens or PII in git | PRD-004a `004A-AC-006` | Blocked: operator |
| `GGL-B03` | Review `OALO_DATABASE_URL`; create → reload → approve on preview | PRD-004a `004A-AC-002`/`004`/`005`, PRD-004 `RGL-003` | Blocked: operator |
| `GGL-B04` | Developer Portal inspection with listing type recorded | PRD-004b `004B-AC-001` | Blocked: portal sign-in |
| `GGL-B05` | OAuth callback and Custom Page URL match the preview hostname | PRD-004b `004B-AC-002` | Blocked: hostname decision |
| `GGL-B06` | Test Link install into a sandbox location | PRD-004b `004B-AC-003` | Blocked: operator |
| `GGL-B07` | Create → persist → approve after install | PRD-004b `004B-AC-004` | Blocked by `B03` + `B06` |
| `GGL-B08` | No tokens, secrets, or PII in git | PRD-004b `004B-AC-005` | Blocked: operator notes discipline |
| `GGL-B09` | Submission packet, Loom, screenshots, submit | PRD-004c `004C-AC-001` through `005`; **content** now PRD-004e | Content authored; capture blocked |
| `GGL-B10` | Do not flip the 28 deferred G2 criteria | PRD-004 `RGL-008`, PRD-004d `004D-AC-007` | Honored on this branch |
| `GGL-B11` | Per-environment KMS rotation and isolation inventory | PRD-001 `001J-AC-026`, `001J-AC-029`; [env-isolation-and-kms pack](../../../docs/operations/evidence-packs/env-isolation-and-kms.md) | Parked: Wave 2 |
| `GGL-B12` | Launch Ready and AI cost operations evidence | PRD-001 `001J-AC-033`, `001H-AC-001`, `001I-AC-007`, `001I-AC-014`; [launch-ready-and-ai-cost pack](../../../docs/operations/evidence-packs/launch-ready-and-ai-cost.md) | Parked: Wave 7 |
| `GGL-B13` | Legal / AI data handling sign-off | PRD-001 `001I-AC-013`; [g7-legal-and-ai-data pack](../../../docs/operations/evidence-packs/g7-legal-and-ai-data.md) | Parked: Wave 6 |
| `GGL-B14` | G5 synthetic lead evidence | PRD-001 `001F-AC-026`; [g5-synthetic-lead pack](../../../docs/operations/evidence-packs/g5-synthetic-lead.md) | Parked: Wave 4 |
| `GGL-B15` | G4 Housing Special Ad Category rows | PRD-001 `001E-AC-005`, `001E-AC-006` | `ACCEPTED CONSTRAINT`; not reopened |
| `GGL-B16` | Real-Postgres command round trips in the canonical CI gate | **PRD-004d** (new) | Blocked: database URL or route decision |

### The two gaps this branch closed

1. **`GGL-B16` had no owning requirement.** It appeared in the raid ledger, in PRD-004a's blocker table, and as a one-line "optional" item in the project map, but no requirement document stated its acceptance criteria or the provisioning decision behind it. It is also the **only** remaining locally provable row on the board, which made the omission the most consequential one. Now [PRD-004d](../in-work/prd-004-reviewable-go-live/prd-004d-reviewable-go-live-postgres-command-gate.md).

2. **`GGL-B09` had a checklist but no content.** `004C-AC-002` requires that the listing description claim only create → persist → approve, and `004C-AC-003` requires the Loom to match live behavior, yet no listing copy, shot list, or Loom script existed anywhere in the repository. The operator would have had to draft customer-facing claims live in the portal at submission time, which is the exact condition under which overclaiming happens. Now [PRD-004e](../in-work/prd-004-reviewable-go-live/prd-004e-reviewable-go-live-listing-content-and-demo-script.md) plus the [listing copy pack](../../knowledge/private/product/marketplace-listing-copy-pack.md) and two customer-facing source documents.

### Sequencing gap also closed

The smoke checklist, the portal inspection checklist, and the submission packet each described their own step well, but no single document held the **order**, the **return artifact** per step, or the **abort conditions**. The [production tonight operator runbook](../../knowledge/private/operations/production-tonight-operator-runbook.md) now does, and deliberately does not restate the checklists it links to.

## Acceptance criteria authored on this branch

| Document | New criteria | Marked `DONE` on this branch | Marked `BLOCKED` or `OPEN` |
| --- | ---: | ---: | ---: |
| PRD-004d | 8 (`004D-AC-001` through `008`) | 3 (describe code already on `main`) | 5 |
| PRD-004e | 9 (`004E-AC-001` through `009`) | 8 (artifacts exist in this branch) | 1 |

No criterion authored here is marked `VERIFIED`. Verification requires an independent pass that has not happened. The `DONE` rows in PRD-004e are self-evidently checkable (the files exist and can be read); the `DONE` rows in PRD-004d point at merged code in `packages/db/test/` and `packages/config/`.

## Honest non-claims

This branch deliberately does not:

- change any of the 305 PRD-001 acceptance-criterion rows, or the counts 267 / 28 / 7 / 2 / 1;
- claim any HighLevel, Meta, Stripe, KMS, or counsel evidence exists;
- claim a preview deploy, portal sign-in, Test Link install, or Marketplace submission occurred;
- claim production traffic is authorized;
- reopen G1, G4, or G8.

The one status improvement it does claim is documentary: previously unowned work now has owners, and the listing content that `004C-AC-002` audits now exists to be audited.

## Library drift check (schema v2)

Read-only scan of `library/` at this branch.

| Check | Result |
| --- | --- |
| v1 path remnants (`knowledge-base/`, `architecture/`, `requirements/features/`, `requirements/issues/`, `qa/` at root) | None |
| PRD folder naming `prd-<###>-<slug>/` | 4 folders, all conforming |
| IRD folder naming | No IRD folders exist |
| Missing PRD index files | None; all 4 present |
| Missing PRD `qa/` subfolders | None; all 4 present |
| Duplicate PRD numbers across `backlog/`, `in-work/`, `completed/` | None. Highest is 004; next available top-level number is **005** |
| Sub-PRD letter sequence under PRD-004 | Contiguous: `a`, `b`, `c`, `d`, `e` |
| `library/notes/` contents | `README.md` only; untouched by agents |
| Folder READMEs | **Low-severity drift:** 24 directories lack `README.md`, mostly domain folders under `knowledge/private/` plus per-PRD folders. Listed below. Not fixed here. |

### Low-severity drift detail

Guide 06 expects a seeded `README.md` in every schema v2 folder. Missing at this baseline: `knowledge/`, `requirements/`, the domain folders `knowledge/private/{ai,commercial,competitive,compliance,frontend,integrations,product,research,security}`, the nested `knowledge/private/discovery/{assumption-maps,experiments,interview-scripts}` and `knowledge/private/ux-ui/{03-components,04-screens,05-html-examples,...}`, and the four per-PRD folders.

This is cosmetic and was left alone on purpose: seeding 24 READMEs would bury the substantive requirements work in this diff, and none of these folders is ambiguous to a reader. Recommended as a separate hygiene pass. The four folders created on this branch (`knowledge/public/overview/`, `knowledge/public/faqs/`, `knowledge/private/operations/`, and the refreshed `knowledge/public/`) each carry a README.

### IRDs

`gh issue list --state open` returns nothing for this repository. Per the numbering invariant, IRD numbers must match GitHub issue numbers and are never invented, so **no IRD was created**. The parked work in this report is requirement work, not defect work, and belongs in PRDs.

## Recommended next actions

1. **Operator:** work the [runbook](../../knowledge/private/operations/production-tonight-operator-runbook.md) steps 1 to 4. Steps 6 and 7 can run in parallel at any time.
2. **Product owner:** supply the three missing listing values (support email, publisher display name, pricing) and confirm the Standard listing-type default.
3. **Engineering:** pick provisioning route R1 or R2 in PRD-004d, or run the single command in its operator ask.
4. **`quality-guardian`:** audit the PRD-004e copy against the demonstrated scope before submission, and the PRD-004d criteria after the first observed run. Run after `security-guardian`, never before.
5. **Separate hygiene pass:** seed the 24 missing folder READMEs.
