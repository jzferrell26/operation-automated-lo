# Security Review: PRD-009 Authoring Change Set (documentation only)

**Review date:** 2026-10-01
**Reviewer:** `security-guardian` (paired weapon: `security-weapon`), run by a Sonnet 5.5 session
**Branch:** `claude/prd-009-marketing-toolkit`, head `44b26f6`, base `origin/main` at `e89058e`
**Type:** authoring-time review of a documentation-only change set against the code it touches. This is not the MTK-003 close-out audit. MTK-003 still requires `security-guardian` to run on the final tree after the Gauntlet run, before `quality-guardian`.
**Verdict:** **FIX FIRST.** Zero Critical, zero High, **nine Medium**, eleven Low, seven Info. MTK-003 demands zero unresolved Medium findings at close-out, so the nine Medium items are cheapest to close in the documents now, before a run builds them in. Nothing in the documents was modified by this review.

---

## Arming confirmation

Read, in this order:

1. `security-weapon/SKILL.md` (master navigation layer).
2. `guides/00-principles.md` (operating rules, severity rubric, never-downgrade rule).
3. `guides/01-scan-procedure.md` (hidden-Unicode and secret sweeps apply to a docs change), `guides/03-owasp-top-10.md` (B4 access control, B9 path traversal, B1.4 XSS), `guides/04-pii-and-financial.md` (C3 PII in URLs, C7 field-level authorization, C9 data minimization).
4. `upstream-v2/GUIDE.md`. It is scoped to SvelteKit, Neon, and WorkOS, which is not this repository (Next.js, Supabase, first-party sessions), so none of its catalogs was applied. The local React, Next.js, TypeScript guides above were used.

**Pre-flight (ordering):** `library/qa/` does not exist in this worktree, and this PRD's `qa/` folder holds only its scaffold `README.md`. No `*-qa-report.md` exists for this branch, so this review runs before `quality-guardian`. No ordering inversion.

**Intelligence freshness:** the Weapon's `research/cve-watchlist.md` says `Last refreshed: 2026-04-24`, which is 160 days ago, past the 120-day threshold. This change set adds no package and no dependency (MTK-010) and no code, so the watchlist was not relied on. Recommend re-running `forge-weapon` for `security-guardian`.

---

## Scope

42 files changed against the merge base, 6,501 added lines, all under `library/requirements/backlog/` (the PRD-009 folder plus one row in `library/requirements/backlog/README.md`). No code, no `.cursor/rules`, no migration, no workflow. Swept as text: 25 files (the index, 009a to 009g, `design/00-direction.md`, `design/01-open-decisions.md`, 7 mockup HTML files, 4 research files, 3 READMEs, and the backlog README). The 17 PNG previews were not inspected pixel by pixel; they are renders of the mockup HTML, which was swept. Repository visibility confirmed public (`gh api`: `private: false`). The code the documents touch was read to verify the documents' claims, and where a claim could change a finding it was traced to the line.

---

## Scorecard

| Category | Status | Findings |
|---|---|---|
| Secrets, tokens, keys, connection strings in added text | OK | 0 (regex sweep over 25 files: Stripe, AWS, GitHub, Slack, JWT, PEM, DB URL, bearer, Resend, 32-plus hex shapes) |
| Real personal data in documents and mockups | OK with one Low | L-6 (sample identifiers); no email, phone, address, or token found; the owner's own quoted words appear, by design |
| Hidden Unicode (zero-width, bidi, BOM, soft hyphen) | OK | 0 hits in 25 files |
| Em dashes and en dashes | OK | 0 lines (MTK-007 holds for the files as authored) |
| Mockups make external requests or run script | OK | 0 `<script>`, 0 external `src`, `href`, `@import`, or `url(http` |
| Ads catalog: change control, schema, art paths, sample guard, retirement | **Medium** | M-4, M-5, M-7, M-8; L-1, L-7 |
| Editable words: checks, binding, rendering | **Medium** | M-1, M-3, M-5, M-9; L-2, L-10 |
| Where it shows (Special Ad Category) | **Medium** | M-2; L-8 |
| Launch on Facebook has no path to Meta | OK with one Low | L-3 |
| Removals, redirects | OK | Info I-3 |
| Light look, tenant accent, Inter and CSP | OK with one Low | L-5 |
| Compliance control 9 | **Medium** | M-9 |
| Tenant isolation of new reads | **Medium** | M-6; L-11 |
| Scope contract and operator checklist (public repository) | **Medium** | M-8; L-7 |

---

## Findings

### Critical

None detected.

### High

None detected. M-1, M-2, and M-9 are close to High in intent (they leave a stated compliance control bypassable) and are held at Medium only because launch is disabled, a human approves every version, and no external party can reach them. All three become High the moment launching is turned on (never-downgrade rule applies from that point).

### Medium

