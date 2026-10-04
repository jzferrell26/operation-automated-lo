# Security Review: PRD-009 Marketing Toolkit, close-out pass 1 (MTK-003)

**Review date:** 2026-10-03
**Reviewer:** `security-guardian` (paired weapon: `security-weapon`), Opus, read-only pass
**Branch:** `claude/prd-009-marketing-toolkit`, head `de69e09e`, diff `e89058e...de69e09e` (`e89058e` is `main`, PRD-008's merge)
**Type:** the early MTK-003 close-out pass on the near-final tree. A short delta pass follows on the final head. Nothing in the tree was edited, staged, or committed; this file is the only file written, and it is left uncommitted.
**Verdict:** **NOT YET MET.** Code: zero Critical, zero High, **one Medium** (SEC-009-02). Dependencies: **one High advisory** (SEC-009-01) published against the unchanged lockfile, dev-only and unreachable from the product, with no patched version on npm, so it needs an owner decision. Four Low and seven Info. Every authoring-time Medium (M-1 to M-9, N-1, N-2, N-7) holds in the built code.

---

## Executive Summary

The PRD-009 code is in good shape. The fail-closed sample guard, the contained art read, the strict server-side save, the catalog port in the approval command, the content-derived approval snapshot, and the session-sourced approver name all match the authoring review's fixes, and the probes run for this pass could not break any of them. Two items stop MTK-003 at this head:

1. **SEC-009-01 (High, dependency).** `pnpm audit` now reports GHSA-vfj7-8cjw-p6xm (braces, CVSS 7.5) through `apps/tasks > trigger.dev`, a dev-only CLI. The advisory was updated on 2026-10-02 at 22:36 UTC, after the ledger's last green `audit:dependencies`, so `pnpm verify:offline` (and with it CI's "Application verification") fails at this head and on `main` alike. No braces release fixes it yet, so no version bump can clear it (MTK-010); the owner must decide.
2. **SEC-009-02 (Medium, code).** The number-word half of `WORDS_NUMBER` misses "dozen" and any number word that is not directly beside its unit, so "A dozen years, fixed" and "Two dozen months to pay" pass every word check. It is a few lines in `packages/domain/src/library-ad-words.ts` and five table cases.

Scope note: the stack is Next.js 16.3.6, React 19.3.0, TypeScript, Node 24.18.0, and Postgres through `postgres` 3.4.9, which is this weapon's target stack, so coverage is full.

---

## Arming and pre-flight

- Read `security-weapon/SKILL.md`, `guides/00-principles.md`, and the PRD set: the index (acceptance criteria, risks, scope contract, API changes, amendments), 009c D1 to D7 and its criteria, 009d D3 to D7 and its criteria, 009E-AC-004 and D2, and `qa/2026-10-01-authoring-security-review.md` in full (M-1 to M-9, N-1 to N-8, L-1 to L-11). Read the ledger section "# Gauntlet raid: marketing toolkit (PRD-009)", raid log rows 2026-10-01 to the redraw.
- **Ordering.** `library/qa/` does not exist. This PRD's `qa/` folder holds interim verifier and writing reports dated 2026-10-02, and no MTK-004 `quality-guardian` close-out report. No ordering inversion; MTK-004 must run after this review and its delta pass.
- **Intelligence freshness.** `research/cve-watchlist.md` says `Last refreshed: 2026-04-24`, 162 days ago, past the 120-day threshold (SEC-009-I2). Framework versions were checked against `pnpm audit` and the lockfile directly instead.
- **Instruction conflict, resolved.** The guardian's own rule is "fix Critical and High in session"; this task is read-only by explicit instruction, so every fix below is written for the run to apply.

## Commands run

| Command | Result |
|---|---|
| `pnpm audit --audit-level=low` | **Exit 1.** 1 high: braces <= 3.0.3, GHSA-vfj7-8cjw-p6xm, paths `apps__tasks>trigger.dev>braces`, `>c12>chokidar>braces`, `>chokidar>braces`, all `dev: true` |
| `pnpm audit --json` | Same single advisory; 611 dependencies (117 prod, 458 dev, 156 optional) |
| `pnpm audit --prod --audit-level=low` | "No known vulnerabilities found" |
| `pnpm audit:secrets` | "Secret audit passed across 6 source roots and the public environment boundary." |
| `pnpm test:unit` | 160 files, 2217 tests passed |
| `vitest run --project contracts tests/security` | 6 files, 40 tests passed |
| `pnpm audit:boundaries` | Passed for 16 packages; the fixture rejects 2 prohibited edges |
| Targeted probes (scratchpad only) | The domain word and place checks bundled from source with the repository's own esbuild 0.25.0 and run against 60 adversarial strings and a timing battery at every field's maximum length (worst 31 ms, no catastrophic backtracking). The probes ran on the scratch shell's Node 22.19.0; they exercise pure regular-expression logic, and the one engine-specific claim (SEC-009-06) was re-checked on Node 24.18.0 |
| Supply chain spot check | `git hash-object` of `apps/web/public/fonts/InterVariable.woff2` and `LICENSE.txt` equals the blob SHAs `gh api repos/rsms/inter/contents/...?ref=v4.1` reports (`5a8d3e72...`, `9b2ca37b...`) |

Not run, as instructed: browser suites, database suites, `pnpm build` (four design reviewers share the tree).

---

## Scorecard

| Category | Status | Findings |
|---|---|---|
| Financial / payment security | OK | 0 (no payment surface changed; budgets bounded at $5 to $1,000 a day and $5,000 total, server-side) |
| PII exposure | OK | 0 open; approver name from the session only, named in retention and export docs; I-5 |
| Authentication and authorization | OK | 0 open; I-4 (defence in depth) |
| Injection (SQL, XSS, path, ReDoS) | OK | 0; text-only rendering, parameterised SQL, contained art read, no catastrophic regex |
| Ad compliance controls (word checks, places, control 9) | **ATTN** | SEC-009-02 (Medium); SEC-009-03 to 06 (Low) |
| Sample-ads guard and catalog integrity | OK | 0 |
| Provider side effects | OK | 0 |
| Dependency security | **FAIL** | SEC-009-01 (High, dev-only, no fix published) |
| Configuration and headers | OK | 0; CSP, `proxy.ts`, and security headers unchanged; redirects are fixed pairs |
| Public repository hygiene | OK | 0 open; I-5, I-6 |

---

## High

### SEC-009-01. A High advisory against the lockfile breaks the dependency gate, and no fixed version exists

- **Severity:** High as published (CVSS 3.1 7.5, AV:N/AC:L/PR:N/UI:N/A:H) and as `pnpm audit:dependencies` counts it. Reachability in the shipped product: none found.
- **Location:** `pnpm-lock.yaml:1728` and `:4388` (`braces@3.0.3`), reached only through `apps/tasks/package.json:26` (`"trigger.dev": "4.6.4"` under `devDependencies`), via `trigger.dev`, `c12 > chokidar`, and `chokidar`. Gate: `package.json:30` (`audit:dependencies`) inside `verify:offline` (`:35`), which `.github/workflows/ci.yml:65` runs as "Application verification".
- **Facts checked on 2026-10-03:** `gh api advisories/GHSA-vfj7-8cjw-p6xm` gives published 2026-09-18, updated 2026-10-02T22:36:34Z, vulnerable `<= 3.0.3`, `first_patched_version: null`. npm's audit metadata says `>=3.0.4`, but `npm view braces versions` ends at 3.0.3 (published 2024-05-21), so that version does not exist. `trigger.dev@latest` (4.7.2) still declares `braces: ^3.0.3`, so upgrading the CLI does not help. The lockfile is unchanged from `main` (`git diff e89058e...de69e09e -- pnpm-lock.yaml` is empty), so `main` fails the same gate; PRD-009 did not introduce it. The ledger's last green `audit:dependencies` (raid log, 2026-10-02, `e45a5ac6`) predates the advisory update.
- **Failure scenario:** the next push of this branch fails "Application verification" at `pnpm audit:dependencies`, which blocks MTK-002, and MTK-003 counts "any advisory published against the final head's lockfile before ship". The vulnerability itself is a stack-exhaustion denial of service when braces expands a deeply nested pattern; here braces only expands the developer's own watch globs inside `trigger dev` on a developer machine, and `pnpm audit --prod` is clean, so no request, job, or deployed bundle reaches it.
- **Fix (owner decision required; the run may not take it alone):** MTK-010 allows only a version bump to clear an advisory and none exists, and the scope contract forbids dismissing an alert by hand, so the run should mark this BLOCKED with this ask. Either (a) the owner accepts the risk for this dev-only path: change `audit:dependencies` to `pnpm audit --audit-level=high --ignore GHSA-vfj7-8cjw-p6xm` (the `--ignore <GHSA>` flag is in `pnpm audit --help` on pnpm 11.15.1, verified), record the acceptance, the reachability above, and a revisit date in the ledger, and remove the ignore when braces 3.0.4 ships; or (b) wait for a braces release that fixes it and pin it through `pnpm-workspace.yaml` `overrides` (`braces: ">=3.0.4"`). A `pnpm-workspace.yaml` audit-ignore setting may also exist in pnpm 11; that is UNVERIFIED here, so the verified CLI flag is the recommended form.

## Medium

### SEC-009-02. The number-word backstop misses "dozen" and number words that are not directly beside their unit

- **Severity:** Medium. It is a term claim passing the blanket number rule that N-1 and N-7 made the conservative default, held at Medium for the same reasons the authoring review gave N-7: a human approves each version, and launch is disabled.
- **Location:** `packages/domain/src/library-ad-words.ts:74-79` (`NUMBER_WORDS` stops at zero to twenty, the tens, hundred, thousand, million; `NUMBER_WORD_UNIT` needs the number word directly before the unit), `:148-152` (the term patterns need the same adjacency), `:326-331` (`hasNumber`). The places module already treats `dozen`, `dozens`, `few`, and `several` as number words (`packages/domain/src/library-ad-places.ts`, `LIBRARY_AD_PLACE_NUMBER_WORDS`).
- **What fails (probed on this head, headline field, no saved partners):** "A dozen years, fixed", "Fixed for a dozen years", and "Two dozen months to pay" each produce **no finding at all**. Each states a loan term or a payment period in words, which 009d D5 says the number-word part of `WORDS_NUMBER` refuses ("a number word next to percent, year, month, or payment") and which `compliance-and-risk.md:48` makes a controlled field. Controls behave as specified: "Twelve years fixed" and "Half a percent lower" are refused.
- **Fix:** add `dozen|dozens|score` to `NUMBER_WORDS`, and let `NUMBER_WORD_UNIT` and the word-based term pattern accept a run of number words with an optional "and", "a", or "of" before the unit (for example `(?:NUMBER_WORDS)(?: (?:NUMBER_WORDS|and|a|of))* (?:units)`), as `QUANTITY_IN_WORDS` already does for percent. Add to the 009D-AC-010 table: refused "A dozen years, fixed", "Fixed for a dozen years", "Two dozen months to pay"; passing "Ask me about first-time buyer programs" and "Down payment help". No screen or string changes, so no baseline is affected.

## Low

### SEC-009-03. A 10-digit run after a license keyword passes as a license reference, so a phone number can print in Brand text

