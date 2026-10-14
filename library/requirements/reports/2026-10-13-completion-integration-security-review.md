# Completion integration Security review

**Audit date:** October 13, 2026, America/Chicago. **Auditor:** independent security-guardian. **Branch:** `codex/completion-integration`. **Frozen reviewed head:** `c625cff10ab569477859f5fd1adaf1b4d13d16eb`. **Compared main:** `728d5f0eb463bbf6abfe2519470fa536c022fa15`.

## Executive summary

PASS for the bounded combined source handoff to fresh Quality. No new Critical, High, Medium or Low finding detected in the consequential combined seams. Independent verification passed 322 unit cases across 21 files, 15 provider-default-off contract cases, production dependency auditing, secret/package/type-boundary checks and web TypeScript. No source remediation was required or performed.

This pass reviews the union of five already reviewed increments and their conflict resolutions. It is not a fresh whole-product audit, a hosted release acceptance or a claim that borrower, provider, storage and advertising outcomes are complete. The managed April 24 CVE watchlist is more than 120 days old. Current registry auditing and fresh primary maintainer sources supplement it; refresh the Weapon intelligence through its owning Guild workflow. The local Next.js 16.3.8 and React/React DOM 19.3.0 resolutions are retained.

## Scope and ordering

The parent explicitly authorized this report-only integration audit under the user-authorized Gauntlet. Ownership is exclusively this new report, with ignored verification artifacts under `test-results/security-integration/`. Other agents' source, tests, images, reports and ledgers were not modified. No commit, push, deployment, hosted migration, diagnostic activation or provider call was performed.

Consumed the integration ledger and the five existing scoped Security/Quality review pairs, including their corrective and artifact appendices: completion batch, financing photographs, runtime acquisition, single-LO homeowner readiness and webinar launch preparation. Historical findings and failed checkpoints remain historical; their later reviews and the independently observed feature CI metadata are recorded separately below. There was no combined Quality report at entry. Fresh combined Quality follows this pass. Inherited feature Quality documents do not independently certify this integration tree.

The actual host is Next.js/React/TypeScript with PostgreSQL/Supabase and private R2 storage. The native Next.js catalogs govern framework-specific checks. The integrated v2 authorization, secrets, dependency and transport procedures supplement them at applicable shared boundaries; its SvelteKit/WorkOS examples were not treated as this host's implementation.

## Scorecard

| Category | Status | Findings |
| --- | --- | --- |
| Financial/payment security | Clear in reviewed seams; saved financing calculations and media snapshots remain verified | None detected |
| PII and secrets | Private responses and allowlisted diagnostics retained | None detected |
| Authentication and authorization | Per-route identity, mutation policy, owner/version predicates and tenant transactions retained | None detected |
| Injection and untrusted input | Strict transport schemas, parameterized SQL, escaped rendering and contained assets retained | None detected |
| Dependency security | Production clean; unchanged owner-accepted development advisory recorded | No new finding |
| Configuration and transport | Static tracing inventory, private no-store headers and existing CSP spine preserved | None detected |
| Data integrity/resource handling | Immutable bytes, revocation checks, deadlines and late cleanup retained | None detected |

## Critical findings

None detected in this bounded combined review.

## High findings

None detected in this bounded combined review. The earlier Next.js dependency remediation remains present. The inherited development-tool exception below is not reclassified as a new resolved finding.

## Medium findings

None detected in this bounded combined review. The previously fixed runtime shutdown-rejection and historical webinar-art availability defects remain repaired. No waiver was added.

## Low findings

None detected in this bounded combined review. Existing webinar Quality suggestion WQ-02 concerns historical/latest summary projection and remains attributed to that report; it supplies no new approval or disclosure right.

## Independent combined boundary evidence