**M-1. Brand text, the disclosure, and the lead-form wording reach the ad outside every check, and the PRD never says they are read on the server.**
Location: `prd-009d-...md:55-60` (D3), `:75-89` (D5), `:184-185` (Security notes); `prd-009c-...md:95-96` (D5, the variant's `content`); `design/00-direction.md:414-424` and `design/mockups/launch-step-2-set-up.html:542` ("Disclosure, from your brand"). Code: `apps/web/src/server/open-house-draft.ts:30-31` and `:112-113` (today's save takes `disclosureText` and `consentText` straight from the request body); `packages/domain/src/campaign-foundation.ts:253-268` (the banned-phrase rule reads headline and body only).
What is wrong:
- (a) Every D5 rule reads "the words" (headline and primary text). The band also prints name, title, company, and the disclosure line. Title and Disclosure line are new free-text Brand fields (D3) with no length limit and no claim or Realtor check. A loan officer who types a rate claim into Title or into the Disclosure line prints it on the ad, and `EQUAL_HOUSING_REQUIRED` is satisfied by the Equal Housing text beside it. The sentence at `:185`, "The words are the only free text that reaches an ad", is false.
- (b) The disclosure is "locked" on step 2 only. Its source is the person's own Brand field, so the compliance disclosure is user-authored, against `compliance-and-risk.md:50` (lender-maintained blocks selected by a deterministic rule).
- (c) Nothing says the frozen brand, the disclosure, or the consent wording comes from the server. The code this lane replaces trusts the client for the last two. A port would let a request body carry another licensee's name and NMLS number onto a paid ad.
- (d) Brand colour is "one of six presets" (D3), but no criterion makes the server refuse any other value. It renders into style attributes, and CSP keeps `style-src 'unsafe-inline'` (`apps/web/src/security/content-security-policy.ts:31`).
Why Medium: self-entered text, human approval, launch disabled, no outside actor.
Fix: add a criterion `009D-AC-024`: "The save reads the brand from the signed-in person's saved Brand under tenant context. The request schema is `.strict()` and carries no brand, disclosure, consent, NMLS, or colour field, and a Postgres route test that posts any of them gets 400. A library-ad manifest's disclosure line and lead-form wording come from the catalog entry or a server constant, never from Brand or the request; Brand's disclosure line is dropped or becomes a read-only default. Every text field the band prints (name, title, company, disclosure) and both editable fields pass the D5 claim detector, the co-brand check (M-9), and a hard cap (title 60, disclosure 120, existing schema caps otherwise); each failing finding names the Brand field. Brand colour is stored as a preset id from a constant table, refused otherwise, and mapped to a hex value only at render." Correct `:185` to "The words and the Brand text printed on the band are the only free text that reaches an ad."

**M-2. "Where it shows" is free text, so a ZIP code, a radius, or a demographic typed into it passes the targeting rule.**
Location: `prd-009d-...md:71-73` (D4), `:143` (009D-AC-008), `:146` (009D-AC-011). Code: `packages/contracts/src/campaign-foundation.ts:303` (`regions`: any string up to 100 characters, up to 50 of them), `packages/domain/src/campaign-foundation.ts:335-350` (`TARGETING_NOT_ALLOWED` fires only when the `zipCodes`, `customAudienceRefs`, or `protectedDimensions` arrays are non-empty).
What is wrong: D4 has the person type "Austin, TX" or "Texas" into a chip field and stores the text by name as `regions` and a new `cities` list. The PRD gives no grammar, no state list, no count or length limit, and no refusal of digits. A value such as "78701", "Austin 78701", or "women 25 to 40" is stored, the rule sees `zipCodes: []`, and the version passes. AC-008's source scan proves no control for these exists; it does not prove no such value can be saved. `compliance-and-risk.md:69` requires blocking ZIP and protected-class proxies, and `:72` requires the final approval summary to show geography.
Why Medium: the hole is real in the stored manifest the approver signs, but no Meta call exists and the approval summary shows the values to a human.
Fix: extend D4 and AC-008: "A state is one of the 50 states or DC, by full name or two-letter code, stored as the code. A city matches `^[A-Za-z][A-Za-z .'-]{1,59}, [A-Z]{2}$` with a listed state. No value contains a digit, and none contains the words zip, radius, mile, within, age, male, female, men, or women. At most 5 states and 10 cities. The request schema refuses anything else with 400, and `TARGETING_NOT_ALLOWED` is extended to refuse any stored `regions` or `cities` entry that fails these rules. A unit table of at least 15 values includes '78701', 'Austin 78701', '10 miles around Austin', and 'women 25-40'. Step 3's 'What you approve' lists the normalised places."