- **Location:** `packages/domain/src/library-ad-words.ts:265-272` (`LICENSE_REFERENCE`, `isLicenseDigits` allows 4 to 12 digits and refuses only the 7-digit `555-1212` shape) and `:380-392` (`phoneTerm` skips any phone match inside a license span); `apps/web/src/features/workspace/model.ts` (`NMLS_ON_SAVE`, 4 to 12 digits).
- **Scenario (probed):** disclosure line "NMLS 8005551212. Equal Housing Lender.", disclosure line "License 2125550199 Equal Housing", and company "Acme NMLS 8005551212 Lending" pass `WORDS_NUMBER` and `WORDS_CO_BRAND`. The Brand NMLS field accepts the same 10 digits and the band prints "NMLS 8005551212". D5 blocks "a phone number" in every checked text, mainly so no Realtor contact rides on an ad (control 9). Hyphenated or spaced phone numbers ("NMLS 800-555-1212") are refused, as the table requires.
- **Why Low:** it needs a license keyword in front, reads to an approver as a license number, and carries contact details, not a rate or term; launch is disabled.
- **Fix:** in `phoneTerm`, refuse a run of exactly 10 digits, or 11 starting with 1, even inside a license span; or cap license references and the NMLS fields at the length counsel confirms (today's NMLS IDs appear to be at most 7 digits, UNVERIFIED). Add "NMLS 8005551212" as a refusal in 009D-AC-010.

### SEC-009-04. Claim and co-brand vocabulary gaps

- **Location:** `packages/domain/src/library-ad-words.ts:95-161` (`CLAIM_PATTERNS`), `:333-343` (`CO_BRAND_TERMS`).
- **Probed passes:** "Locked in for a decade and a half", "Your payment, locked for a decade", "A couple of points off", "Teaser: half off closing" (claim rule); company "Mortgage broker & realty partners", title "Partnered with Keller Williams", company "Prairie Lending, a Coldwell Banker company" with no saved partner, headline "Real-tor approved" (co-brand rule).
- **Why Low:** this is the deterministic detector's open vocabulary, the family the Wave 3 verifier logged as W-1 and the index accepts under R-4. The structural control 9 holds (no partner key in the `library-ad` variant, `packages/contracts/src/campaign-foundation.ts` `LibraryAdCampaignManifestSchema`), a curator reviews every default, and a person approves every version.
- **Fix:** add `realty`, `real estate` as a company word, `partnered with`, `partnering with`, `affiliated with`, `in association with`, and `brought to you by` to the co-brand list, and `decade` with "locked", "fixed", or "for", and `closing costs` with an amount word or "off", to the claim list, each with a table case; counsel extends the lists (009F-AC-014 part c).

### SEC-009-05. City names can carry race, national-origin, and religion words

- **Location:** `packages/domain/src/library-ad-places.ts:78` (`LIBRARY_AD_PLACE_AUDIENCE_WORDS`) and the same list in `packages/contracts/src/ad-places.ts`.
- **Scenario (probed):** "Black Austin, TX", "Indian Houston, TX", "Mexican Austin, TX", "Arab Dearborn, MI", and "Hindu Edison, NJ" all pass `libraryAdPlacesProblem` and would be stored as cities. The list has hispanic, latino, asian, christian, muslim, jewish, and catholic, but not black, white, african, arab, indian, native, mexican, chinese, korean, hindu, sikh, buddhist, church, mosque, or synagogue. Every M-2 case the PRD names is refused.
- **Why Low:** no targeting call exists; a city is a name, matched to Meta's locations only in a later PRD (009d D4); step 3 shows every value to the approver. Fair-housing relevance is for counsel.
- **Fix:** a word list cannot carry this alone, because real places hold these words (White Plains, NY; Indian Wells, CA; Temple, TX; Black Mountain, NC; Mexican Hat, UT). Record in the Meta publish PRD that every city must resolve to a gazetteer or Meta location key before launch, and meanwhile add the missing protected-class words with exact-match exceptions for real places, as `AD_PLACE_NAMED_EXCEPTIONS` already does.

### SEC-009-06. Invisible default-ignorable marks are not refused

- **Location:** `packages/domain/src/library-ad-words.ts:246` (`INVALID_CHARACTER` covers Cc, Cf, Zl, Zp, Co, Cs, and angle brackets) and `packages/domain/src/library-ad-text.ts:201` (`LIBRARY_AD_INVISIBLE`).
- **Scenario (probed):** headline "Rates" + U+034F (combining grapheme joiner) + "down" stores with no `WORDS_INVALID_CHARACTERS` finding. U+FE00 to U+FE0F, U+E0100 to U+E01EF, and U+180B to U+180D, U+180F behave the same, because they are nonspacing marks, not format characters. The readings strip every mark (`library-ad-text.ts:202`, `:220`), so no claim hides inside a word ("r" + U+034F + "ates" and "low r" + U+FE0F + "ates" are refused); the gap is that invisible characters reach the stored manifest and the approver's screen, against D5's intent.
- **Fix:** add `\p{Default_Ignorable_Code_Point}` to `INVALID_CHARACTER` (verified on Node 24.18.0: it matches U+034F, U+FE0F, U+E0100, U+180B, U+200B, U+3164, U+115F) and keep the existing Braille and Khmer blanks; add a U+034F case to 009D-AC-010's evasion table.

## Info

- **SEC-009-I1. Ordering.** No MTK-004 report exists yet; the 2026-10-02 reports are interim verifications. Run `quality-guardian` after this review's delta pass, never before.
- **SEC-009-I2. Stale CVE watchlist.** `research/cve-watchlist.md` was last refreshed 2026-04-24 (162 days). Re-run `forge-weapon` for `security-guardian`. Next 16.3.6 and React 19.3.0 are far past the 2025 patch lines in `guides/06-cve-tracker.md`, and `pnpm audit` lists no advisory for either.
- **SEC-009-I3. Review seeding guard, verified.** `assertReviewRunDatabase` (`packages/db/test/campaign-integration-support.mjs:1022`) requires `OALO_REVIEW_BROWSER_RUN=true`, a loopback host, and a database matching `^/oalo_test_[a-z0-9_]{1,40}$` (`:1011`), and its errors never quote the connection string; `seedReviewAccountCampaigns` (`:1114`) checks it before opening a pool and then requires `@oalo.invalid` (`:1013`). `postgres` 3.4.9 takes the TCP host from the URL's hostname (a `?host=` query becomes a startup parameter, and a comma multi-host fails the WHATWG loopback check), so the URL check cannot be steered elsewhere. Its only importer is `tests/browser/review/helpers/seed-campaign-history.ts` through `packages/db/test/route-seeding-bridge.js`, and `tooling/tests/unit/runtime-authentication/seeding-bridge-reachability.test.ts` (passing) proves nothing under `packages/db/test/` is reachable from `apps/web/src`. Optional hardening: refuse every `OALO_ENVIRONMENT` other than unset, `local`, or `test`, not only `production` (`:1028`).
- **SEC-009-I4. Defence in depth on campaign reads.** `apps/web/src/server/launch-an-ad.ts` (`loadLaunchPage`) and `apps/web/src/server/library-ad-save.ts:143-147` read a campaign by reference without the application's `assertCampaignAccessible`. Isolation holds through the SQL filter `location_id = platform.current_location_id()` inside `withTenantTransaction` (`packages/db/src/campaign-repository.ts:141`, `:694`) and RLS, and the local demo store is single-principal. Calling `assertCampaignAccessible(principal, record.version)` after each read would match the projection path.
- **SEC-009-I5. A test fixture uses "NMLS 123456".** `apps/web/src/features/workspace/ad-brand-editor.integration.test.tsx:79`, `:255`; whether it names a real licensee is UNVERIFIED (L-6). It is not rendered to users or captured in a picture. Prefer "NMLS 0000000".
- **SEC-009-I6. Homeowner reports in the menu.** The menu now lists Homeowner reports for every account (009A-AC-014, owner decision D-4); the feature stays off unless `OALO_HOMEOWNER_REPORTS` is `enabled` (`apps/web/src/server/homeowners/runtime.ts:52-53`, `:89`; `scheduler.ts:136`), so no side effect is enabled (MTK-005 holds).
- **SEC-009-I7. Version history reads are one query pair per version.** `PostgresCampaignReadRepository.listVersionsOf` (`packages/db/src/campaign-repository.ts`) reads each version's check and decision separately with no cap. Tenant-scoped; performance only.

---

## The authoring findings in the built code

| ID | Holds? | Evidence |
|---|---|---|
| M-1 Brand, disclosure, lead form read on the server | Yes | `apps/web/src/server/library-ad-save.ts:52-64` (`.strict()`, no brand field), `:150-177` (brand from `readSavedAdBrand`); `apps/web/src/server/ad-brand-read.ts:52-95`; `apps/web/src/features/workspace/ad-brand.ts:49-56` (title 60, disclosure 120, lead form 300, preset enum); `packages/domain/src/library-ad-ruleset.ts:168-181` (every Brand text checked) |
| M-2 Places structured and validated | Yes | `packages/contracts/src/ad-places.ts:380-401` (400 on any bad value); `packages/domain/src/campaign-foundation.ts:435-447` (`TARGETING_NOT_ALLOWED` on stored values); manifest regex and empty ZIP, audience, protected lists in `LibraryAdCampaignManifestSchema`. Residual: SEC-009-05 |
| M-3 Normalised, evasion-resistant checks | Yes, with SEC-009-02 and 06 | `packages/domain/src/library-ad-text.ts:212-240` (NFKC, case, invisible removal and spacing, confusables, two readings); `library-ad-words.ts:186-233` (closed-up and joined-run readings) |
| M-4 Fail-closed sample guard | Yes | `apps/web/src/features/ads-library/server/catalog-loader.ts:60-64` (raw `enabled`, raw `local`, any of `VERCEL`, `VERCEL_ENV`, `OALO_RELEASE_MANIFEST_JSON` refuses, empty string included); sample catalog read from disk only after the guard (`:254-257`, `:297`); flag named only in the allowlisted files; `audit:sample-ads` in `verify:offline` |
| M-5 Approval binds art bytes; snapshot union | Yes | `contentSha256` in the manifest images; `packages/application/src/campaign-foundation.ts:319` (`approvalSnapshotFor`, content-derived references); `packages/application/src/campaign-approval-command.ts:100` (digest mismatch refused), `:83` and `:287` (port required at run time as well as in the type) |
| M-6 Approver name from the session | Yes | `apps/web/src/server/campaign-approval-handler.ts:26-35` (strict body), `resolveApproverDisplayName` (session port only, fallback recorded as nothing, capped at 200); no file under `supabase/` changed; no grant added |
| M-7 Derived, contained art; fixed sample route | Yes | `catalog-loader.ts:126-127` (derived-name regex), `:139-179` (realpath containment, regular file, 1 MiB, magic bytes, size, SHA-256); `apps/web/src/features/ads-library/server/sample-art-route.ts:38-76` (guard first, typed parts, catalog lookup, 404 otherwise, `nosniff`); route has three segments and no catch-all |
| M-8 Intake and approval record | Yes | `apps/web/src/features/ads-library/catalog/README.md:41`, `:49`; the real catalog is `[]` |
| M-9 Control 9 by structure | Yes, with SEC-009-04 | No partner, property, or Realtor key in `LibraryAdCampaignManifestSchema`; `WORDS_CO_BRAND` reads every checked text |
| N-1 Number backstop on every text | Yes, with SEC-009-02 | `library-ad-words.ts:326-331` |
| N-2 Exceptions defined exactly | Yes | `library-ad-words.ts:346-356` (whole phrase, never deleted first), `:362-375` (exact host, host only, one address, disclosure line only) |
| N-7 License reference and ordinal adjacency | Yes, with SEC-009-03 | `library-ad-words.ts:265-324` |
| N-3 to N-6, N-8, L-1 to L-11 | Yes | Role beside name and `approverDisplayName` refused; retention and export docs name it (`docs/operations/retention-and-deletion.md:40`, `export.md:39`); property-free consent default; offline `catalog.lock.json`; bare "#" not a keyword; port in the command; text-only rendering (no new `dangerouslySetInnerHTML`, `innerHTML`, or `srcDoc`); `?from` is an enum; font matches upstream v4.1; `server-only` on the loader; setup profile drops Realtor fields on write; bounded strict save; version numbers validated and cross-location answers "not found" |

## The eight focus areas

1. **Sample-ads guard.** Holds (M-4, M-7 above). `server-only` resolves to Next's own compiled module (`next/dist/compiled/server-only/index.js` throws in a client graph, verified). No client file imports the loader, the catalog, or the approval port (import sweep of `apps/web/src`); cards and the review carry display fields only (`launch-an-ad.ts` `cardOf`), so `compliance` and `approval` stay on the server. The library page is `force-dynamic`.
2. **Server-side checks.** Hold (M-1 to M-3). Body capped at 16,000 bytes before parsing (`campaign-preflight-handler.ts:21`, `:83`); the 400 answer lists issue paths and codes, never input. The ad and version resolve from the catalog and must be active and highest (`library-ad-save.ts:124-134`). Place exceptions are exact "Name, ST" matches. Gaps: SEC-009-02 (Medium), 03 to 06 (Low); W-1 remains as accepted.
3. **Approval binding.** Holds (M-5, M-6). "Use the new version" posts through the same strict preflight route (`apps/web/src/features/ads-library/components/use-new-version.tsx:66`), so the server re-resolves the ad, reads the Brand, and appends version N+1; the offer is built on the server from catalog values.
4. **Review-database seeding.** Holds (SEC-009-I3).
5. **No new provider side effect.** Holds. `provider_publish` `available: false` and `providerPublicationAuthorized: false` (`packages/application/src/campaign-workspace-read.ts:127-142`); `META_ADAPTER_MODE = "fixture-plan"` (`packages/ghl/src/meta-adapter.ts:13`); "Launch on Facebook" has a literal `disabled` and no handler (`apps/web/src/features/campaigns/components/launch-on-facebook.tsx:28`); `/api/campaigns` holds only `approve` and `preflight`; the only form-body reader is sign-out's existing CSRF promotion, and every outbound request is a fixed host, both pinned by `tests/security/provider-side-effect-default-off.test.ts` (passing). `/api/setup/progress` answers a bodiless 404.
6. **Auth, session, and rendering changes.** No finding. `ThemeRuntimeProvider.tsx` holds client theme state only; the nonce-bearing bootstrap script accepts only the literals `light`, `dark`, `system` from storage. `SupportReference` renders the response header's reference as text, and `showsSupportReference` uses `Object.hasOwn` on a fixed table. Error and finding text renders as React text; finding remediations quote at most 60 characters of the person's own words. Title metadata is escaped by Next. The redirects in `apps/web/next.config.ts` are fixed in-app pairs.
7. **Public repository hygiene.** `audit:secrets` passes. A regex sweep of every added line (56,194) finds no live key, token, private key, or real credential; the only connection strings are `hunter2` fixtures that test the seeding guard; every email is under `example.com`, `example.test`, `example.invalid`, or `oalo.invalid`; every phone number is a 555 test value. The sample catalog uses the synthetic identity and "Sample catalog, not a real approval" on all ten entries; the real catalog is empty. Hidden Unicode appears only in two test files as deliberate evasion fixtures (`tooling/tests/unit/library-ad-checks/word-checks.test.ts`, `library-ad-ruleset.test.ts`); none in `.cursor/rules`. The owner's own name appears in quoted direction and the ledger by design (authoring I-6). The hosted Supabase project reference in docs predates this diff.
8. **`pnpm audit`.** One High, dev-only, unreachable from the product, no fix published (SEC-009-01). No other advisory at any level.

## Dependency audit

| Package | Severity | Advisory | Path | Fix available | Reachability |
|---|---|---|---|---|---|
| braces 3.0.3 | High (CVSS 7.5) | GHSA-vfj7-8cjw-p6xm | `apps/tasks > trigger.dev 4.6.4` (dev), three paths | No: npm's latest is 3.0.3; `trigger.dev` 4.7.2 still declares `^3.0.3` | Developer CLI watch globs only; `pnpm audit --prod` clean |

The lockfile is unchanged by PRD-009 (MTK-010 holds).

## Framework version check

| CVE | Patched threshold | This project | Status |
|---|---|---|---|
| CVE-2025-29927 (middleware bypass) | 14.2.25 / 15.2.3 | Next 16.3.6 | Patched |
| CVE-2025-55182 (React2Shell) | React 19.0.1 / 19.1.2 / 19.2.1 | React 19.3.0 | Patched |
| CVE-2025-66478, CVE-2025-55183, CVE-2025-55184 | Latest 16.x line | Next 16.3.6 | No advisory in `pnpm audit`; watchlist stale (I2) |

## Files changed by this review

- Created, uncommitted: `library/requirements/in-work/prd-009-marketing-toolkit/qa/2026-10-03-security-review.md` (this report). No other file in the worktree was touched; probes ran from the session scratchpad.

## Recommended follow-up

1. **Owner:** decide SEC-009-01 (accept with a dated `--ignore`, or wait for braces 3.0.4). Until then MTK-002 and MTK-003 cannot close.
2. **Run (before the final head):** fix SEC-009-02 in `packages/domain/src/library-ad-words.ts` with its five table cases; optionally SEC-009-03 and SEC-009-06 in the same file (each a few lines).
3. **Meta publish PRD:** resolve every city to a location key before launch (SEC-009-05); carry the vocabulary items to counsel (SEC-009-04).
4. **Delta pass:** re-read `library-ad-words.ts`, the `audit:dependencies` script, and any file changed after `de69e09e`, rerun `pnpm audit`, then hand to `quality-guardian` for MTK-004.

## Ordering note

This review ran before any MTK-004 report. Any fix made for SEC-009-01 or SEC-009-02 lands before `quality-guardian`, which must audit the final head after the delta pass.

---

# Delta pass (2026-10-03) at `0d539dee`

**Reviewer:** `security-guardian` (paired weapon: `security-weapon`), Opus, read-only pass.
**Scope:** `git diff de69e09e..0d539dee` (54 commits, 111 non-picture files), on `claude/prd-009-marketing-toolkit` at `0d539dee` (pushed). The run adds only redrawn pictures and documents after this head, so this is the final code. The 468 uncommitted baseline pictures in the worktree were ignored. Nothing in the tree was edited, staged, or committed except this appended section, which is left uncommitted for the orchestrator.
**Verdict: MTK-003 MET.** Critical 0. High 0 unresolved: SEC-009-01 is **accepted by the owner** (2026-10-03) and recorded as accepted, not unresolved. Medium 0: SEC-009-02 is resolved. Low: SEC-009-03 to 06 are resolved as specified; six new Lows (SEC-009-07 to 12) record what is left, one of them tagged NEEDS HUMAN REVIEW on the Medium/Low line. Info: two new (I8, I9).

## Pre-flight

- **Ordering.** `library/qa/` does not exist, and this PRD's `qa/` folder holds no MTK-004 `quality-guardian` close-out (the 2026-10-03 scored review is `ux-ui-guardian`'s 009G-AC-006 work). No inversion; MTK-004 runs after this pass.
- **Intelligence freshness.** `research/cve-watchlist.md` still says `Last refreshed: 2026-04-24` (SEC-009-I2 stands). Advisories were checked live instead (below).
- **Tree state.** `git status` shows only the 468 baseline pictures; `pnpm-lock.yaml` and every `package.json` are unchanged since `de69e09e` (MTK-010 holds).