| Boundary | Reviewed evidence and disposition |
| --- | --- |
| Authentication and tenant context | `apps/web/src/server/authenticated-principal.ts:398` wraps the existing resolver only for diagnostics. The mandatory cookie/bearer, current binding, identity and Origin/CSRF branches at `:311-431` remain. `packages/db/src/transaction-context.ts:188` applies the principal-bound tenant context inside the transaction and activates the existing runtime role. Timeout fails before establishing a principal; optional display fallback cannot manufacture one. |
| Combined Campaigns reads | `apps/web/src/server/campaign-workspace-reads.ts:103` retains `projectCampaignWorkspace` before current webinar evidence in list rows. At `:249` the shown webinar version receives its own bounded review; financing v2 photographs are verified only after the saved page projection and source/calculation checks. The explicit verified empty-media predicate skips storage construction without converting malformed or nonempty galleries into empty ones. The four conflict resolutions preserve additive imports, assertions, workflow steps and strict manifest alternatives. |
| Approval and retry evidence | `packages/application/src/campaign-approval-command.ts:334` checks location and current approving authority before replay. Webinar decisions require all expected version/hash/row hints and current evidence at `:370-395`, before the existing-decision branch. `packages/application/src/webinar-ad-evidence.ts:21` verifies preflight hash, version, ruleset and input versions; `:47` verifies manifest/destination hash, publisher and expiry and requires the evidence port. Original open-house/library rules remain distinct. |
| Publication ownership and limited historical reads | `supabase/migrations/20261013230000_webinar_ad_destination.sql:15` rechecks current role version and first-party session, with restricted native modes. Owned preparation requires the publishing actor. Version review joins tenant, campaign/version, publisher and immutable destination; it accepts no free-standing foreign publisher authority. Public EXECUTE is revoked, search paths are empty and only three entry functions are granted to app runtime. `webinar-destination.ts:37` parses the full frozen snapshot, then projects only headline/description/hash for historical labels. Access-only links do not leave that DTO. |
| Save, incomplete persistence and safe recovery | `apps/web/src/server/webinar-ad-http.ts:91` resolves mutation authority before bounded JSON; `webinar-ad-prepare.ts:139` requires an actual workspace, own editable version, current Brand and own eligible publication. Actor/location/UUID derive immutable identities. Strict two-shape raster evidence and current preflight precede append. The separate preflight persistence failure remains an honest private 503 with confirmed opaque references, not approval. `features/webinar-ads/preparation.tsx:70` loads current own publication context before displaying or replaying retained words; `pending-save.ts:23` enforces one strict 8 KiB session record. No mortgage balance, credential or gated publication URL is added to browser storage. |
| Private saved ad bytes and historical continuity | `apps/web/src/server/webinar-ad-read.ts:123` resolves the actual read principal and scoped saved version before regenerating PNGs. Frozen manifest/destination/output hashes are verified. Historical rendering uses retained frozen assets, while approval uses active registry and publication evidence at `webinar-ad-evidence.ts:22`. `webinar-ad-art.ts:28` derives contained regular-file paths and rejects symlink/path escapes. Pango text is escaped at `packages/rendering/src/webinar-ad-raster.ts:126`. Download responses are private no-store, nosniff and inert PNG attachments. |
| Private financing bytes, rights and revocation | `financing-media-http.ts:107` checks mutation authority before consuming bounded JPEG/PNG bodies. `financing-media-service.ts:145` derives identities from the server principal and preserves original rights attestation on exact retries. Normalization checks dimensions, pixels, single-frame input, metadata, size and actual hashes. Readback precedes ready metadata; `:222` checks revocation before and after byte reading. Ordered output bundles match the full frozen snapshot and byte digest at `financing-output-media.ts:24`. Already downloaded bytes cannot be recalled. |
| Financing storage and additive RLS | `supabase/migrations/20261013210000_financing_media.sql:40` enables and forces RLS for both new tables; matching tenant, current actor and active creator/admin binding gate writes. Append-only triggers and select/insert grants remain. `financing-media-repository.ts:55` uses tenant transactions and SQL parameters. Private storage keys derive from validated server metadata; R2 methods at `r2-object-store-client.ts:574` and `:598` use the fixed configured private bucket, conditional immutable PUT, bounded GET and exact verification. Production never falls back to synthetic filesystem storage. |
| Mixed financing history and legacy compatibility | `financing-context.ts:142` selects only the actor's previous comparisons. At `:169` only known media/configuration refusal marks that photograph candidate unavailable; unexpected exceptions propagate. Verified text-only versions and legacy v1 behavior remain usable. `financing-verification.ts:25` retains manifest and recalculated-result integrity checks. No webinar import changes that saved calculation boundary. |
| Single-LO homeowner data | `homeowners/http.ts:166` constructs its runtime only after actual authentication; successful storage reads derive enum readiness without exposing setting names or credentials. `homeowners/runtime.ts:73` retains internal authority checks while replacing customer-facing role language. Single-LO account direction does not remove tenant isolation or enable a customer role-management surface. Previously reviewed removal/race tests preserve manual removal, future schedule/share refusal and minimal spent usage. No automatic retention interval or whole-account erasure capability is invented. |
| Shared acquisition cleanup and diagnostic privacy | `packages/db/src/postgres-adapter.ts:79` reuses the existing validated connection budget. At `:120` settlement removes timers/pending callbacks; timeout and close reject waiting callers, both driver continuations remain attached and late reservations release. Observer failure cannot affect cleanup. `campaign-persistence-runtime.ts:109` handles replaced-pool shutdown rejection. `runtime-timing.ts:5` requires exact `true`; `:32` reconstructs stage/outcome/safe-integer elapsed only and catches sink failure. No result, SQL, session, actor, credential, URL, contact or raw exception is emitted. Driver queue cancellation and total request deadlines are not claimed. |
| Function tracing and CI artifact union | `apps/web/next.config.ts:44` includes only fixed generic panels, fixed font/glyph/license files and the static config marker for known native consumers. No environment file, database record or private upload is included. `.github/workflows/ci.yml:85` and `:178` preserve the added artifact steps with pinned action, seven-day retention, fixed paths and `always()`; permissions remain `contents: read`, frozen installation and all verification gates remain. Seeded browser artifacts are disposable fixture evidence, not live customer captures. |
| Provider and customer authority | Webinar manifests strictly require `meta.enabled: false`. The independently executed provider contract sweep preserves unavailable publication controls, no launch-state transitions and fixed outbound hosts. Existing native single-LO signup authority is sufficient to save and approve own records; the separate reviewer in the seeded browser suite is test authority, not proposed customer onboarding. No lender creative approval or external launch is inferred. |