**M-3. The claim detector has no normalisation and no evasion cases, and the rules do not refuse hidden or bidirectional characters.**
Location: `prd-009d-...md:89` (D5), `:145` (009D-AC-010), `prd-009-...-index.md:143` (R-4); `prd-009c-...md:117` (009C-AC-002 runs the same detector over every catalog default). The house approach is visible in `packages/domain/src/campaign-foundation.ts:378-383` (`normalizedText`: NFKD, strip non-alphanumerics), used for the Realtor check but not required for claims.
What is wrong: the detector is "patterns, not a model", and its 30-case table lists plain spellings. As written, "rates" with a zero-width character inside, full-width digits, "3 . 5 %", number words ("three percent"), homoglyphs, and bidirectional overrides all pass. The same words are rendered in the preview, on the campaign page, and in `aria-label` strings, so a bidi control can make a reviewer read something other than what is stored. `compliance-and-risk.md:48` makes these terms controlled fields; the detector is the only deterministic control over them.
Why Medium: the control exists but is easy to walk around with copy-pasted text; a human approves each version.
Fix: add to 009D-AC-010: "Before any rule runs the words are NFKC-normalised and lower-cased. Words containing any Unicode control or format character (including U+200B to U+200F, U+202A to U+202E, U+2060 to U+2069, U+FEFF), a line break in the headline, or an angle bracket are refused with a plain finding `WORDS_INVALID_CHARACTERS`. The claim detector also runs on a copy with whitespace and punctuation removed. As the conservative default, any digit, '%', or '$' in the editable words is blocking until counsel approves a narrower list, and number words next to percent, year, month, or payment are matched. The case table adds at least 10 evasion cases (zero-width inside 'rates', full-width digits, '3 . 5 %', 'three percent', a Cyrillic look-alike, a bidi override)." Keep "down payment help" legal: it carries no amount.

**M-4. The first of the "three independent" sample guards is true by default, so the real barrier is one variable.**
Location: `prd-009c-...md:79-81` (D3), `:119` (009C-AC-004), `:26` (Background 6); `prd-009-...-index.md:141` (R-2), `:132` (MTK-011), `:167`. Code: `apps/web/src/server/authenticated-workspace-data.ts:136` and `packages/config/src/environment.ts:152` and `:259` (`OALO_ENVIRONMENT` defaults to `local` when unset); `docs/production-environments.md` ("Only local permits defaults"); `tooling/scripts/database/review-browser-run.mjs:66` (the review run is a real `next start` with `local`, so `NODE_ENV` cannot tell it from a deployment).
What is wrong: D3 lists "environment is `local`" as a guard. On any deployment where `OALO_ENVIRONMENT` is unset, the existing schemas resolve it to `local`, and Background 6 itself records the hosted value as UNVERIFIED. A loader that reads the environment through those schemas satisfies the first guard on such a deployment, which also contradicts AC-004's own table ("unset" must not return samples). The third guard, a visible label, is cosmetic. So one variable, `OALO_ADS_LIBRARY_SAMPLES`, is the whole barrier. The sample catalog JSON is also bundled into every deployment by the loader import, and nothing checks a deployed instance.
Fix: add to 009C-AC-004: "The loader reads `process.env.OALO_ENVIRONMENT` raw and requires the literal string `local` (unset counts as not local; it never uses a schema default), requires the flag value exactly `enabled`, and refuses when `VERCEL` is set. Vercel documents `VERCEL=1` at build and runtime when system environment variables are exposed, a per-project setting, so this is an extra signal and not the only one (Vercel documentation, system environment variables, read 2026-10-01). A source-scan test fails if `OALO_ADS_LIBRARY_SAMPLES` appears outside an allowlist (the loader, the review run script, test helpers, the README, `docs/production-environments.md`). The operator checklist gains a read-only post-deploy check: the library page lists no 'Sample:' ad and the sample art route answers 404; and it records the hosted app's actual `OALO_ENVIRONMENT` value (the name, never a secret), replacing the UNVERIFIED."

**M-5. Approval binds the catalog reference, not the catalog content, and the approval snapshot for the new manifest variant is not specified.**
Location: `prd-009c-...md:90-102` (D5), `:121-122` (009C-AC-006, 007), `:60-62` and `:72` (D1), `:84-88` (D4). Code: `packages/application/src/campaign-foundation.ts:354-372` (`createApprovalDecision` builds `ApprovalSnapshotSchema` from `manifest.artifacts.*` and `manifest.property.*`), `apps/web/src/server/open-house-draft.ts:130-141` (the artifact references are random per draft), `supabase/migrations/20260915180000_campaign_activation.sql:176` (`snapshot` need only be a JSON object).
What is wrong:
- (a) The variant's image reference is "derived from the ad's id, version, and shape" plus size. Nothing in the manifest covers the art bytes. The art at `public/ads-library/<id>/v<n>/tall.png` can be replaced in a later commit without a version bump (D1 says the version goes up when the image changes, and nothing enforces it). An approved campaign would then point at pixels the approver never saw. `compliance-and-risk.md:12` and `:14` require immutable asset versions and invalidation on material change.
- (b) The variant has no `artifacts` and no `property` block (D5 lists its blocks), yet the approval path reads both. The PRD names neither function. If the builder is copied from the open house one, the snapshot's creative, copy, and disclosure references are random per-draft references that identify nothing, so `approval_evidence` would not name the ad even though the manifest hash still binds the content. AC-007 tests only the manifest hash.
Fix:
- (a) Add to D1 `images.tall.sha256` and `images.square.sha256` (64 lower-case hex) per entry, checked against file bytes by AC-002, and copied into the variant's `images[]` as `contentSha256` so the manifest hash covers the pixels. Add an immutability test: for every `(id, version)` that also exists at the base ref, the digests and `defaults` match the base ref (CI compares against `origin/main`), or keep a committed append-only `catalog.lock.json` of per-version digests. The approve step re-resolves the entry and refuses when the manifest's digests differ from the catalog's.
- (b) Add `009C-AC-015`: "`createApprovalDecision` builds the snapshot for a library-ad version from the variant: `creativeVersionRef` derives from the ad id, version, and art digests, `copyVersionRef` from the edited words, `disclosureVersionRef` from the disclosure text, and `datesHash` from `schedule`. No field is a random per-draft reference. A unit test shows two versions that differ in one word, or in one art digest, produce different snapshots."

