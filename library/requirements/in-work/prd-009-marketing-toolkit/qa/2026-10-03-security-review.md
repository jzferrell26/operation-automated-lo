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