## Commands run (Node 24.18.0, pnpm 11.15.1)

| Command | Result |
|---|---|
| `pnpm audit:dependencies` (`pnpm audit --audit-level=high`) | **Exit 0.** "1 vulnerabilities found. Severity: 1 high (1 ignored)" |
| `pnpm audit --audit-level=low` | Exit 0, the same single ignored high; nothing at any other level |
| `pnpm audit --prod --audit-level=low` | "No known vulnerabilities found" |
| `pnpm audit --json` | `metadata.vulnerabilities`: high 1, every other level 0; 611 dependencies (117 prod, 458 dev, 156 optional) |
| `pnpm audit:secrets` | "Secret audit passed across 6 source roots and the public environment boundary." |
| `pnpm test:unit` | 170 files, 2426 tests passed (includes `accepted-advisories.test.ts`, `word-checks.test.ts`, `places.test.ts`) |
| `vitest run --project contracts tests/security` | 6 files, 40 tests passed |
| `gh api advisories/GHSA-vfj7-8cjw-p6xm` | updated 2026-10-02T22:36:34Z, not withdrawn, `<= 3.0.3`, `first_patched_version: null`; `npm view braces versions` still ends at 3.0.3 |
| `gh api advisories?ecosystem=npm&updated>=2026-10-03` (16:28 UTC) | **Zero** npm advisories published or updated today. The 24 updated on 2026-10-02 were checked against the lockfile: only braces applies. trigger.dev (11 advisories, all fixed by 4.5.9 or earlier; the lockfile has 4.6.4) and hono (4 advisories, all `< 4.12.7`; the lockfile has 4.13.11) are past their ranges; http-cache-semantics, dompurify, @fastify/busboy, figlet, probe-image-size, and @a2ui/web_core are not in the lockfile |
| `pnpm config get auditConfig --json` in a scratch copy | pnpm reads a blank line and `ignoreCves` inside `auditConfig` (SEC-009-12) |
| Probes (scratchpad only) | `library-ad-words.ts`, `library-ad-places.ts`, and the contract's `ad-places.ts` bundled from source with the repository's esbuild 0.25.0 and run on Node 24.18.0: 112 word cases and 62 place cases, plus a timing battery at every field's maximum length. Check time grows linearly (600 characters: 0.3 to 0.4 ms after warm-up; the one 47 ms reading was first-call compilation). No catastrophic backtracking in the new run patterns or the place words |
| Added-line sweep | No key, token, private key, connection string, or email address added; the only phone shape is the test value 800-555-1212. No new `dangerouslySetInnerHTML`, `innerHTML` write, `srcDoc`, `eval`, or external `url()`/`@import` in CSS |

Not run, as instructed: browser suites, database suites, `pnpm build`.

## Scorecard at `0d539dee`

| Category | Status | Findings |
|---|---|---|
| Financial / payment security | OK | 0 (no payment or budget code changed) |
| PII exposure | OK | 0; the demo Brand page shows the fixture identity only, in synthetic mode only |
| Authentication and authorization | OK | 0; no route, handler, principal, or session code changed |
| Injection (SQL, XSS, path, ReDoS) | OK | 0; text-only rendering, fixed in-app links, linear check time |
| Ad compliance controls (word checks, places) | OK with Lows | SEC-009-02 resolved; SEC-009-07 (NEEDS HUMAN REVIEW), 08 to 11 (Low) |
| Sample-ads guard and catalog integrity | OK | 0; files unchanged |
| Provider side effects (MTK-005) | OK | 0; files unchanged, test passes |
| Dependency security | OK (accepted) | SEC-009-01 accepted; SEC-009-12 (Low, the guard test) |
| Configuration and headers | OK | 0; `next.config.ts`, `proxy.ts`, CI unchanged |
| Public repository hygiene | OK | 0 |

## The early pass's findings on this head

### SEC-009-01. ACCEPTED (owner decision, 2026-10-03)

- **Location:** `pnpm-workspace.yaml:42-49` (dated comment, then `auditConfig.ignoreGhsas: [GHSA-vfj7-8cjw-p6xm]`); `tooling/tests/unit/dependencies/accepted-advisories.test.ts:13` (`ACCEPTED`), `:35-37`, `:39-43`; commits `86a9a672` and `43049f8c`; ledger MKR-003.
- **Verified:** the list holds only GHSA-vfj7-8cjw-p6xm; the reason beside it names the date, the owner, SEC-009-01, the dev-only path through `trigger.dev`, the clean `pnpm audit --prod`, and when to remove it; the test passes; `pnpm audit:dependencies` exits 0 with "1 high (1 ignored)"; `pnpm audit --prod` stays clean; the advisory is unchanged since the acceptance and still has no fix. The `pnpm-workspace.yaml` setting the early pass marked UNVERIFIED is real: pnpm 11.15.1 reads `opts.auditConfig?.ignoreGhsas` in `pnpm audit` (checked in its bundled source), and `pnpm audit` reports the advisory as ignored.
- **Status:** accepted, not unresolved. Residuals: SEC-009-12 (the guard test is narrower than it says) and SEC-009-I8 (no revisit date).

### SEC-009-02. RESOLVED

- **Location of the fix:** `packages/domain/src/library-ad-words.ts:81` (`dozen`, `dozens`, and `score` after "a", "an", or another number word), `:91` (`NUMBER_RUN`), `:92` (`NUMBER_WORD_UNIT`), `:189` (the word term pattern); commit `c60c7047`; D5 amended (`0efb391a`).
- **Probed:** refused, each with `WORDS_RATE_PAYMENT_OR_TERM_CLAIM` and `WORDS_NUMBER`: "A dozen years, fixed", "Fixed for a dozen years", "Two dozen months to pay", "Thirty and a half years", "A score of years", "Four score years", "A baker's dozen years", "Two-dozen months", "Twenty-five years", "Five and twenty years", "Dozens of months to pay", "Twelve. Years. Fixed.". Passing as intended: "Credit score and payment history", "Your credit score, explained", "A score and payment history review", "Score a great home", "Dozens of families helped", "Ask me about first-time buyer programs", "Down payment help". The fix is the one the early pass recommended. What is left is a different, narrower case: SEC-009-07.

### SEC-009-03. RESOLVED (ASCII digits); residual in SEC-009-08

- **Fix:** `library-ad-words.ts:457` (`phoneTerm` refuses a phone shape anywhere, a license reference included).
- **Probed, refused as `WORDS_CO_BRAND`:** disclosure "NMLS 8005551212. Equal Housing Lender.", "License 2125550199 Equal Housing", "NMLS #8005551212", "NMLS: 18005551212", "NMLS ID 800-555-1212", "Lic. 800.555.1212", fullwidth "NMLS ８００５５５１２１２"; company "Acme NMLS 8005551212 Lending"; name "Alex NMLS 8005551212". Still passing as licenses: "NMLS 1234567", "NMLS 28005551212" (11 digits not starting with 1 is not a phone shape).

### SEC-009-04. RESOLVED (the listed vocabulary); residual in SEC-009-10

- **Fix:** `library-ad-words.ts:138` ("points off/lower"), `:161-181` (closing costs), `:192-198` (`locked`, `locked in`), `:389-414` (realty, real tor, partnered/partnering with, affiliated with, in association/collaboration/affiliation with, brought to you by), `COMPANY_CO_BRAND_TERMS` ("real estate" in the company only).
- **Probed, refused:** "Locked in for a decade and a half", "Your payment, locked for a decade", "Locked for fifteen years", "A couple of points off", "A few points lower", "Teaser: half off closing", "Half off your closing", "Closing costs covered", company "Mortgage broker & realty partners", title "Partnered with Keller Williams", "Real-tor approved", "R.E.A.L.T.Y approved", company "Prairie Real Estate Lending", "Brought to you by Prairie Homes", "In association with Prairie Homes". **Passing as intended:** "Partnered with you", "Partnering with first-time buyers", "Buying real estate? Start here.", "Understand your closing costs", "Take the stress off closing day", "Points of view on buying".