**M-6. The approver's name cannot be read the way 009E-AC-004 says, and the obvious fix would break tenant isolation.**
Location: `prd-009e-...md:18` (Background 4), `:55` (009E-AC-004), `:81` (Security notes); `prd-009-...-index.md:6`, `:150` (R-11), `:227` ("no migration"). Code: `supabase/migrations/20260919120000_first_party_sessions.sql:21` and `:493` ("app_runtime holds no select on platform.app_users"), `supabase/migrations/20260721010000_platform_foundation.sql:127-134` (`app_users` has no `location_id` column), `packages/application/src/campaign-workspace-read.ts:55-59` (the projection carries role, not name).
What is wrong: the PRD reads `platform.app_users.safe_display_name` "through `actor_id` within the session's location". The runtime role has no select grant on that table, and the repository's own answer to the same problem is a `security definer` function with `set search_path = ''` (`platform.resolve_session_display`). So the criterion cannot be built under "no migration". The easy fix a lane will reach for is a `select` grant on `platform.app_users`. That table is global, with no location column to write a tenant-scoped policy against, so the grant would expose every user's display name across tenants.
Fix: change Background 4 and 009E-AC-004 to one of two stated options. (1) No migration: show the role ("Approved by the workspace owner" or "by an approver"; `actorRole` is already on the decision) and drop the name until a later PRD. Recommended. (2) A new `security definer` function in a migration that returns a name only for an actor with an approval decision in the caller's location, with a pgTAP case that a caller in another location gets no row; if chosen, update the index's "Schema changes", R-11, and 009F-AC-014(a) so step 0 names the migration. Add to the criterion: "No grant on `platform.app_users` to `app_runtime` is acceptable."

**M-7. Catalog art paths are unconstrained text, and the new sample art route has no stated lookup rule.**
Location: `prd-009c-...md:61-62` and `:72` (D1), `:77` (D2), `:117` (009C-AC-002); `prd-009-...-index.md:239` ("a route that serves sample art"), `prd-009c-...md:135`.
What is wrong: `images.*.art` has no grammar. The file checks (exists, PNG or JPEG, exact size) run in a test, and the runtime loader is not required to validate or contain the path. The sample art route is a new unauthenticated GET, and the usual implementation joins a request segment onto the art folder and reads whatever it finds under the app. Its only barrier is the sample guard of M-4. Art the owner supplies may also carry EXIF, XMP, or PNG text metadata (GPS, device, author), and it is committed to a public repository and served unauthenticated from `public/`.
Why Medium: reachable only on a local run with the flag, but one weak guard (M-4) is all that separates it from a deployment, and a file read would be High.
Fix: add to 009C-AC-002 and 009C-AC-004: "`art` is not free text. The schema requires it to equal exactly `<id>/v<version>/<tall|square>.<png|jpg>`, derived from the entry's own fields (it refuses `..`, a leading slash, a backslash, a colon, any URL scheme, and anything else). The loader joins that derived name to a fixed catalog root, asserts the real path stays inside the root, and refuses anything that is not a regular file. File type is decided by magic bytes, not extension, and SVG is refused. The schema test fails if a file carries EXIF, XMP, IPTC, or PNG text chunks (strip with the `sharp` the repository already uses). The sample art route takes `(adId, version, shape)`, looks the entry up in the loaded sample catalog, serves only the derived path, has no catch-all segment, and answers 404 for anything else. A test sends `..%2f`, an absolute path, and an unknown id with the flag on and gets 404 each time."