## Dependency audit and current intelligence

The deterministic managed `scan.ts` ran from this worktree with only its scratch output destination relocated to the ignored audit directory. Production auditing reported zero info, low, moderate, high and critical findings across 153 total production/optional dependencies. The script's root-only package/header detection is insufficient for this monorepo; nested app declaration, lockfile, headers and proxy composition were inspected directly. Windows separator-dependent console matching was supplemented by direct inspection of the new diagnostic emitter.

The full audit exited zero and reports one High development dependency, the existing owner-accepted `braces@3.0.3` advisory. `pnpm-workspace.yaml:50-54` records October 3 acceptance and November 3 revisit; this integration changes neither that exception nor its scope. Production remains clean. The lockfile delta consists of the reviewed Next.js patch family and direct reuse of already pinned Sharp 0.35.5; no new resolution host or audit exception was introduced.

The fresh [Next.js maintainer advisory](https://github.com/vercel/next.js/security/advisories/GHSA-cjq9-62q9-8jv4) identifies the image-optimizer remote-host SSRF class; this app adds no `images.remotePatterns` or user-selected fetch host. The fresh [React maintainer follow-up](https://react.dev/blog/2025/12/11/denial-of-service-and-source-code-exposure-in-react-server-components) confirms that earlier RSC patch thresholds were incomplete. The stale local watchlist was not used as sole current clearance. Exact locked/installed versions and fresh registry evidence support this bounded dependency result; undisclosed vulnerabilities and every future advisory are not certified.

Pattern-sweep leads were inspected rather than automatically counted: fixture guard literals, bundled skill templates, fixed theme bootstrap, a decorative `cardNumber` CSS class, and the bounded webinar retry record do not establish the flagged vulnerability patterns. No hardcoded secret, raw payment-card handling, prototype-pollution sink, caller-derived SQL or shell target was detected in the reviewed seams.

## Verification executed independently

| Check | Result and retained ignored evidence |
| --- | --- |
| Managed deterministic scanner | Exit 0; `test-results/security-integration/scan.log` and `scan-output/`; rules-file hidden Unicode scan clean |
| Production registry audit | Zero advisories at every severity; `scan-output/npm-audit.json` |
| Full registry audit | Exit 0; unchanged accepted development advisory only; `all-dependency-audit.json` |
| First focused combined unit selection | 13 files, 198 passed, 15.81 seconds, exit 0; `focused-green.log` |
| Adjacent campaign approval/read/history and homeowner unit selection | Eight files, 124 passed, 6.47 seconds, exit 0; `adjacent-green.log` |
| Provider-default-off contracts | One file, 15 passed, 3.62 seconds, exit 0; `provider-default-off-green.log` |
| Secret audit | Passed six source roots and public environment boundary; `secrets.log` |
| Package boundaries | Passed 16 packages; negative fixture refused both prohibited edges; `boundaries.log` |
| Product-type audit | No explicit any, CommonJS require or swallowed catch; `product-types.log` |
| Web TypeScript | Passed; `web-typecheck.log` |
| Union conflict provenance | All four raw source SHA-256 digests match integration ledger; `source-provenance.json` |
| Final accepted baseline provenance | Exactly 24 Ads Library images match released d050 Git blobs; no source/image rewrite; `source-provenance.json` |
| Incoming ancestry | All five incoming heads and final webinar evidence head are ancestors of c625cff; `source-provenance.json` |
| Diff hygiene | `git diff --check` passed; no tracked edits before this report |

These selected executions cover 337 cases in 22 distinct files. The initial adjacent unit command also listed the provider file, which is outside the unit project and was not executed there. Its separate contracts command above supplies the actual 15-case execution. No database pass is inferred from these unit/contract selections.

The integration owner's retained broad evidence is 4,220 passing tests plus one existing skip across 292 files and a sequential unchanged-threshold unit-coverage pass of 3,100 cases across 207 files. Those are attributed integration-owner results, not executions by this reviewer. Four earlier concurrent test timeouts remain recorded; the sequential run passed those cases without timeout/configuration waivers. No full suite was repeated without a finding to justify it.

## Feature CI evidence and combined qualification limits

Read-only GitHub metadata independently confirms completed successful full runs: parent `38479866248` at 5eb7fef, financing `38485495420` at 6628a10, runtime `38499455661` at 8e039dc and homeowner `38501022852` at 4b53122. Each has successful App, actual PostgreSQL and release-contract jobs. Manual-dispatch preview smoke is skipped on financing/runtime/homeowner; the parent's smoke passed. Canonical run `38498933268` at 679ce978 completed successfully in both write-mode jobs. Final webinar run `38504191342` at d0503a8 was still in progress when inspected, with no whole-run success credited here.

The webinar artifact reviews separately record actual 28-assertion new pgTAP success, 306 PostgreSQL cases including eleven new destination/preparation cases, and eight seeded native saved/reload/review/download/decision journeys. Their earlier overall run failed stale Library comparison and required coverage, with later bounded corrections retained. Positive stages are not relabeled as an overall pass. Independent UX/Security/Quality qualified the original 40 saved artifacts and exact 24 final Library replacements before integration; this reviewer additionally verified the integration's 24 baseline bytes against the released Git objects. Exhaustive new visual inspection is not claimed.

The combined tree still requires its own actual PostgreSQL/pgTAP and production-browser CI at the final integration head. Feature CI cannot replace that combined evidence. Neither source tests nor feature artifacts prove an applied hosted migration, private R2 availability, lender/photo permission, enabled licensed valuations, HighLevel delivery, domain setup, hosted timeout recovery or paid advertising. No live diagnostic setting was enabled. Source preparation and approval remain distinct from provider activation.

## Files changed and follow-up

| File | Change |
| --- | --- |
| `library/requirements/reports/2026-10-13-completion-integration-security-review.md` | New report and frozen combined source pins only |

No remediation source file changed. No new architectural security finding requires a product change from this pass. Fresh combined Quality must consume the pins below. The root retains current-main reconciliation, actual final-head CI, MERGEABLE PR evidence and the orchestrator's repository-health/code-review gate before release qualification. Refresh stale Guild CVE research separately. Preserve existing full-product, hosted and owner/provider qualifications.

## Frozen consequential source pins

SHA-256 values are exact raw working-file bytes at c625cff, including the four resolved source files. The ignored machine-readable packet is `test-results/security-integration/source-provenance.json`. A later report-only commit can retain this source clearance only if these source bytes remain unchanged.

| File | SHA-256 |
| --- | --- |
| `.github/workflows/ci.yml` | `90e889244ac6b10953a57bd954f82db8e9a7cf19e55f9b077458c9cf82bfd926` |
| `apps/web/next.config.ts` | `2c4100c4b390cb54cbedcfe3e62a9567841a4c204a59a01a9fbc78e37a70ce98` |
| `apps/web/package.json` | `d34206cfbde07023565e0b34a9dc413f2df82acb9be584036dda52d0715e91a4` |
| `pnpm-lock.yaml` | `a0f954bb5a5cbca2e78f84710307e360faf29cb7b729f29cad7fb8c3ad0e6349` |
| `apps/web/src/features/http/user-messages.unit.test.ts` | `61d771d54c36af0570ab4b8acaadb5a414fd065ee157d5fb5751da9a715a62db` |
| `apps/web/src/server/campaign-workspace-reads.ts` | `8b0493190294d603ccb72decce51a6518433cd81bb2565f16b16b75639b4a135` |
| `packages/contracts/src/campaign-foundation.ts` | `77c33427c0f874a05f5ac98e4b8f106fb2f3ab779b7e54cf77cf98cabbb2d9b6` |
| `apps/web/src/server/campaign-approval-handler.ts` | `d3dc4d3971789811372ab31f71fdb31f95295e74acf9b396b3448e9b99d32b3c` |
| `packages/application/src/campaign-approval-command.ts` | `5b6a53a57be5a763eb1252db27c9f1cf2adead290fa9576f4f066ec36300bfc8` |
| `packages/application/src/webinar-ad-evidence.ts` | `83e52f4bddc889050e34b2d52467d4e9e1c21be7ae8d376512ccf9f1adbbbda7` |
| `apps/web/src/server/webinar-ad-evidence.ts` | `3a70c2e623b4e50aa96974c891fbc3c9de3548179aeed4c90c96cc0ca3cb4ec5` |
| `apps/web/src/server/webinar-ad-http.ts` | `eaf555c4dc2229e57a623e788e1941ce26fb9ed83258a06b738ba24f46449d00` |
| `apps/web/src/server/webinar-ad-read.ts` | `ec07488359306fe09040297ca8e5a424d2297cff0ffb6def98b8a58cee1f7de4` |
| `apps/web/src/server/webinar-ad-prepare.ts` | `c65856b7c208789a3629fb67b57dc0958364238ad5c729a03874cef5b37e5682` |
| `apps/web/src/server/webinar-destination.ts` | `a5876679221c77aa923c91c58d266e99bc382fab42731da20f35fe5d992942cc` |
| `apps/web/src/server/webinar-ad-art.ts` | `2c3129682fe77e8b794090ceb9144c5d35ffccee4a679e98254f676d9d2fd7f0` |
| `apps/web/src/server/webinar-ad-raster.ts` | `3c209a3c03dc25c3d4f4d03af492a5d84aa89a72b1028a964be426cf86746680` |
| `packages/rendering/src/webinar-ad-raster.ts` | `c7bd7d5b8bec71936094ab8a353668d9b0382d7ccc6a396c11d4ee454f111a5e` |
| `packages/db/src/webinar-publication-repository.ts` | `dde8dc3c9c9be9e99dd126b85e84ede8990845010bdce2c5a367f82907ce81b8` |
| `apps/web/src/server/financing-media-service.ts` | `ffdc1d51f78a72661205c077010095423d76a1cfc35b911c767b0a08e96b3581` |
| `apps/web/src/server/financing-media-http.ts` | `2aff053a9b320c8bbe5242b64431810ddd66c11593c0a3a716a9773066a0f482` |
| `apps/web/src/server/financing-media-runtime.ts` | `ca9c537e21085bd7608f03169e4daa452425c3d912043633f757943017aa8e4f` |
| `apps/web/src/server/financing-output-media.ts` | `7e2974e4497095b489eda813a7a70841934a7689e307e6c73dbe732cf5d9d9b7` |
| `apps/web/src/server/financing-context.ts` | `98275cf57418a816d06f304c13c123565d3021f177ee87d6e61fa6771c9182c3` |
| `apps/web/src/server/financing-verification.ts` | `4317ea1f42072485d4d33536ea2b343ffb3c8e4321d796792544cc030331f4be` |
| `packages/db/src/financing-media-repository.ts` | `e5686f48ae9e330578eb44ae4030d62c04649ca847ff30a26fa63b2a2bf77514` |
| `packages/storage/src/financing-media-storage.ts` | `638836d26f5cd20ecb00a8818ca9db51fa5a083fed0641efeec53da5c32712a2` |
| `packages/storage/src/r2-object-store-client.ts` | `04a73c840feb9a7ce5b0ae9f69c16f43bb8a0523ce326bbbc1fedfa231aee599` |
| `apps/web/src/server/runtime-timing.ts` | `102f793d6c1ee6859734700d3af9f698c63d61650db7a37f06d1d4b914d3f58d` |
| `apps/web/src/server/campaign-persistence-runtime.ts` | `a7af324703dc559c6ef9aa3a08ede9268141776c6def29466c1274d44e00458f` |
| `apps/web/src/server/runtime-authentication.ts` | `da6be8a73e1bb61741edddd215a6588c6daca6260fc393b10ce9969f5ef1fce8` |
| `apps/web/src/server/authenticated-principal.ts` | `310794a3a7aed57810e112fd626463d430c720d70736990fcc89e1379cfe203a` |
| `packages/db/src/postgres-adapter.ts` | `a7461870b39157e72e3339f83d420727f1113bee45d836921b1fefa8af4e3196` |
| `apps/web/src/server/homeowners/readiness.ts` | `b26d8d37cd86eae9355ba51a1d92a3c52e82a17a5757b67f8220ea03adeda2c9` |
| `apps/web/src/server/homeowners/runtime.ts` | `5ba28a71c875bad136e34c0eb55c5cb02b67a440e74f7af829b36ebfb224fa6f` |
| `apps/web/src/server/homeowners/http.ts` | `c686d8fe49a919e615b8b1534f24ae47763b39df9657301645590ca0d4b0902a` |
| `apps/web/src/features/webinar-ads/pending-save.ts` | `f90a988e863d51ad80550b2b1a1ccc95e6401a067233cb6378ff3123997a4261` |
| `apps/web/src/features/webinar-ads/preparation.tsx` | `7dfc24bc7ac509e3271c06bbbf68e13cb6d76f6f6219a5d5c67ebb1034a31507` |
| `apps/web/src/server/home-reads.ts` | `5180a0dea4df197673d8c799693a76b47e439482a157ae7c7ee6dce4cdf08c8f` |
| `supabase/migrations/20261013210000_financing_media.sql` | `63a525c6970166fa76391a69772c99fa51ba93ffed1780dee04f9b901146c77c` |
| `supabase/migrations/20261013230000_webinar_ad_destination.sql` | `8165cd4d7f27776d902a56ccf9f95818e1419239b972db9af7374f51059a3620` |
| `supabase/tests/financing_media.pgtap.sql` | `f5f6c0a7073b5b79627eb051ff42b577e5760eec716bd1960436a3f7d8845c23` |
| `supabase/tests/webinar_ad_destination.pgtap.sql` | `d965ffbdebdb4d8e5706b340f422d29744aac7d519459f1d91aef0c0ec4f24e0` |
| `tests/browser/review/webinar-ads.spec.ts` | `67687a8d087905fc2148ac1dcdd00ea6a013a7939c69a5957cfea9b102a2bf02` |
| `tooling/tests/unit/webinar-ads/webinar-foundation.test.ts` | `ccae214a5966478d7d7dbd015b696f9a5e39d29d25cf4980c8c01dde8f255e4f` |