### SEC-009-05. RESOLVED as specified; the exceptions open no bypass; residual in SEC-009-11

- **Fix:** 39 words in `packages/domain/src/library-ad-places.ts:93` and the equal list in `packages/contracts/src/ad-places.ts:203-243`; 161 exact "Name, ST" pairs in `AD_PLACE_NAMED_EXCEPTIONS` with their Census TIGERweb and GNIS sources; D4 amended, including "before any provider launch every city must resolve to a gazetteer entry or a Meta location key (the Meta publish PRD, future work)", which is the structural fix the early pass asked to record.
- **Exception bypass attempts (all refused, contract and domain):** "White Plains Black, NY", "Black White Plains, NY", "White Plains Mexican, NY", "White-Plains, NY", "White Plains, TX", "Indian Wells Hindu, CA", "Arab Arab, AL", "Arab, MI", "Falls Church Muslim, VA", "Mexican Hats, UT", "Chinese Camps, CA", "Indian Community, WA", "Black Mountain NC". The exception set is read only as a whole lowercase "Name, ST" after the contract trims and collapses spaces (`ad-places.ts:575-589`) and in the domain by exact value (`library-ad-places.ts` `placeProblem`), so extra words, a hyphen, a plural, or another state always fall back to the word check. **Passing as intended:** "White Plains, NY", "white plains, ny", "  White   Plains ,  NY " (stored "White Plains, NY"), "Arab, AL", "Falls Church, VA", "Mexican Hat, UT", "Black Mountain, NC", "Chinese Camp, CA", "Nisqually Indian Community, WA", "Indian Wells, CA" and "AZ", "Temple, TX". **Refused, the early pass's cases:** "Black Austin, TX", "Indian Houston, TX", "Mexican Austin, TX", "Arab Dearborn, MI", "Hindu Edison, NJ", plus "Korean Fort Lee, NJ", "Church Austin, TX", "Mosque Dearborn, MI", "Blacks Austin, TX", "Asian-American Austin, TX", "Native Austin, TX", "Immigrant Houston, TX".

### SEC-009-06. RESOLVED (default-ignorable marks); residual in SEC-009-09

- **Fix:** `library-ad-words.ts:294-296` (`\p{Default_Ignorable_Code_Point}`), `:301` (U+FE0F allowed only straight after a pictograph).
- **Probed, refused as `WORDS_INVALID_CHARACTERS`:** "Rates" U+034F "down", "Homes" U+034F "for you", a lone U+FE0F, U+FE0E after a heart, a doubled U+FE0F, U+180B, U+E0100, U+2065, U+3164, U+115F, U+00AD, and the keycap "#" U+FE0F U+20E3 (conservative). **Passing as intended:** a heart, a thumbs-up, and a flag with their presentation selector; a plain line break in the primary text.

## New findings

### SEC-009-07. Number words apart from their unit by an ordinary word still pass (Low, NEEDS HUMAN REVIEW)

- **Severity:** Low, tagged **NEEDS HUMAN REVIEW** because it sits on the Medium/Low line. For Medium: it is the same family as SEC-009-02 (a loan term in words that passes every check), "Pay it off in fifteen short years" is ordinary loan-officer phrasing, and whether it is a regulated term statement is counsel's call. For Low (the grade given): number words are ordinary English, so D5 as amended (`0efb391a`) deliberately reads them only beside a unit or through a run of number words, and any fixed window of filler words can be beaten by one more word, which is the open-vocabulary family R-4 accepts and SEC-009-04 was graded in; every digit is still refused in the words; the person who types the words approves the version, the curator reviews every default, and launch is disabled in PRD-009 (MTK-005).
- **Location:** `packages/domain/src/library-ad-words.ts:91-95` (`NUMBER_RUN` admits only number words, fraction words, "a", "an", "of", and a linking "and" before the unit), `:189` (the word term pattern), `:199` (`decades? (fixed|loans?|mortgages?|term)` needs adjacency), `:382-387` (`hasNumber`).
- **Scenario (probed, headline, no saved partner; each produces no finding at all):** "Pay it off in fifteen short years", "Thirty whole years", "Thirty-plus years", "Fifteen or more years", "Twenty-odd years", "A dozen or so years", "Twelve-ish years", "Two doz. months", "A decade and a half, fixed". The headline and primary text are the person's own words (`apps/web/src/server/library-ad-save.ts:52-64`), so this is reachable. "Fixed for thirty whole years" is refused, because `FIXED_SPAN` allows "whole".
- **Fix (prototyped in the scratchpad against the cases above and the passing table):** add one claim pattern and use the same body in `NUMBER_WORD_UNIT`: ``new RegExp(`\\b(?!one\\b)${NUMBER_RUN}(?: \\p{L}+){1,2} (?:years?|yrs?|months?|mos?|payments?|percent)\\b`, "u")``, plus `/\bdecades? and a half\b/u` as a term. It refuses all nine strings above and still passes "One home, many years of memories", "Make this one of your best years", "One loan officer, many happy years", "Credit score and payment history", "Down payment help", "Dozens of families helped", "Ask me about first-time buyer programs", "Serving our community for generations", and "A decade of helping first-time buyers". Add those as 009D-AC-010 table cases. Excluding "one" keeps "one home", "one of", and "one loan officer" clear. If the owner grades this Medium, it is a few lines and must land before ship; if Low, it can ride with counsel's list extension (009F-AC-014 part c).

### SEC-009-08. A phone number still prints after a license keyword in another script's digits, or spelled in number words (Low)

- **Location:** `packages/domain/src/library-ad-words.ts:321-323` (`LICENSE_REFERENCE` takes any `\p{N}` digits), `:325-328` (`isLicenseDigits` counts `\p{N}`), `:448-449` (`PHONE_NUMBER` uses `\d`, which is ASCII only).
- **Scenario (probed):** disclosure line "NMLS ٨٠٠٥٥٥١٢١٢. Equal Housing Lender." (Arabic-Indic digits), disclosure line "NMLS ८००५५५१२१२" (Devanagari), and company "Acme NMLS ٨٠٠٥٥٥١٢١٢ Lending" pass every check: the run reads as a 10-digit license reference, and the phone pattern never sees a digit. NFKC does not fold these digits (fullwidth ones it does, and those are refused). Separately, headline "Call eight hundred, five five five, one two one two" passes (no digit, no number word beside a unit).
- **Why Low:** as for SEC-009-03: it needs deliberate typing, reads to an approver as a number in plain sight, carries contact details rather than a rate or term, and launch is disabled. The headline and primary text already refuse every `\p{N}`.
- **Fix:** make `LICENSE_REFERENCE` take ASCII digits only (`([0-9]+(?:-[0-9]+)?)(?![ .-]?[0-9])` and `[0-9]` in `isLicenseDigits`), so other scripts' digits in a Brand text fall to `WORDS_NUMBER`; or fold every `\p{Nd}` to ASCII in `normaliseLibraryAdText`. For spelled-out numbers, refuse a run of seven or more single-digit number words ("zero" to "nine", "oh") in any checked text. Table cases: the three strings above refused; "NMLS 1234567" passing.

### SEC-009-09. Two blank marks and unassigned code points pass the invisible-character check (Low)

- **Location:** `packages/domain/src/library-ad-words.ts:294-296` (`INVALID_CHARACTER`), `packages/domain/src/library-ad-text.ts:201` (`LIBRARY_AD_INVISIBLE`).
- **Scenario (probed on Node 24.18.0):** "Homes" U+1D159 (MUSICAL SYMBOL NULL NOTEHEAD) "for you" and "Homes" U+16FE4 (KHITAN SMALL SCRIPT FILLER) "for you" store with no finding; both are nonspacing marks that Node does not class as default-ignorable, and their Unicode names describe blanks (whether a given browser font draws anything was not checked here: UNVERIFIED). Unassigned code points are not refused either: "Homes" U+0378 "for you" and "Homes" U+1FC00 "for you" pass, and an unassigned code point splits a claim word, so "R" U+1FC00 "ates down" passes the claim check (U+1FC00 is in a reserved pictographic range, so a U+FE0F after it is also allowed). An unassigned code point normally draws as a missing-glyph box, so that split is visible to the approver.
- **Why Low:** as for SEC-009-06; the readings strip every mark, so no claim hides inside a word through the two blanks, and the approver sees the box.
- **Fix:** add `\p{Cn}` (unassigned) to `INVALID_CHARACTER`, and U+1D159 and U+16FE4 to `LIBRARY_AD_INVISIBLE` beside the Hangul, Braille, and Khmer blanks. Table cases for each.

### SEC-009-10. Claim and co-brand evasions that remain (Low, accepted family R-4)