**M-8. "Reviewed pull request" is not enforced by the repository, and the intake path lets any GitHub account feed an agent the approval record.**
Location: `prd-009c-...md:108-110` (D7), `:150-152` (Security notes), `:129` (009C-AC-014); `prd-009f-...md:193` (009F-AC-014 item b); `prd-009-...-index.md:49`, `:167`. Repository facts read with `gh api` on 2026-10-01: ruleset `Repository hygiene baseline` (id 20013790) requires 0 approving reviews, `require_code_owner_review: false`, and lists the owner as an always-bypass actor; the classic branch-protection endpoint answers 404; the only collaborator is `jzferrell26` (admin); `.github/CODEOWNERS:2` is `* @jzferrell26`; forking is allowed.
What is wrong:
- (a) D7 says a new or retired ad is "a pull request the owner reviews" because of CODEOWNERS. CODEOWNERS is advisory here. The real gate is who can merge, which today is the owner alone. Accurate, but the PRD presents it as enforced.
- (b) The checklist has the owner file one GitHub issue per ad with the files attached, then "an agent opens a pull request". The repository is public, so any account can open an issue with the same title and attachments. The agent would consume untrusted text and images, and the entry's `approval.approvedBy`, `approvedOn`, and lender-review statement would come from issue text. That is a forged-attestation path into the compliance record.
- (c) Real ads, lender review notes, and approver names are committed to a public repository.
Fix: change 009F-AC-014(b): "The agent acts only on an issue whose author, read with `gh issue view --json author`, is `jzferrell26`; any other author's issue is ignored and reported. The `approval` block is never copied from an issue: the owner sets or confirms it in the pull request. Attachments are the two art files and the filled template only, with no lender policy text, lender names, or personal data." Change D7 to the true statement: "Only the repository owner can merge to `main` today. CODEOWNERS is not enforced, so the schema, art-digest, and sample-flag tests are the automated gate." Add a checklist line recording the ruleset setting and the owner's choice to require a review on `apps/web/src/features/ads-library/**` and `apps/web/public/ads-library/**` or not.

**M-9. Compliance control 9 is kept in intent, but the enforcement for library ads is a name match on the same person's saved partners, and AC-023's "unchanged" proves nothing.**
Location: `prd-009d-...md:82` (D5 `WORDS_REALTOR_OR_BROKERAGE_NAME`), `:158` (009D-AC-023); `prd-009f-...md:170`; `prd-009-...-index.md:47`. Code: `packages/domain/src/campaign-foundation.ts:400-470` (`evaluatePaidAdBrandBoundary`, which takes a collateral projection with a Realtor identity), its only call site `packages/application/src/campaign-foundation.ts:175` (the projection path, not manifest preflight); `apps/web/src/features/workspace/model.ts:24-30` (`PartnerSchema`: `name` and `company` minimum 2 characters; partners are stored per person in `platform.user_preferences`).
What is wrong: AC-023 asks that `evaluatePaidAdBrandBoundary` be "unchanged". The library-ad path (manifest preflight) never calls it and cannot, because it needs a collateral projection. So control 9 for library ads rests on two things: the flow reads no partner data, and one rule that matches names saved by the same person against the headline and text only. A person with no saved partner, a colleague's partner, or any brokerage typed into Title or company passes. `compliance-and-risk.md:31` prohibits a Realtor name, mark, contact, or dual-brand treatment in paid copy, creative, lead forms, and calls to action.
Fix: extend D5's rule: "It also blocks, in every text field the ad prints (words, name, title, company, disclosure), a fixed co-brand term list: realtor, brokerage, broker, real estate agent, listed by, listing agent, in partnership with, presented by, courtesy of, sponsored by, the registered-mark symbol, an at sign, a URL, and a phone number (counsel to extend). Saved partner names and companies are matched on normalised text and only when at least 4 characters long after normalising." Replace AC-023's "unchanged" with a testable clause: "A schema test asserts the library-ad variant has no key that can hold a Realtor identity, and the term list has a test table of at least 15 cases."

### Low

**L-1. Approve-time resolution is thinner than the save-time rule, and a replaced version stays approvable.** `prd-009c-...md:84-88` (D4), `:123` (009C-AC-008); `prd-009d-...md:146` (009D-AC-011). The retirement refusal is placed in the web handler (`campaign-approval-handler.ts`), not the application command, so any other caller of `executeHumanCampaignApproval` skips it. AC-008 refuses a retired ad; AC-011 refuses an unknown ad only at save. A campaign version whose ad is not in the active catalog (a sample id, or an entry removed later) is approvable. D-21 only blocks retired, so a version replaced because it was defective can still be approved. Fix: resolve the ad through a port inside the command, after the role check (the order PRD-008a fixed at `campaign-approval-command.ts:213-228`), and refuse unless the entry is found, `active`, and the highest version; a replaced version gets the "newer version" notice.

**L-2. No criterion says the words render as text only.** `prd-009d-...md:141` (009D-AC-006), `prd-009e-...md:54` (009E-AC-003). React escapes text, so residual risk today is nil; the repository's only `dangerouslySetInnerHTML` is the theme script (`apps/web/src/app/layout.tsx:35`) and its only `srcDoc` is the email preview (`apps/web/src/app/(public)/email-preview/page.tsx:114`). Fix: add a criterion and source scan: ad components (preview, band, library card, campaign page, list) render words only as React text children or attribute strings, with no `dangerouslySetInnerHTML`, `innerHTML`, `srcDoc`, markdown, or `href` or `src` built from words. A component test renders `<img src=x onerror=1>` and a script tag as the words and asserts the literal text.