- **Location:** `packages/domain/src/library-ad-words.ts:161-181` (closing costs read only "X off closing", "closing costs off/paid/covered/...", and "number closing costs"), `:389-414` (co-brand phrases), `packages/domain/src/library-ad-text.ts:247-290` (word text and joined runs).
- **Probed passes:** "We pay your closing costs", "Lender-paid closing costs", "Free closing costs", "Closing costs on us" (the word order the patterns do not read); title "Partnered w/ Keller Williams", "Affiliated w/ Prairie Homes", "Teamed up with Keller Williams", company "Prairie Lending, an RE/MAX company" (D5's amendment already records that "a Coldwell Banker company" is not caught without a saved partner); and visible in-word splits of a claim word: "Ra tes down", "Ra-tes down", "R★ates down" (the joined-run reading only joins runs of single characters).
- **Why Low:** the deterministic detector's open vocabulary, the family the Wave 3 verifier logged as W-1 and the index accepts under R-4; every split is visible on the approver's screen; the structural control 9 holds (no partner field in a library ad); a person approves every version and launch is disabled.
- **Fix:** add `(?:free|paid|lender paid|waived|covered) closing costs?`, `(?:pay|cover|cut)(?: \p{L}+)? closing costs?`, and `closing costs? on (?:us|me|the house)` as payment claims; read `w` as "with" before the co-brand phrases and add `teamed (?:up )?with` and `an? .{1,40} company` in the company field; counsel extends the lists (009F-AC-014 part c). The in-word splits are a design limit of reading words rather than meaning, kept to the approver under R-4.

### SEC-009-11. Place words that remain (Low)

- **Location:** `packages/domain/src/library-ad-places.ts:80-95` and `packages/contracts/src/ad-places.ts` `AD_PLACE_AUDIENCE_WORDS`.
- **Probed passes (contract and domain):** "Hispanics Austin, TX" ("hispanic" is listed but not its plural, while latino, latina, asian, christian, muslim, and catholic each have theirs), "Latinx Austin, TX", "Cuban Miami, FL", "Haitian Miami, FL", "Somali Minneapolis, MN", "Polish Chicago, IL", "Irish Boston, MA", "Italian Boston, MA", "Hmong St. Paul, MN", "Navajo Gallup, NM", "Tribal Gallup, NM", "Amish Lancaster, PA", "Orthodox Brooklyn, NY", "Hasidic Brooklyn, NY", "Evangelical Dallas, TX", "Baptist Dallas, TX", "Lutheran Fargo, ND", "Temple Austin, TX", "Spanish-speaking Houston, TX", "Bilingual Houston, TX", "Deaf Austin, TX", "Wheelchair Austin, TX", "Section Eight Austin, TX".
- **Why Low:** the early pass's reasoning holds (no targeting call exists, a city is a name, step 3 shows every value to the approver), and the structural fix is now recorded in D4 for the Meta publish PRD: every city resolves to a gazetteer entry or a Meta location key before any launch. A word list cannot carry this alone.
- **Fix:** add "hispanics" now (one word, both lists, one table case); hand the remaining national origin, religion, language, and disability words to counsel with the gazetteer requirement.

### SEC-009-12. The accepted-advisories test guards only an unbroken `ignoreGhsas` list (Low)

- **Location:** `tooling/tests/unit/dependencies/accepted-advisories.test.ts:21-32` (the parser stops at the first line that is not `- <id>`), `:35-37`.
- **Scenario (verified):** a scratch `pnpm-workspace.yaml` with `ignoreGhsas` holding the accepted id, a blank line, then `- GHSA-aaaa-bbbb-cccc`, and an `ignoreCves: [CVE-2026-0001]` key beside it. `pnpm config get auditConfig --json` reads both ids and the CVE; the test's own parser, run on the same file, returns only `["GHSA-vfj7-8cjw-p6xm"]`, so the test passes. A YAML comment between items does the same. pnpm 11.15.1 honours `auditConfig.ignoreCves` in `pnpm audit` (checked in its bundled source), and `pnpm audit --ignore-unfixable` writes to it. So a second silenced advisory could reach CI without changing the test, which its doc comment says cannot happen.
- **Why Low:** it needs a deliberate change to a reviewed file, and the pull request shows it; nothing is silenced today beyond the accepted entry.
- **Fix:** read the whole `auditConfig` block (every indented line under it, skipping blank and comment lines) and assert it deep-equals `{ ignoreGhsas: ["GHSA-vfj7-8cjw-p6xm"] }`, with no `ignoreCves` key; add the blank-line and `ignoreCves` cases to the planted-entry test.

## Info

- **SEC-009-I8. No revisit date for the accepted advisory.** The early pass asked for a revisit date; the comment and the ledger say "remove once a fix ships" instead. Suggest a dated check in the ledger (for example, at the next PRD's close-out) so the ignore cannot outlive a fix unnoticed.
- **SEC-009-I9. New code since the early pass: no finding.**
  - *Shared primitives* (`packages/ui`): `Button` wraps its label in a class; `Link` adds a `sentence` style variant and keeps `rel` and `target` out of its props, so `resolveExternalLinkSafety` still forces `noopener noreferrer`; `Surface` gains an `info` style; `AsyncState` gains a `surface` prop that is removed before the remaining props spread onto the section; five new icons are static SVG paths.
  - *Brand page and `synthetic-brand-page.ts`:* the sample identity renders only when `authenticatedWorkspaceMode` returns `synthetic`, which it does only for `OALO_ENVIRONMENT` local or preview with the stub provider, synthetic data only, and no review flag (`apps/web/src/server/authenticated-workspace-data.ts:163-187`); staging and production either take review mode, where the page reads the signed-in person's own saved Brand through `workspacePageData("profile")`, or throw. `syntheticBrandPageData` has one importer (`brand/page.tsx`), sets `canEdit: false`, and the only save route refuses every mode but review (`apps/web/src/server/workspace-preferences.ts:184`), so the demo page can neither leak into a real account's Brand page nor write. This is the same fixture and gate the deleted screen used.
  - *`BrandProfileScreen` deletion:* no import, route, or stylesheet reference remains (one comment in a test names it).
  - *Homeowner reports' not-turned-on state* (`use-home-workspace.ts`): the empty state is taken only for the exact code `REPORTS_NOT_CONFIGURED`, which `apps/web/src/server/homeowners/runtime.ts:89-93` raises only after review mode, sign-in, and the role check, so it cannot hide a 401 or 403; messages render as React text.
  - *Connections page* (`permission-screen.tsx`): layout, a shared `Badge`, and one de-duplicated fixture sentence; no new data.
  - *Capture helpers* (`review-session.ts`, `design-quality.ts`): test-only; they add date masks and blur the account control before a picture, and remove their own marks and style afterwards.
  - *Request, session, and error data:* `RouteError` still shows only Next's opaque `digest`; `AuthProblem` and `AuthNotice` add a decorative glyph beside the same text; every new link is a fixed path or `launchHref` built with `URLSearchParams`; "Launch on Facebook" changed from outline to primary and is still a literal `disabled` button with no handler.
- **Carried:** I1 (ordering) holds for MTK-004; I2 (stale watchlist, 2026-04-24) stands; I3, I4, I6, and I7 are unchanged because no server, database, or application file changed; I5 stands (`apps/web/src/features/workspace/ad-brand-editor.integration.test.tsx:79`, `:255`).

## Recheck: sample guard, approval binding, provider defaults (MTK-005)

`git diff de69e09e..0d539dee` is empty for `apps/web/src/server`, `apps/web/src/features/ads-library`, `apps/web/src/app/api`, `packages/application`, `packages/ghl`, `packages/db`, the domain and contract campaign foundations, `library-ad-ruleset.ts`, `library-ad-text.ts`, `tests/security`, `supabase`, `.github`, `tooling/scripts`, `next.config.ts`, and `proxy.ts`. So the early pass's evidence stands unchanged at this head: the fail-closed guard (`catalog-loader.ts:60-64`), the derived and contained art read, the content-derived approval snapshot and digest check, the session-sourced approver name, `provider_publish` `available: false` and `providerPublicationAuthorized: false`, and `META_ADAPTER_MODE = "fixture-plan"`. `tests/security/provider-side-effect-default-off.test.ts` passes (40 of 40 in `tests/security`). The one provider-adjacent change in the diff is the "Launch on Facebook" button's style, above.

## Dependency audit at `0d539dee`

| Package | Severity | Advisory | Path | Fix available | Status |
|---|---|---|---|---|---|
| braces 3.0.3 | High (CVSS 7.5) | GHSA-vfj7-8cjw-p6xm | `apps/tasks > trigger.dev 4.6.4` (dev), three paths | No (npm's latest is 3.0.3; `first_patched_version: null`) | **Accepted by the owner, 2026-10-03** (`pnpm-workspace.yaml:42-49`) |

No other advisory at any level; `pnpm audit --prod` clean; no npm advisory published or updated on 2026-10-03 as of 16:28 UTC.

## Files changed by this delta pass

- Modified, uncommitted: this file (the section above appended). No other file in the worktree was touched; probes and the scratch `pnpm-workspace.yaml` ran from the session scratchpad.

## MTK-003 at `0d539dee`

Zero unresolved Critical, High, or Medium, in code and in `pnpm audit`, with SEC-009-01 accepted by the owner. **MTK-003 is met.** The owner should rule on SEC-009-07's grade; if it is graded Medium, MTK-003 re-opens until the prototyped fix lands. `quality-guardian` (MTK-004) runs next, on the final tree.

---

# Final delta (2026-10-03) at `e8aae2b5`

**Reviewer:** `security-guardian` (paired weapon: `security-weapon`), Opus, read-only pass.
**Head:** `e8aae2b5` on `claude/prd-009-marketing-toolkit` (`8178126b` plus the quality report commit). `git log -1`: "docs(qa): PRD-009 quality close-out, delta pass at 8178126b (code and records: SHIP)".
**Scope:** `git diff 0d539dee..HEAD`, 57 commits, 137 non-picture files: lane F (`84e638b4`, `5cc34787`, `012d5f63`, `7603707d`), the QA-06 approvability refactor (`d1a92183`, `93c1a16d`), the round 2 design lanes G to J, the quality lanes, the writing delta (D-1 to D-8), and the final pre-redraw commits. The uncommitted pictures under `tests/visual/screens/` were ignored. Nothing in the tree was edited, staged, or committed; this appended section is the only change, left uncommitted. Probes ran from the session scratchpad.
**Verdict: MTK-003 NOT MET on this head**, by one new Medium tagged NEEDS HUMAN REVIEW (SEC-009-13: the word checks read English only). Critical 0, High 0 unresolved (SEC-009-01 still accepted, unchanged), Medium 1, Low 2, Info 4. Every lane F fix holds against a second attack, the QA-06 refactor is equivalent to the command's old rule and the screens are now stricter, and the round 2, quality, and writing lanes add no security surface. MTK-003 is met as soon as the owner rules on SEC-009-13 (see its fix: accept it with a dated record and a pre-launch requirement, or grade it Low), or the run lands a language rule.

## Pre-flight

- **Ordering.** The quality close-out delta (`qa/2026-10-03-quality-report.md`, commit `e8aae2b5`) audited `8178126b` and itself named this pass as gate 1 still due (its section on gates, item 1). This pass changes no code, so that report stays valid. If SEC-009-13 is closed in code rather than by an owner decision, the touched files need a quality re-check. The parallel QA-11 and QA-12 lane (status chips and next-step wording) was not in this tree and was not reviewed; its diff should be shown to this reviewer before ship.
- **Intelligence freshness.** `research/cve-watchlist.md` still says `Last refreshed: 2026-04-24` (162 days, past 120). SEC-009-I2 stands; advisories were checked live instead.
- **Stack.** Next.js 16.3.6, React 19.3.0, TypeScript, Node 24.18.0: full coverage.

## Commands run (Node 24.18.0, pnpm 11.15.1, unless stated)

| Command | Result |
|---|---|
| `pnpm audit:dependencies` (`pnpm audit --audit-level=high`) | **Exit 0.** "1 vulnerabilities found. Severity: 1 high (1 ignored)" |
| `pnpm audit --audit-level=low` | Exit 0, the same single ignored high; nothing at any other level |
| `pnpm audit --prod --audit-level=low` | "No known vulnerabilities found" |
| `pnpm audit:secrets` | "Secret audit passed across 6 source roots and the public environment boundary." |
| `gh api advisories/GHSA-vfj7-8cjw-p6xm` | updated 2026-10-02T22:36:34Z, not withdrawn, `<= 3.0.3`, `first_patched_version: null`; `npm view braces versions` still ends at 3.0.3 |
| `gh api "advisories?ecosystem=npm&updated=>2026-10-03T16:28:00Z"` at 20:36 UTC | Zero npm advisories updated since the delta pass's check |
| `vitest run --project contracts tests/security` | 6 files, 40 tests pass |
| `vitest run tests/security/provider-side-effect-default-off.test.ts` (MTK-005) | 15 of 15 pass |
| `vitest run` on `library-ad-approval-command.test.ts`, `launch-an-ad.unit.test.ts`, `campaign-page-data.unit.test.ts`, `home-campaigns.unit.test.ts` | 4 files, 85 tests pass |
| `vitest run --project unit` on `accepted-advisories.test.ts`, `library-ad-checks/`, `unit/application` | 4 files, 740 tests pass |
| `pnpm test:unit`, twice, on a machine shared with other lanes (45 `node.exe` processes) | Run 1: 2611 of 2612, the SEC-009-02 timing guard over its bound (3509 ms against 1500 ms). Run 2: 2610 of 2612, `sample-flag-scan.test.ts` (120 s timeout) and `sample-catalog.test.ts` (61 s) timed out. Each passes alone (388 of 388, and 9 of 9). Load, not a defect: SEC-009-I11 |
| Probes (scratchpad only) | The head's `library-ad-words.ts`, `library-ad-places.ts`, `ad-places.ts`, and the approval rule bundled with the repository's esbuild 0.25.0: 156 adversarial word cases (0 against expectation) on Node 24.18.0 (`process.versions.unicode` is 17.0) and on Node 22.19.0 (same results), 20 non-English cases, and a timing battery; the `0d539dee` words module bundled the same way for a before and after |
| Accepted-advisory sidesteps against real pnpm 11.15.1, in a scratch copy of the manifests and lockfile | See SEC-009-12 below and SEC-009-I10 |
| Added-line sweep (6,005 lines) | No key, token, private key, connection string, or real email; phone shapes are the 800-555-1212 test value only; no hidden Unicode in a non-test file; `.cursor`, `.claude`, `AGENTS.md`, `CLAUDE.md` unchanged; no new `dangerouslySetInnerHTML`, `innerHTML` write, `srcDoc`, or `eval` (the `innerHTML` reads are in the test-only `apps/web/src/testing/glyph-markup.tsx`) |

Not run, as instructed: browser suites, database suites, `pnpm build`.

## Scorecard at `e8aae2b5`

| Category | Status | Findings |
|---|---|---|
| Financial / payment security | OK | 0 (no payment or budget code changed) |
| PII exposure | OK | 0; the Brand preview hides an empty NMLS line; Spanish private-detail requests fall under SEC-009-13 |
| Authentication and authorization | OK | 0; no route, handler, session, or role code changed; the mutation role is still enforced in `library-ad-save.ts:121` |
| Injection (SQL, XSS, path, ReDoS) | OK | 0; text-only rendering; new patterns linear at field length |
| Ad compliance controls (word checks, places) | **ATTN** | SEC-009-13 (Medium, NEEDS HUMAN REVIEW); SEC-009-14, 15 (Low) |
| Approval rule (QA-06) | OK | 0; equivalent in the command, stricter on the screens |
| Sample-ads guard and catalog integrity | OK | 0; guard files unchanged; one test comment |
| Provider side effects (MTK-005) | OK | 0; test passes; "Launch on Facebook" still a literal `disabled` button with no handler |
| Dependency security | OK (accepted) | SEC-009-01 accepted; SEC-009-12 resolved; I10 |
| Configuration and headers | OK | 0; `next.config.ts`, `src/proxy.ts`, CI unchanged |
| Public repository hygiene | OK | 0 |

## 1. Lane F's fixes, verified and attacked again

### SEC-009-07. RESOLVED as specified (window of two words)

- **Fix:** `packages/domain/src/library-ad-words.ts:107` (`NUMBER_WORDS_APART`), `:110-113` (kind from the unit), `:115-118` (`NUMBER_WORD_UNIT`), `:223` (claim pattern), `:234` (`decades? and a half`); D5 note `prd-009d-marketing-toolkit-launch-an-ad.md:132`.
- **Refused, each with a claim and `WORDS_NUMBER`:** the nine strings of the delta pass, plus "Fifteen short, sweet years", "Thirty fixed-rate years", "Fifteen and a half short years", "Thirty short years and done", "Fifteen" and "short" and "years" separated by U+2013 dashes, "Fifteen ye" + Cyrillic a + "rs" and "Fift" + Cyrillic e + "en years" (confusables), "One hundred eighty payments", "One payment a month for thirty years". **Passing as intended:** "One home, many years of memories", "Make this one of your best years", "One loan officer, many happy years", "Credit score and payment history", "Down payment help", "Dozens of families helped", "Serving our community for generations", "A decade of helping first-time buyers".
- **Still passing, by design:** three fillers ("Fifteen happy, happy, happy years"), an "and" between fillers ("Fifteen short and sweet years"). This is the window the amendment records and counsel holds (checklist step 12). Other English phrasings found open are in SEC-009-14.
- **Cost:** the 600-character worst case is 2.4 ms. The repository's own guard input (6,800 characters) takes about 125 ms on Node 24 against 93 ms at `0d539dee`, roughly quadratic in length, so no denial of service at any field's limit (headline 120, ad text 600, request body 16,000 bytes before parsing).

### SEC-009-08. RESOLVED

- **Fix:** `library-ad-words.ts:368-369` and `:376-379` (license digits are ASCII only), `:516-520` (`SPOKEN_PHONE_NUMBER`), `:536-560` (`foldDecimalDigits`), `:806-807` (number rule on the typed reading, every other rule on the folded reading), `:665` and `:794` (saved partners and own words folded too).
- **Refused:** "NMLS" followed by 8005551212 in Arabic-Indic, Devanagari, Bengali, Adlam, Osmanya, and Mathematical Bold digits, and fullwidth (each as `WORDS_NUMBER` and `WORDS_CO_BRAND`, or `WORDS_CO_BRAND` where NFKC already folds); "NMLS" with 1234567 in Extended Arabic-Indic, "License" with Thai digits, "NMLS 12345" plus two Arabic-Indic digits, dingbat and Ethiopic numerals (`WORDS_NUMBER`); company "Acme NMLS" plus Arabic-Indic digits, and "Acme" plus Arabic-Indic 8005551212 plus "th Lending"; "Call eight hundred, five five five, one two one two", "Text five-five-five, one-two-one-two", the same in capitals, with dots, with a Cyrillic letter, and in the title. A saved partner "Team 7 Realty" refuses "Team" plus Arabic-Indic 7, and the reverse. **Passing as intended:** "NMLS 1234567", "Lic. 12-3456", circled and superscript digits (NFKC makes them an ordinary license number), "One, two, three: buying made simple", "Step one, step two, step three, then keys." Residuals: SEC-009-15.

### SEC-009-09. RESOLVED

- **Fix:** `library-ad-words.ts:341-342` (`\p{Cn}`, U+1D159, U+16FE4 added).
- **Refused (Node 24.18.0, Unicode 17.0, and Node 22.19.0):** U+1D159, U+16FE4, U+0378, U+1FC00 inside "Rates", U+1FC00 followed by U+FE0F, the noncharacters U+FDD0 and U+FFFF, U+E01F0, U+1D173, U+1D17A, U+13430, U+1BCA0, U+2800, U+FFA0, U+17B4, U+2063, U+115F, U+3164, U+E0020, U+061C. Accents and enclosing marks inside "Rates" are stripped by the readings, so the claim is found. **Passing:** U+1680, U+FFFC, U+0F0C, U+2BFE, U+0CF3 between two words, each of which draws or reads as a visible gap or symbol; a heart with U+FE0F, a house, a waving hand with a skin tone, "Café". See SEC-009-I12 and I13.

### SEC-009-10. RESOLVED for the listed vocabulary

- **Fix:** `library-ad-words.ts:204` (free, paid, lender paid, waived, covered before closing costs), `:444` (`WITH` reads "w"), `:452`, `:461-466`.
- **Refused:** "Free closing costs", "Lender-paid closing costs", "Seller-paid closing costs", "Closing cost free"; titles "Partnered w/ Keller Williams", "Partnered w. ...", "Partnered W/ ...", fullwidth w, "Partnered with: ...", "Partnered-with ...", "Affiliated w/ Prairie Homes". **Passing as intended:** "Partnered w/ you", "Understand your closing costs", "Take the stress off closing day", "Buying real estate? Start here.", "Questions? I am here w/ answers." Residuals: SEC-009-14.

### SEC-009-11. RESOLVED

- **Fix:** "hispanics" in `packages/domain/src/library-ad-places.ts:91` and `packages/contracts/src/ad-places.ts:190`; the equality test passes. The other words stay with counsel (checklist step 12, item 2).

### SEC-009-12 and I8. RESOLVED

- **Fix:** `tooling/tests/unit/dependencies/accepted-advisories.test.ts:51-86` reads every entry under `auditConfig` (block and flow lists, blank and comment lines skipped, unknown shapes thrown) and holds the whole block to `{ ignoreGhsas: ["GHSA-vfj7-8cjw-p6xm"] }` (`:89-91`); `:93-98` holds the dated reason and the revisit date; `pnpm-workspace.yaml:46` "Revisit 2026-11-03", mirrored as decision D-9 in `finish-line-operator-checklist.md:39`.
- **Sidesteps tried against real pnpm 11.15.1, each blocked:** a second `auditConfig` key (pnpm itself fails: "duplicated mapping key"); `audit-config:` in kebab case (pnpm ignores it, the advisory is reported); `pnpm.auditConfig` in the root `package.json` (pnpm ignores it); a quoted `"auditConfig":` key (pnpm honours it, but the test then reads no block and fails); a quoted inner key, a multi-line flow list, an anchor, a merge key, a block scalar, and a comment, quote, or bare carriage return used to hide an entry from the reader (each either parses the same in both or makes the reader throw). The test's claim, a second ignore "under either key", holds. One route outside the file it reads: SEC-009-I10.

## 2. The QA-06 approvability refactor

- **The command's refusal is unchanged.** `libraryAdRefusalFor` (`packages/application/src/campaign-approval-command.ts:127-143`) is the old `assertLibraryAdApprovable` body returning a reason instead of throwing: same order (missing, retired by this or the newest version, not active or not highest, either art digest changed), same comparisons. `recordedLibraryAdOf` (`:107-116`) reads the same id, version, and two digests the old code destructured. `assertLibraryAdApprovable` (`:149-160`) still runs after the role check and before the idempotent retry and every other check (`:362-364`). The shared table `REFUSED_STANDINGS` drives both the command's cases and a new equivalence suite in which the rule's reason equals the reason the command throws for all seven standings and both answer nothing for an active one (`tooling/tests/unit/ads-library/library-ad-approval-command.test.ts`, passing).
- **No screen or route trusts a client value.** Step 3 (`apps/web/src/server/launch-an-ad.ts:192`), Home (`apps/web/src/server/home-reads.ts:228` through `home-campaigns.ts:76`), and the campaign page (`apps/web/src/server/campaign-page-data.ts:62`, `:272-276`) each call the rule on the server with the server's catalog standing; the client receives only the answer, for display. The campaign page is stricter than before: it now withholds Approve for a changed-art version and for a replaced version with no offer, which it used to offer. The approve route and handler are unchanged (`campaign-approval-handler.ts` takes no approvability field, re-reads the version, and passes the catalog port at `:104`); no API route was added. The only client import from `@oalo/application` is a type (`launch-review.tsx:3`). "Make a new version" and "Use the new version" go through the unchanged strict save route, which re-resolves the ad from the catalog and enforces the mutation role (`library-ad-save.ts:121`); `canMakeNewVersion` only decides what is drawn.
- **The catalog port is still required:** a required parameter of `executeHumanCampaignApproval` (`:318-323`), asserted at run time (`:84-92`, `:324`), with the `@ts-expect-error` and run-time rejection test at `library-ad-approval-command.test.ts:146-156`.

## 3. Round 2 design lanes, quality lanes, and the final pre-redraw lane

- **No new route.** The only added files are two components (`keep-words-whole.tsx`, `launch-an-ad-link.tsx`), `status-tone.ts`, a test helper, tests, and documents. Added pages: none; the three homeowner pages gain static `metadata` titles only.
- **Request, session, and error data.** The password-reset notice still reads only its own flag and now renders as a child of `OverviewScreen` (`overview/page.tsx`); nothing new reads cookies, headers, or query strings. `UseNewVersion` gains a `lead` and an `askWhenCannot` string, both copy constants; its refusal and support reference paths are unchanged. The approval card's status line keeps the same sentence source and becomes visually hidden while empty. Every new link is a fixed path or `launchHref` built with `URLSearchParams`. `labelForStatus` reads its table with `Object.hasOwn` and is fed only the synthetic demo campaign.
- **Unchanged:** the sample guard and catalog loader, the sample art route, `synthetic-brand-page.ts` and the Brand page's mode gate, `support-details.tsx`, `apps/web/src/features/http`, `apps/web/src/app/api`, `packages/ghl`, `packages/db`, `supabase`, `.github`, `tooling/scripts`, `next.config.ts`, `src/proxy.ts`, `pnpm-lock.yaml`, every `package.json`.
- **Connections page.** Review mode adds `stateLabel` from a server constant (`ACCESS_GROUP_NOT_CONNECTED_STATE_LABELS`); the synthetic schema accepts it as an optional string; the demo keeps its words. No data source changed.
- **Shared primitives.** `Link` gains `size` (a `data-size` attribute only) and still omits `rel` and `target` from its props; three static icons; `Select`, `Button`, and theme CSS only.

## New findings

### SEC-009-13. The word checks read English only, so a rate, payment, or term claim written in Spanish passes every rule (Medium, NEEDS HUMAN REVIEW)

- **Severity:** Medium by this review's own calibration, tagged **NEEDS HUMAN REVIEW**. For Medium: SEC-009-02 was graded Medium because "A dozen years, fixed", a term claim in ordinary words, passed every check; "Tasa fija por treinta años" ("fixed rate for thirty years") is the same claim in the second language of the US mortgage market, written without any evasion by a bilingual loan officer, and it also beats the conservative number rule, because the rule refuses digits and English number words only. Unlike SEC-009-07, this is a whole class, not one more filler word, and a finite list closes its most common case. For Low: launch is disabled in PRD-009 (MTK-005), a named human approves every version, step 3 shows the words, and counsel reviews before any live launch (checklist step 12), the same mitigations that held SEC-009-05 at Low until the publish PRD.
- **Location:** `packages/domain/src/library-ad-words.ts:74-81` (number words, English only), `:135-237` (`CLAIM_PATTERNS`), `:446-474` (co-brand phrases), `:713-737` (`PRIVATE_DETAILS`), `:516-520` (spoken digits); the free-text inputs are the headline and ad text (`apps/web/src/server/library-ad-save.ts:52-64`) and every Brand text. No PRD line limits the ad's language (009d D5 and the index risk R-4 name none).
- **Scenario (probed on this head, no saved partner; each produces no finding at all, while its English twin is refused):** headline "Tasas bajas para tu casa" (English "Low rates for your home": refused), "Tasa fija por treinta años" (and without the tilde), "Pagos mensuales bajos", "Tres por ciento de enganche", "Sin enganche, sin costos de cierre", "Interés bajo, pagos pequeños"; ad text "Compra tu casa con una tasa fija por quince años y pagos mensuales bajos."; title "En colaboración con Keller Williams" and "Socio de Keller Williams"; lead form wording "Escriba su número de seguro social" (asks for a Social Security number); headline "Llame al ocho cero cero, cinco cinco cinco, uno dos uno dos". The same holds in Portuguese ("Taxas baixas"), Vietnamese ("Lãi suất thấp"), Tagalog ("Mababang interes"), Chinese, and Korean.
- **Fix (owner decision first; neither option is under five lines, so this read-only pass applies nothing):**
  1. **Recommended for PRD-009:** the owner records that library-ad words and Brand texts are checked in English only, accepts SEC-009-13 with a dated note (the SEC-009-01 pattern: D5 note, ledger, and a revisit tied to the Meta publish PRD), and the checklist's step 12 gains item (4): "the checks read English; before any live launch, either refuse ads in other languages or give counsel a word list for each language the product allows." MTK-003 is then met.
  2. **If the owner wants it closed in code now:** in `library-ad-words.ts`, refuse in the headline and ad text any letter outside the Latin script (closes Chinese, Korean, and the rest), and add a Spanish list with table cases: rates (`\btasas?\b`, `\binter[eé]s\b`, `\bpor ciento\b`), payments (`\bpagos? (?:mensuales?|bajos?|de)\b`, `\bmensualidad(?:es)?\b`, `\bsin enganche\b`, `\bcostos? de cierre (?:gratis|pagados?|cubiertos?)\b`), terms (Spanish number words, `uno` to `cien`, `docena`, `quince`, `treinta`, beside `años?|anos?|meses`), co-brand (`\b(?:en )?colaboraci[oó]n con\b`, `\bsocios? de\b`), private details (`n[uú]mero de seguro social`). Counsel calibrates it (009F-AC-014 part c). Other Latin-script languages would still need item 1.

### SEC-009-14. English phrasings the claim, co-brand, and closing-cost lists still miss (Low, R-4 family)

- **Location:** `library-ad-words.ts:122` (`FIXED_SPAN`), `:135-237`, `:446-474`.
- **Probed passes:** a number word with its unit left out ("Paid off in fifteen", "Locked in for thirty"), a Roman numeral ("Fixed for XV years"), "A quarter century, fixed", "Thirty and change years", a year in words ("Fixed till twenty fifty-five"), "Fifteen summers to pay it off"; "No-cost closing", "Zero-cost closing", "Closing costs: on the house", "We cover closing"; titles "A partnership with Keller Williams", "Together with ...", "Hosted by ...", "Powered by ...", "In conjunction with ...", company "Prairie Lending, an RE/MAX company". D5's amendment (`prd-009d...:135`) already lists "We pay your closing costs", "Closing costs on us", "Teamed up with", and "an ... company" as open.
- **Why Low:** the open vocabulary R-4 accepts, as SEC-009-04 and 10 were graded; control 9 holds by structure (no partner field in a library ad); a person approves every version; launch is disabled.
- **Fix:** hand the strings to counsel with step 12 item (1). Cheap, low-risk additions if wanted: `\b(?:fixed|locked(?: in)?|paid off)(?: (?:for|in|over))? (?:NUMBER_RUN)\b` as a term, `\bquarter century\b`, `\b(?:no|zero) cost closing\b`, `\bclosing costs? on (?:us|me|the house)\b`, and `\b(?:partnership|together|in conjunction) with\b` and `\b(?:hosted|powered) by\b` as co-brand, each with a table case and the "you" exception.

### SEC-009-15. Contact details that still pass: spoken numbers in groups, and a regrouped ten-digit license (Low)

- **Location:** `library-ad-words.ts:516-520` (`SPOKEN_PHONE_NUMBER` counts only single digit words), `:368-379` (a license reference is 4 to 12 ASCII digits with at most one hyphen anywhere), `:508-509` (`PHONE_NUMBER` reads the 3-3-4 shape).
- **Scenario (probed):** headline "Call eight oh oh, five five five, twelve twelve", "Call five five five, twelve twelve", "Call five fifty-five, twelve twelve", "Call five double-five, one two one two", "Call fivefivefive onetwoonetwo"; disclosure line "NMLS 8005-551212. Equal Housing Lender." and "NMLS 80055-51212" (the ten digits of a phone number, grouped so the phone pattern misses them).
- **Why Low:** as SEC-009-03 and 08: deliberate typing, in plain sight of the approver, contact details rather than a rate or term, launch disabled.
- **Fix:** count spoken digits rather than digit words (a teen or "twelve" is two digits, "double five" is two), and refuse seven or more in a row; in `isLicenseDigits`, refuse exactly ten digits, or eleven starting with 1, whatever the hyphen's position, which keeps "Lic. 12-3456" and "NMLS 1234567". Table cases for each.

## Info

- **SEC-009-I10. The `audit:dependencies` script is a second way to silence an advisory, outside the test's file.** Verified on pnpm 11.15.1: `pnpm audit --audit-level=high --ignore GHSA-...` writes the entry into `pnpm-workspace.yaml` at run time and exits 0, and `--audit-level=critical` passes a high. A change to `package.json:30` is visible in review, and the test claims only `auditConfig`. The environment cannot weaken it (`pnpm_config_audit_level=critical` loses to the script's `--audit-level=high`, verified). Suggest one assertion in `accepted-advisories.test.ts` that the root `package.json` script is exactly `pnpm audit --audit-level=high`.
- **SEC-009-I11. Security guard tests time out on a loaded machine.** In two full `pnpm test:unit` runs on this shared machine, the SEC-009-02 linear-time guard exceeded its 1500 ms bound once, and the sample-flag allowlist scan (009C-AC-004, 120 s) and the catalog generator test (61 s) timed out once; each passes alone. The linear-time guard's input is 6,800 characters, eleven times the largest field, although its name says "at every field's length"; at 600 characters the cost is 2.4 ms. A red required check blocks MTK-002 for a reason that is not a defect (the QA-10 family). Suggest measuring at each field's real limit with a generous bound, and keeping the long input only as a growth ratio check.
- **SEC-009-I12. D5 names the wrong Unicode version.** `prd-009d...:134` says the unassigned set is "Unicode 16.0 on Node 24.18.0"; Node 24.18.0 reports `process.versions.unicode` 17.0. The behaviour is right (the server's engine decides; a browser on another version may disagree with the server, and the server wins). Correct the note when the file is next touched.
- **SEC-009-I13. A family emoji is refused as hidden characters.** "Family homes" followed by a man, woman, girl ZWJ sequence is refused, because U+200D is a format character (unchanged since the authoring review). It blocks a clean sentence (the other side of R-4), not a security gap; counsel or design may want ZWJ allowed between two pictographs.
- **Carried:** I1 (ordering, see pre-flight), I2 (stale watchlist, 162 days), I3, I4, I6, I7 (no server read path, database, or homeowner gate changed), I5 (`ad-brand-editor.integration.test.tsx:79`, `:255` still "NMLS 123456"). I8 is resolved (revisit date 2026-11-03, test-held).

## Dependency audit at `e8aae2b5`

| Package | Severity | Advisory | Path | Fix available | Status |
|---|---|---|---|---|---|
| braces 3.0.3 | High (CVSS 7.5) | GHSA-vfj7-8cjw-p6xm | `apps/tasks > trigger.dev 4.6.4` (dev), three paths | No (`first_patched_version: null`; npm's latest is 3.0.3) | Accepted by the owner, 2026-10-03; revisit 2026-11-03 (`pnpm-workspace.yaml:42-51`) |

No other advisory at any level; `pnpm audit --prod` clean; the lockfile and every `package.json` are unchanged since `0d539dee` (MTK-010 holds).

## Files changed by this final delta

- Modified, uncommitted: this file (this section appended). No other file in the worktree was touched; probes and the scratch workspace copy ran from the session scratchpad.

## MTK-003 at `e8aae2b5`

Zero Critical, zero unresolved High (SEC-009-01 accepted), one **Medium**: SEC-009-13, tagged NEEDS HUMAN REVIEW. **MTK-003 is not met on this head.** It is met when the owner either accepts SEC-009-13 with a dated record and the step 12 pre-launch item (fix option 1), or grades it Low; or when the run lands fix option 2 and `quality-guardian` re-checks `library-ad-words.ts` and its tests. Lane F's six fixes, the QA-06 refactor, and every other change since `0d539dee` pass this review. The QA-11 and QA-12 lane's diff remains to be seen.

### Owner decision on SEC-009-13 (2026-10-03)

The owner was asked in plain English and chose to record SEC-009-13 and fix it later: the finding is accepted with this dated record, operator checklist step 12 carries an item to settle which languages an ad's words may be in and to cover each one before any live launch, and the PRD-009 index lists it under "Follow-ups after PRD-009". Launch is disabled in PRD-009, so nothing is exposed. With SEC-009-01 and SEC-009-13 both accepted by the owner, no Critical, High, or Medium finding is unresolved, and MTK-003 is met.

---

## 4. Final delta at `4511100d` (round 3 and the micro-round)

**Reviewer:** `security-guardian` (paired weapon: `security-weapon`), Opus, read-only pass, 2026-10-04.
**Range:** `git diff e8aae2b5 4511100d`, 34 commits, read for code: `apps`, `packages`, `tooling`, `supabase`, `.github`, `package.json`, `pnpm-workspace.yaml`, and `tests/browser/review/empty-account.spec.ts` (the `75ba3d51` capture lives outside those folders). Pictures were ignored. The code commits are the quality close-out lane QA-11 to QA-13 (`8b961f67`, `3429c57e`, `76a01b51`, merged in `74892792`), round 3 lanes X and Y (`d6eccf8f` to `d8ba39ef`, merged in `e12e186e` and `963630c9`), and the micro-round (`efe066ab`, `20a4fa08`, `b47a7090`, `75ba3d51`). The rest of the range is documents and the move of PRD-009 to `completed/`.
**Head moved during this pass.** The branch is now at `66a9ab38`, two commits past `4511100d`: `9a38a556` (baseline pictures and the re-signed design sign-off) and `66a9ab38` (status lines). Checked: 476 pictures under `tests/visual/screens/` and seven documents (`.cursor/rules/core/the-map.mdc`, `README.md`, `NEXT_BATCH_LEDGER.md`, the project map, the completed index, the sign-off, the scored review). No code, no configuration, no hidden characters, no samples flag, no secret shapes. They do not change this verdict.
**Verdict: MTK-003 at `4511100d`: met.** Critical 0, High 0 unresolved (SEC-009-01 accepted), Medium 0 unresolved (SEC-009-13 accepted by the owner, 2026-10-03), Low 0 new, Info 1 new (SEC-009-I14, a test hygiene item for `quality-guardian`). The QA-11 and QA-12 lane that the `e8aae2b5` section asked to see is in this range and passes.

### Pre-flight

- **Ordering.** This pass changes no code, so a quality result on this head stays valid. Nothing here needs a quality re-check.
- **Intelligence freshness.** `research/cve-watchlist.md` still says `Last refreshed: 2026-04-24` (163 days, past 120). SEC-009-I2 stands; advisories were checked live.
- **Stack.** Next.js 16.3.6, React 19.3.0, TypeScript, Node 24.18.0 (fnm), pnpm 11.15.1: full coverage.

### Files reviewed (66)

- **Server and application (2):** `apps/web/src/server/campaign-page-data.ts`, `packages/application/src/campaign-workspace-read.ts`.
- **Sign-in and password reset (3):** `apps/web/src/app/(public)/reset-password/page.tsx`, `apps/web/src/features/auth/components/auth-feedback.tsx`, `apps/web/src/copy/auth-messages.ts`.
- **Copy (2):** `apps/web/src/copy/launch-messages.ts`, `apps/web/src/copy/user-language.ts`.
- **Campaign and ad screens (9):** `features/ads-library/components/use-new-version.tsx`; in `features/campaigns/components/`: `ad-library-cards.tsx`, `campaign-approval-section.tsx`, `campaign-library-notices.tsx`, `campaign-list.tsx`, `launch-flow.tsx`, `launch-review.tsx`, `persisted-campaign-screen.tsx`; `features/reporting/components/campaign-launch-review.tsx`.
- **Home, Connections, workspace pages (5):** `features/overview/components/home-campaign-lists.tsx`, `features/onboarding/components/permission-screen.tsx`, `features/onboarding/components/relative-time-text.tsx` (new), `features/workspace/preference-editors.tsx`, `features/workspace/workspace-screen.tsx`.
- **Shared primitives (2):** `packages/ui/src/components/Icon.tsx`, `packages/ui/src/components/Link.tsx`.
- **Styles (12):** `app/globals.css` (a comment path), `ad-library-cards.module.css`, `campaign-list.module.css`, `campaign-page.module.css`, `launch.module.css`, `dashboard-preview/workspace.module.css`, `homeowners.module.css`, `permission-screen.module.css`, `overview.module.css`, `reporting.module.css`, `workspace.module.css`, `packages/ui/src/components/link.module.css`.
- **Tests and test helpers (31):** 26 test files under `apps/web/src`, `packages/ui/src/components/primitive-look.test.ts`, the helper `apps/web/src/server/campaign-page.test-support.ts`, `tooling/tests/unit/library-ad-checks/word-checks.test.ts`, `tooling/tests/unit/production-foundation/campaign-workspace-read.test.ts`, and `tests/browser/review/empty-account.spec.ts`.
- **Unchanged, checked with `git diff --quiet`:** `next.config.ts`, `src/proxy.ts`, `vercel.json`, `apps/web/vercel.json`, `apps/web/src/app/api`, `apps/web/src/features/http`, `packages/db`, `packages/ghl`, `packages/domain`, `packages/contracts`, `supabase`, `.github`, `tooling/scripts`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, every `package.json`; the approval command `packages/application/src/campaign-approval-command.ts`, the approve handler `campaign-approval-handler.ts`, `library-ad-save.ts`, `launch-an-ad.ts`, `home-reads.ts`, `home-campaigns.ts`, and every file under `features/ads-library/server` or with "sample" in its path (the samples guard, the catalog loader, the sample art route).

### Commands run (Node 24.18.0, pnpm 11.15.1)

| Command | Result |
|---|---|
| `pnpm audit --prod --audit-level=low` | "No known vulnerabilities found", exit 0 |
| `pnpm audit:dependencies` (`pnpm audit --audit-level=high`) | Exit 0. "1 vulnerabilities found. Severity: 1 high (1 ignored)" |
| `pnpm audit --audit-level=low` | Exit 0, the same single ignored high, nothing else at any level |
| `pnpm audit:secrets` | "Secret audit passed across 6 source roots and the public environment boundary." |
| `gh api advisories/GHSA-vfj7-8cjw-p6xm` | updated 2026-10-02T22:36:34Z, not withdrawn, `<= 3.0.3`, `first_patched_version: null` |
| `gh api "advisories?ecosystem=npm&updated=>2026-10-03T20:36:00Z"` at 2026-10-04T13:06Z | Zero npm advisories updated since the last check |
| `gh api "advisories?ecosystem=npm&affects=next"`, `react`, `react-dom`, `react-server-dom-webpack` | Next.js 16.3.6 and React 19.3.0 are outside every listed range (see the framework line below) |
| `vitest run --project contracts tests/security` | 6 files, 40 tests pass (includes MTK-005, `provider-side-effect-default-off.test.ts`) |
| `vitest run --project unit` on `library-ad-approval-command.test.ts`, `campaign-page-data.unit.test.ts`, `launch-an-ad.unit.test.ts`, `campaign-workspace-read.test.ts`, `accepted-advisories.test.ts`, `library-ad-checks/` | 8 files, 834 tests pass |
| `vitest run --project unit` on `sample-guard.test.ts`, `sample-flag-scan.test.ts`, `sample-catalog.test.ts` | 3 files, 16 tests pass |
| `vitest run --project integration` on `auth-forms`, `reset-password/`, `campaign-list-decisions`, `persisted-campaign-screen`, `launch-review` | 5 files, 193 tests pass |
| Added-line sweep (2,253 added code lines, then the `4511100d` to `66a9ab38` documents) | No key, token, private key, connection string, email, or phone shape; no `dangerouslySetInnerHTML`, `innerHTML` write, `srcDoc`, `eval`, `new Function`, `fetch`, URL string, `process.env`, `NEXT_PUBLIC_`, cookie, or header read; no `url(`, `@import`, or `content:` in CSS; no bidi or zero-width character; two U+0008 characters in tests (SEC-009-I14) |

Not run, as instructed: browser suites, database suites, `pnpm build`, and anything against Vercel, hosted Supabase, Resend, RentCast, HighLevel, Meta, or Stripe.

### Scorecard at `4511100d`

| Category | Status | Findings |
|---|---|---|
| Financial / payment security | OK | 0 (no payment, budget, or provider code changed) |
| PII exposure | OK | 0; the new chips and notices carry fixed words and a standing name only |
| Authentication and authorization | OK | 0; the reset page's new link leaks nothing (below); no route, handler, session, or role code changed |
| Cross-workspace and cross-account data | OK | 0; the version list still refuses another location; list rows read the same catalog as before |
| Approval rule | OK | 0; command unchanged; screens now follow the rule for all four refusals (stricter) |
| Injection (SQL, XSS, path, ReDoS) | OK | 0; text-only rendering; one new pattern, linear |
| Ad compliance controls (word checks, places) | OK (accepted) | Word modules unchanged; SEC-009-13 accepted, SEC-009-14 and 15 open as Low |
| Sample-ads guard and catalog integrity | OK | 0; guard files unchanged; flag set only by local test runners |
| Provider side effects (MTK-005) | OK | 0; test passes |
| Dependency security | OK (accepted) | SEC-009-01 accepted; lockfile unchanged |
| Configuration and headers | OK | 0; `next.config.ts`, `src/proxy.ts`, CI, Vercel files unchanged |
| Public repository hygiene | OK | Info: SEC-009-I14 |

### The approval rule and its callers (QA-11, QA-12)

- **The command is unchanged.** `libraryAdRefusalFor` (`campaign-approval-command.ts:127`), `recordedLibraryAdOf` (`:107`), and the command's own check (`assertLibraryAdApprovable`, `:149`, run at `:364` after the role check and before the idempotent retry) are the code the `e8aae2b5` section verified. The approve route and handler, the save route, and its mutation role check (`library-ad-save.ts:121`) are unchanged.
- **One new server caller, display only.** `adRefusalOf` (`campaign-page-data.ts:57`) asks the rule with the server's catalog standing. Its answer now drives the newest version's chip (`:225`), the list row's chip (`:401`), the retired flag (`:74`), and the page's approval block (`:284`). `deriveCampaignStanding` (`campaign-workspace-read.ts:274`) maps each refusal reason to a standing through a frozen table that the type system holds exhaustive (`:245`), and only for a version nobody decided on in an unapproved state (`:286`). A standing is a word drawn as a chip; no route reads it back, and the browser receives only that word.
- **Stricter than before.** The list used to say "Ready for approval" for a version whose ad was replaced, whose picture changed, or that the library no longer holds; it now names the reason, as the command would. An approved version still says "Approved", because the approval covers that version.
- **No new coupling.** `campaign-workspace-read.ts:8` imports the reason as a type only.
- **QA-12.** Step 3's refused card offers "Choose another ad" or "Make a new version" only when `canMakeNewVersion` is true (`launch-review.tsx:380-381`, used at `:395`, `:401`, `:407`, `:413`); the campaign page's newer-version notice passes the fixed sentence `USE_NEW_VERSION_ASK` (`campaign-library-notices.tsx:105`), which names roles ("the campaign creator or your workspace owner"), not people. Both decide only what is drawn; the save route still enforces the role.
- **Workspaces.** `projectCampaignVersions` still freezes the principal and refuses a version from another location (`campaign-workspace-read.ts:344`, `:351`, unchanged lines). The list row already called `library.standingOf` before this range (through `libraryStandingOf`), so no new read and no new data.

### The reset-password micro-round (`20a4fa08`)

- **No token echo.** With no token, the page draws `ResetLinkMissing` (`page.tsx:37`, `auth-feedback.tsx:82`): a fixed sentence and a link. That branch runs only when the token is empty. With a token, `ResetPasswordForm` is unchanged.
- **No account-existence oracle.** On a refused submit, `authProblemFor` adds the link only for `AUTH_RESET_LINK_EXPIRED` (`auth-feedback.tsx:92`, `:108`). The route answers that one code for every dead link, unknown, expired, or used (`password-authentication-handler.ts:1324-1343`, unchanged), so the link tells a caller nothing the code did not. Nothing on the reset page asks for or shows an email address.
- **No open redirect.** The destination is the literal `/forgot-password` (`auth-feedback.tsx:73`) through the shared `Link`, whose props still omit `rel` and `target` (`Link.tsx:26`). No query value, no `next` or `returnTo`. `/forgot-password` itself is unchanged.
- **No token in a Referer.** `src/proxy.ts:20` and `:51-53` (unchanged) set `Referrer-Policy: no-referrer` and `Cache-Control: no-store` on `/reset-password`, so following the new link, or Next.js prefetching it, does not send the token anywhere.

### Sample ads, sample art, and the `75ba3d51` capture

- **Fail-closed guard unchanged.** No file under `features/ads-library/server` or with "sample" in its path changed. `OALO_ADS_LIBRARY_SAMPLES` is set only in `playwright.config.ts:123` and `tooling/scripts/database/review-browser-run.mjs:98`, both local test runners; `vercel.json`, `apps/web/vercel.json`, and `.github` are unchanged. The three sample guard tests pass. Nothing in this range sets the flag or tells anyone to.
- **New sample-library helpers are test-only.** `AD_SCENARIOS`, `libraryWith`, `scenarioLibrary`, and `ruleAnswerFor` in `apps/web/src/server/campaign-page.test-support.ts` are imported by eight files, every one a `*.test.ts` or `*.test.tsx`.
- **The capture is test code only.** `75ba3d51` adds one Playwright test, `tests/browser/review/empty-account.spec.ts:539-573`, that photographs Home in the file's existing account after the file's existing seeding. It adds no route, page, seed script, fixture, environment variable, or production import. `8b961f67` adds two assertions to the same file (`:386`, `:437`).

### Rendering, external requests, secrets, headers

- **No new HTML sink.** The only `innerHTML` and `outerHTML` in added lines are reads in `launch-review.integration.test.tsx`.
- **Links.** New: `/forgot-password`, `/homeowners/new` (now drawn only when reports are on), `/settings/connections`, all literals. The other link changes add `size="sm"` to hrefs whose sources did not change (`launchHref`, the step 3 `hrefs`, Home's empty action).
- **One new pattern.** `RelativeTimeText` (`relative-time-text.tsx:6`) matches `\b\d+ (?:second|minute|hour|day|week|month|year)s? ago\b` with no nested repetition, so it runs in linear time; it splits a string into text and spans, with no markup. Its one caller is the Connections page, fed by the synthetic fixture (`settings/connections/page.tsx:15`).
- **Primitives.** `Icon` gains one static path (`chevron-right`); `Link` changes a comment and one CSS rule. `AdCard` becomes the shared `Card` with the same attributes.
- **No new external request, secret, or header change.** No `fetch`, URL, environment read, or third-party asset; `next.config.ts` and `src/proxy.ts` (CSP and headers) unchanged.

### QA-13: the linear-time guards' new clock

- `word-checks.test.ts` now measures the SEC-009-02 and SEC-009-07 guards in processor time (`process.cpuUsage`) rather than wall-clock time, with the same inputs and the same 1.5 s bound per text, and a 60 s test timeout. A pattern that backtracks catastrophically still fails, by the bound or by the timeout. Vitest 4's default `forks` pool (no override in `vitest.config.ts`) runs one file at a time in a process, so the count is the file's own. The guard is not weakened. This closes the guard half of SEC-009-I11; the sample scans' timeouts are unchanged.

### New findings

- **Critical:** none.
- **High:** none.
- **Medium:** none.
- **Low:** none.
- **Info: SEC-009-I14. Two layout tests hold a raw backspace (U+0008) where `\b` was meant, so their negative assertions can never fail.**
  - **Location:** `apps/web/src/features/campaigns/components/campaign-list-layout.unit.test.ts:69` (`/\.thumb` plus U+0008 plus `/u`, from `ee1bc608`) and `apps/web/src/features/campaigns/components/launch-look.unit.test.ts:267` (`/\.cardAction` plus U+0008 plus `/u`, from `c812b68d`).
  - **Scenario:** a CSS source never contains a backspace, so `not.toMatch` passes whatever the CSS says; a returning `.thumb` rule in the tablet block, or a returning `.cardAction` class, would not be caught. Neither guards a security control, and nearby assertions cover part of the intent (`display: none` in the tablet block, the `.cardFoot` rules).
  - **Fix:** in each regex, replace the control character with the two characters `\b`, and run both files. A one-line change each; it belongs to `quality-guardian`'s hand-off, not this gate.
- **Carried:** SEC-009-I2 (watchlist 163 days old), I10, I11 (guard half closed by QA-13, above), I12, I13, and I3 to I7 (no server read path, database, or homeowner gate changed in this range). Open Lows SEC-009-14 and 15 are unchanged (the word modules did not change).

### Dependency audit at `4511100d`

| Package | Severity | Advisory | Path | Fix available | Status |
|---|---|---|---|---|---|
| braces 3.0.3 | High (CVSS 7.5) | GHSA-vfj7-8cjw-p6xm | `apps/tasks > trigger.dev 4.6.4` (dev only) | No (`first_patched_version: null`) | Accepted by the owner, 2026-10-03; revisit 2026-11-03 (`pnpm-workspace.yaml`, test-held) |

No other advisory at any level; `pnpm audit --prod` is clean; `pnpm-lock.yaml`, `pnpm-workspace.yaml`, and every `package.json` are unchanged since `e8aae2b5`.

**Framework versions.** Next.js 16.3.6 is the first fixed version for GHSA-vcvr-r3jv-pc5j (critical, published 2026-09-30, `>= 16.2.0, < 16.3.6`) and is past GHSA-2xp9-vwfh-vxw4 and GHSA-p293-qw3h-jr36 (both `< 16.3.3`). React 19.3.0 is outside every React Server Components range, the newest being GHSA-wx67-qw84-cm4g (`< 19.2.8` on the 19.2 line).

### Files changed by this pass

- Modified, uncommitted: this file (this section appended). Nothing else in the worktree was edited, staged, or committed; probe files stayed in the session scratchpad.

### MTK-003 at `4511100d`

**MTK-003 at `4511100d`: met.** Zero Critical, zero unresolved High (SEC-009-01 accepted), zero unresolved Medium (SEC-009-13 accepted), no new Low; the approval rule, the reset-password change, the samples guard, and the `75ba3d51` capture all pass, and the two later commits on `66a9ab38` are documents and pictures only.