**L-3. The launch button needs to be disabled by construction, and the default-off test has no Meta marker.** `prd-009d-...md:95-106` (D7), `:151-152` (009D-AC-016, 017). The D7 function takes inputs (Meta connected, approved, launching turned on) that "are reached only in tests". Code: `tests/security/provider-side-effect-default-off.test.ts:122` and `:125` scan production sources for Stripe and lead-provider markers only; `packages/ghl/src/meta-adapter.ts` contains no Facebook host. Fix: AC-016: the button has a literal `disabled` attribute and no `onClick`, `formAction`, or `href`; a component test passes every input as true and asserts zero fetch calls on click and on Enter and Space. AC-017: add a `META_OUTBOUND_MARKER` scan (`graph.facebook.com`, `facebook.com/v`, `connect.facebook.net`, `fbq(`) over production sources, expected empty, and assert the files under `apps/web/src/app/api/campaigns/` are exactly `approve` and `preflight`.

**L-4. "Cancel returns to where the person started" has no stated mechanism.** `prd-009d-...md:53`, `:137` (009D-AC-002); `design/00-direction.md:447`. If built as a `returnTo` or `from` URL parameter it is an open redirect. Fix: use history back or a fixed enum (`?from=home|campaigns|library`), never a URL; `?step` is an integer 1 to 3, `?topic` an enum, `?ad` an id resolved from the catalog; a test shows `?from=https://example.invalid` is ignored.

**L-5. The vendored font's recorded hash is self-referential, and CSP must stay as is.** `prd-009a-...md:74-75` (009A-AC-006, 007); `prd-009-...-index.md:166`. The test compares the file with a hash the same lane wrote. `font-src 'self'` and `default-src 'self'` (`content-security-policy.ts:29` and `:33`) already cover `/fonts/*`, so no CSP change is needed or wanted. Fix: the lane also records the digest GitHub's release API reports for the exact asset and the tag's commit, compares them, and writes both to `fonts/README.md`; AC-007 adds that `content-security-policy.ts` and `proxy.ts` are unchanged by this PRD and the browser test sees the font served from the application origin.

**L-6. Sample content should use the repository's own synthetic identifiers.** The mockups use "Jordan Rivera" (79 occurrences), "NMLS 123456", and "Sample Home Loans, NMLS 100200" (65 occurrences). The repository's synthetic brand is "Alex Morgan", "Prairie Home Lending", and "NMLS 0000000, synthetic" (`apps/web/src/features/brand/model/synthetic-brand-profile.ts:121`). Whether 123456 or 100200 resolves to a real licensee in NMLS Consumer Access is UNVERIFIED (the registry returned HTTP 403 to an automated fetch). `design/00-direction.md:410` shows `approvedBy` as the owner's real name in a sample entry. Fix: use the synthetic identifiers in the sample catalog and any redrawn mockup text, and add to 009C-AC-003 that every sample entry's `approval.approvedBy` is the literal "Sample catalog, not a real approval".

**L-7. Catalog metadata is public twice over.** `prd-009c-...md:69-71` (D1 `compliance.*`, `approval.*`), `:132`. `/_next/static` is served unauthenticated and the proxy matcher excludes it (`apps/web/src/proxy.ts:63`), so anything a client component imports from the catalog is public, in addition to the public repository. Fix: the loader module imports `server-only`; library pages are server components that pass display fields only (name, topic, defaults, alt, art path, version, reviewed date); a test asserts no client file imports the loader. The catalog README says `compliance.notes` states rules in general terms (no lender names or lender policy text) and `approvedBy` is a role or the owner's handle.

**L-8. An UNVERIFIED Meta claim ships as user copy.** `prd-009d-...md:73` (D4) against `:147` (009D-AC-012) and the index R-3. The hint's first clause, "Mortgage ads can't be aimed by age, gender or ZIP code", states a Meta rule, but R-3 lists Meta's rules as UNVERIFIED and AC-012 keeps unverified claims out of copy. `compliance-and-risk.md:61` verifies that rule for Google only; `:63` says only that Meta requires the Special Ad Category. Fix: until AC-012 records it VERIFIED, ship "You choose places here, not people." AC-012 also says a finding looser than this PRD is recorded and not applied without counsel (the index only says stricter findings are applied).

**L-9. The setup profile keeps collecting Realtor fields nothing reads.** `prd-009b-...md:59` (D4), `:76` (009B-AC-012). `setup_profile.v1` keeps `realtorName` and `realtorBrokerage` and `POST /api/setup/profile` stays. `compliance-and-risk.md:117` asks for data minimisation. Fix: the route's schema accepts and drops the two fields on write, and the PRD says existing values are neither read nor exported.

**L-10. Oversize words are stored, because the length rule is a finding and not a request limit.** `prd-009d-...md:81` (`WORDS_TOO_LONG`). Code: `apps/web/src/server/campaign-preflight-handler.ts:34` reads `await request.json()` with no size bound, while the preferences route uses `readBoundedJson(request, 40000)` (`workspace-preferences.ts:206`). Fix: the save schema is `.strict()` and refuses (400) a headline over 120 or text over 600 characters before storage, and the handler reads the body through `readBoundedJson`.

**L-11. Older-version addresses need a cross-location negative test.** `prd-009e-...md:42` (D2), `:56` (009E-AC-005), `:82`. Fix: add that another location's request for any older version address answers exactly as an unknown reference does, and the version number in the address is validated as a positive integer.

### Info

**I-1. Self-approval is allowed by the existing roles, and D9 depends on it.** `location_admin` is in both `CAMPAIGN_MUTATION_ROLES` and `CAMPAIGN_APPROVAL_ROLES` (`packages/application/src/campaign-command-context.ts:14-22`), and self-serve sign-up creates a `location_admin` binding (`password-authentication-handler.ts:1024`). A `campaign_creator` cannot approve (`approvalActorRoleForPrincipal` throws for other roles). The PRD changes none of this. Worth one sentence in the index: for a one-person workspace, approval is a self-attestation, and the real compliance gate is the curator's lender review (R-5).

**I-2. A new version resets campaign status, as 009D-AC-020 needs.** `packages/db/src/campaign-repository.ts:593-600` (`persistPreflight`) sets the campaign status to `awaiting_approval` or `preflight_failed` unconditionally, so appending version N+1 takes an approved campaign out of `approved`; `assertPublishFreshness` (`packages/domain/src/campaign-foundation.ts:546`) already requires an approval for the current version reference and manifest hash. Add a Postgres assertion for both when 009D-AC-020 is built.

**I-3. Removal leaves some read branches keyed on removed views.** `apps/web/src/server/workspace-page-data.ts:46-48` lists "automations" (and "marketing", "property-sites", "creative") in the report-read gate. They die with the `workspaceRoutes` keys and the redirects, but 009F-AC-005's source scan covers imports and `href`s, not data-read branches. Add "no read branch keyed on a removed view" to the scan.

**I-4. Document inconsistencies for `quality-guardian`.** `design/00-direction.md:394` sample art is 1080 by 1350 while 009C D1 says the art file is 1080 by 1080; the design says the font is `inter-latin.woff2` (Latin subset) while 009a's non-goal says vendored unmodified; `prd-009a-...md:25` says the Inter licence was read on 2026-10-01 while `design/00-direction.md:577` says UNVERIFIED.

**I-5. A two-character partner company would block nearly every ad.** `PartnerSchema` allows `company` of 2 characters; the normalised substring match D5 describes would match almost any text. Covered for security by M-9's four-character floor; the usability side goes to `quality-guardian`.

**I-6. Personal data in the documents.** The research files quote the repository owner's own words and name him; he is the repository's own `CODEOWNERS` entry, so this adds nothing new. No third-party personal data found. The 17 PNG previews were not inspected.

**I-7. Everything else the task named is clean.** See the review table below.

---

## Spec review against the controls the task named

| Item | Verdict |
|---|---|
| 1. Catalog change control | Partly. Only the owner can merge today, but CODEOWNERS is not enforced (M-8). Schema is strict and CI-checked; runtime validation and art paths are open (M-5, M-7). |
| 1. `images.*.art` traversal | Open. No grammar, and a new sample route with no lookup rule (M-7). |
| 1. Sample flag never reaches a deployment | Weaker than stated (M-4); adds enforcement and a deployed check. |
| 1. Retired ads cannot be launched | Sound for launch: launch is disabled in every case and D7's function covers the retired row. Approve-time gaps in L-1. |
| 2. Editable words: limits | Product limits fine; hard request caps missing (L-10). |
| 2. Deterministic checks run on edited words | Only on the headline and text, and without normalisation (M-3); brand text escapes them (M-1). |
| 2. Approval binds ad version plus words | Manifest hash binds the words and the reference; not the art bytes, and the snapshot is unspecified (M-5). |
| 2. Stored or reflected XSS | No hole today (React text escaping); no explicit rule (L-2). |
| 2. Creator approves own campaign | Existing roles allow it for `location_admin` only; unchanged by the PRD (I-1). |
| 3. Special Ad Category | Housing, places only, feed only are conservative defaults and are kept. Free-text areas bypass the ZIP rule (M-2); an UNVERIFIED claim ships as copy (L-8). |
| 3. UNVERIFIED Meta rules handled safely | Yes for defaults; L-8 for the copy and the looser-finding rule. |
| 4. Launch on Facebook | PASS. `providerPublicationAuthorized: false` is typed in `campaign-workspace-read.ts`, `provider_publish` is `available: false`, `/api/campaigns` holds only `approve` and `preflight`, and the PRD adds no Meta call, token, or route. Strengthening in L-3. |
| 5. Removals | PASS. No API route exists for leads, automations, reports, or marketplace (full route list read); they are served by the catch-all, so removing the keys removes them. Every redirect target is a fixed in-app address (009F Security notes), none takes a request value. Cancel target in L-4; read branches in I-3. |
| 6. Tenant accent and Inter | PASS. `tenant-accent.ts` is a server-owned catalog with a six-digit-hex and contrast validator; the PRD changes only the default entry's values. `font-src 'self'` covers the vendored font; L-5. |
| 7. Control 9 | Kept in intent; enforcement is thin (M-9). |
| 8. Scope contract and checklist | No secret, token, or personal data is required in the repository; the only environment name is `OALO_ADS_LIBRARY_SAMPLES`, with no value. M-8 on the public-issue intake; L-7. |
| 9. Sample content | No real person's data found beyond the owner's own words; identifiers in L-6. |

---

## Verified claims

Each PRD claim that a finding or a verdict depends on, checked against the code or a live source on 2026-10-01:

| Claim | Result | Evidence |
|---|---|---|
| The manifest is one blueprint and the database has no blueprint check | TRUE | `packages/contracts/src/campaign-foundation.ts:237`; `supabase/migrations/20260915180000_campaign_activation.sql:57` (`jsonb_typeof(manifest) = 'object'` only) |
| Preflight checks each present image's approval and size | TRUE | `packages/domain/src/campaign-foundation.ts:217-238` |
| The banned-phrase rule reads headline and body only; financing terms are a structured list | TRUE | `:253-268`; `:297-306` |
| `TARGETING_NOT_ALLOWED` checks arrays only | TRUE | `:335-350` |
| The current save mints a new campaign reference and takes disclosure and consent from the client | TRUE | `open-house-draft.ts:76-79`, `:30-31`, `:112-113` |
| No launch route exists; `provider_publish` is unavailable | TRUE | route list; `campaign-workspace-read.ts` (`PROVIDER_PUBLISH_ACTION`, `providerPublicationAuthorized: false`) |
| `OALO_ENVIRONMENT` defaults to `local` | TRUE (stronger than the PRD records) | `authenticated-workspace-data.ts:136`; `packages/config/src/environment.ts:152`, `:259` |
| `app_runtime` can read `platform.app_users.safe_display_name` | **FALSE** | `20260919120000_first_party_sessions.sql:21`, `:493` |
| Every file is owned by the owner, so changes are reviewed | Partly: ownership TRUE, review not enforced | `.github/CODEOWNERS:2`; ruleset 20013790 (0 required reviews, owner bypass) |
| The browser gate aborts any non-application origin | TRUE | `tests/browser/ui-foundation-ux.spec.ts:21-25` |
| Sign-up is limited to 10 per 3,600 seconds | TRUE | `password-authentication-handler.ts:121` |
| `/leads`, `/automations`, `/marketplace` are served by the catch-all keyed on `workspaceRoutes` | TRUE | `[...workspacePath]/page.tsx:10-27`; `features/workspace/model.ts:4-21` |
| The default tenant accent is `#2f6fed` and `globals.css` rebinds `--ac-primary` from it | TRUE | `tenant-accent.ts:15-27`; `globals.css:33-43` |
| `apps/web/public/fonts/` holds only a README | TRUE | directory listing |
| CSP already allows only same-origin fonts and images | TRUE | `content-security-policy.ts:27`, `:32-33` |
| Control 9, the rate-claim rule, and lender review are at the cited lines | TRUE | `compliance-and-risk.md:19`, `:48`, `:74`, `:154` |
| `VERCEL=1` is set at build and runtime when system variables are exposed | TRUE | Vercel system environment variables documentation, read 2026-10-01 |
| A new version resets campaign status | TRUE | `campaign-repository.ts:593-600` |

Not verified by this review (labelled so): whether NMLS 123456 or 100200 exists in the public registry (HTTP 403 to automated fetch); the hosted app's actual `OALO_ENVIRONMENT` value; whether the Vercel project has system environment variables enabled; Meta's current Special Ad Category rules (009D-AC-012 owns that); the pixel content of the 17 PNG previews.

---

## Files changed by this review

- Created: `library/requirements/backlog/prd-009-marketing-toolkit/qa/2026-10-01-authoring-security-review.md` (this report).
- `qa/README.md` was not edited (this task allows one file). No document under review was modified. No dependency, script, or build ran in the worktree.

---

## Verdict

**FIX FIRST.** No Critical or High finding. Nine Medium findings (M-1 to M-9) are specific edits to criteria or new criteria, listed above, and each can be applied by the author before the Gauntlet run. The eleven Low items and the Info items can be applied alongside or absorbed by the run. After the Medium edits land, a short re-read of 009C D1 to D5, 009D D3 to D5, and 009E-AC-004 is enough to turn this to PASS.

Hand-offs for `quality-guardian` (after this review, never before): I-4 (document inconsistencies) and I-5 (partner-name false positives).

The MTK-003 close-out security audit on the final tree remains required and is not satisfied by this document.
