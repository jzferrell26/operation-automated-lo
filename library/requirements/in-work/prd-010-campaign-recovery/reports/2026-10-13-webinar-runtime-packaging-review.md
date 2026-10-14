# Webinar renderer runtime asset packaging

Date: October 13, 2026. Guardian: devops-guardian. Scope: `apps/web/next.config.ts`, the packaging regression in `tooling/tests/unit/webinar-ads/runtime-packaging.test.ts`, and this report.

Evidence workspace: `C:/Users/jzfer/.codex/worktrees/webinar-launch-readiness/AutomatedLO Project`. Source paths below resolve against that absolute workspace.

## Finding and correction

The webinar renderer dynamically resolves source PNGs and its pinned font/cmap on the server filesystem. Serving a file from `public/` does not prove the deployed function contains it. `apps/web/src/server/webinar-ad-art.ts:13` also uses the presence of `next.config.ts` as its application-root working-directory marker. A function assembled without that marker can select the wrong path even when its public assets were copied.

`apps/web/next.config.ts:44` now explicitly traces the required files for the preparation, review, art, approval, campaign list/detail/history and overview consumers. The existing redirects, security headers, transpiled packages and Turbopack root are preserved. No runtime feature, provider, database, dependency or workflow configuration changed in this lane.

The includes use forward slashes and literal escaped dynamic segment names. They cover the eight required consumers. Turbopack 16.3.8 also matches ten campaign/context descendants and does not apply exclusions to manually included files. The ineffective exclusions were removed. No repository-wide or public-folder-wide glob is used: only the 34 required files, totaling 2,317,807 bytes, enter those traces. Exact isolation to eight route traces is not achieved within this configuration scope; the observed 18-trace scope is recorded below.

Sources: [Next output tracing documentation](https://nextjs.org/docs/app/api-reference/config/next-config-js/output), especially Caveats; installed `apps/web/node_modules/next/dist/build/collect-build-traces.js:485`, `:504`, `:521`, `:543` and `:555` (project-root filesystem glob resolution, route normalization, picomatch options and trace-relative include paths); DevOps Weapon `guides/00-principles.md` sections 1, 4 and 9, plus integrated `upstream-v2/guides/10-local-ci-parity.md` section 6. The public documentation currently describes Next 16.4.0. Local 16.3.8 source and actual production traces are both necessary evidence, because the Turbopack and JavaScript collectors differ.

The observed include/exclude separation is also corroborated by [the official 16.3.0 Turbopack implementation](https://github.com/vercel/next.js/blob/v16.3.0/crates/next-api/src/nft.rs), where module tracing applies exclusions separately from additional filesystem includes, and [its route-glob configuration parser](https://github.com/vercel/next.js/blob/v16.3.0/crates/next-core/src/next_config.rs#L1698), which sets `contains: true`. These earlier 16.3 sources explain the behavior; the installed 16.3.8 production traces establish the behavior for this repository.

## Exact assets and consumers

Each consumer requires 34 files: 30 original PNGs, the pinned TTF, its glyph-range JSON, the unchanged parent font license, and the application-root configuration marker. The font derivation script and README are excluded.

Fixed files relative to the Next project root, `apps/web/`:

- `next.config.ts`
- `public/fonts/LICENSE.txt`
- `public/fonts/webinar/AutomatedLOWebinarInter.ttf`
- `public/fonts/webinar/glyph-ranges.json`

The PNG include is `public/webinar-ads/*/v1/{tall,square}.png`. Both filenames exist under each of these exact directories:

- `public/webinar-ads/webinar-before-home-search/v1/`
- `public/webinar-ads/webinar-budget-beyond-price/v1/`
- `public/webinar-ads/webinar-budget-your-life/v1/`
- `public/webinar-ads/webinar-cash-to-close/v1/`
- `public/webinar-ads/webinar-closing-checklist/v1/`
- `public/webinar-ads/webinar-credit-next-step/v1/`
- `public/webinar-ads/webinar-credit-preparation/v1/`
- `public/webinar-ads/webinar-credit-questions/v1/`
- `public/webinar-ads/webinar-first-home-plan/v1/`
- `public/webinar-ads/webinar-offer-to-keys/v1/`
- `public/webinar-ads/webinar-paperwork-path/v1/`
- `public/webinar-ads/webinar-path-to-closing/v1/`
- `public/webinar-ads/webinar-preapproval-explained/v1/`
- `public/webinar-ads/webinar-questions-first/v1/`
- `public/webinar-ads/webinar-renting-next-chapter/v1/`

Verified production consumer traces, relative to `apps/web/.next/server/app/`. Every row contains all 34 files and the native Sharp binary:

| Consumer                        | Trace                                                                                     |
| ------------------------------- | ----------------------------------------------------------------------------------------- |
| Prepare a saved version         | `api/campaigns/webinar-ads/route.js.nft.json`                                             |
| Read a saved review             | `api/campaigns/webinar-ads/[campaignRef]/[campaignVersionRef]/route.js.nft.json`          |
| Regenerate/download saved art   | `api/campaigns/webinar-ads/[campaignRef]/[campaignVersionRef]/[shape]/route.js.nft.json`  |
| Record a human approval         | `api/campaigns/approve/route.js.nft.json`                                                 |
| Read campaign rows              | `(authenticated)/marketing/campaigns/page.js.nft.json`                                    |
| Read campaign detail            | `(authenticated)/marketing/campaigns/[campaignRef]/page.js.nft.json`                      |
| Read version history            | `(authenticated)/marketing/campaigns/[campaignRef]/versions/[versionNo]/page.js.nft.json` |
| Read home approval availability | `(authenticated)/overview/page.js.nft.json`                                               |

The preparation/read consumers reach `webinar-ad-raster.ts`; approval, campaign and overview consumers reach `webinar-ad-evidence.ts`, which verifies source art and regenerates frozen raster evidence. Those are actual server dependencies, rather than static-page assumptions.

The exact ten additional traces produced by the collector's prefix matching are:

- `api/campaigns/webinar-ads/context/route.js.nft.json`
- `(authenticated)/marketing/campaigns/webinar/page.js.nft.json`
- `(authenticated)/marketing/campaigns/synthetic-open-house-001/page.js.nft.json`
- `(authenticated)/marketing/campaigns/property/page.js.nft.json`
- `(authenticated)/marketing/campaigns/new/page.js.nft.json`
- `(authenticated)/marketing/campaigns/library/page.js.nft.json`
- `(authenticated)/marketing/campaigns/financing/page.js.nft.json`
- `(authenticated)/marketing/campaigns/funnels/page.js.nft.json`
- `(authenticated)/marketing/campaigns/funnels/[kind]/page.js.nft.json`
- `(authenticated)/marketing/campaigns/funnels/[kind]/preview/page.js.nft.json`

The verifier checks the complete observed set against those 18 paths. Account settings and public capture receive no PNGs from this configuration. The build records `node_modules/.pnpm/@img+sharp-win32-x64@0.35.5/node_modules/@img/sharp-win32-x64/lib/sharp-win32-x64-0.35.5.node` in every required consumer, proving the locally installed native dependency was traced.

## Verification

The regression uses the installed Next JavaScript collector's picomatch and glob implementations. Before adding the includes, all eight consumer checks failed and four layout/negative checks passed. The final 13 cases pass. The guard verifies all 34 files for every required consumer, rejects includes for account settings and public capture, and explicitly records descendant matching rather than claiming unsupported exact-route isolation.

The relocation cases use the actual runtime loader and confined reader with all 33 public files in an application-root layout and a monorepo-root layout. Every file is readable at the preserved relative path. Deliberately omitting `next.config.ts` from the application-root fixture makes the loader choose a nonexistent path and fail. This proves the marker is a required part of the current loader convention.

Focused lint, tooling TypeScript and changed-file whitespace checks pass. The first full `pnpm build` completed compilation with Next 16.3.8 but failed web TypeScript on UI integration imports of fixtures outside the web package. The owning UI/server lanes corrected that boundary. Subsequent actual trace checks caught two collector differences: a JavaScript-compatible lookahead omitted required assets in Turbopack, and exclusions did not remove explicit includes. Neither approach remains in the final configuration.

Final `pnpm build`: 16 successful tasks, 15 cached, 11.166 seconds, Next 16.3.8/Turbopack, Windows/Node 24.18.0/pnpm 11.15.1. The actual trace verifier passes all eight consumer inventories and the exact observed 18-trace set. It copies files listed by the preparation trace into fresh relocated application-root and monorepo-root layouts; all 34 files retain their SHA-256 hashes and expected runtime paths in both layouts. The separate regression invokes the actual `webinarPublicRoot` and contained-file reader. This is filesystem packaging proof, not execution of a complete relocated Next function.

Pinned file hashes checked in the final trace relocation:

| File                | SHA-256                                                            |
| ------------------- | ------------------------------------------------------------------ |
| Parent font license | `262481e844521b326f5ecd053e59b98c8b2da78c8ee1bdbb6e8174305e54935a` |
| Derived TTF         | `f8051d65db9b84447725125371871f36c382b14be90bf417771b059ea77e5947` |
| Glyph ranges        | `30678790e49b55a9e323cba9d40c184c14ff73449d2a77f288a310f546e9d996` |

Local evidence paths:

- `test-results/webinar-runtime-packaging-red.log`
- `test-results/webinar-runtime-packaging-green.log`
- `test-results/webinar-runtime-packaging-types.log`
- `test-results/webinar-runtime-packaging-build.log`
- `test-results/webinar-runtime-packaging-build-type-boundary-red.log`
- `test-results/webinar-runtime-packaging-build-matcher-red.log`
- `test-results/webinar-runtime-packaging-trace-matcher-red.log`
- `test-results/webinar-runtime-packaging-trace-descendant-scope.log`
- `test-results/webinar-runtime-packaging-trace-verification.log`
- `test-results/webinar-runtime-packaging-traces.json`

## Practical limits

The runtime recipe preserves `apps/web/public/...` when the function working directory is the monorepo root, or `public/...` plus `next.config.ts` when it is the application root. The build trace records files relative to each `.nft.json`; consumers must preserve those relative paths when assembling a function.

Local Windows trace and relocation verification cannot prove Vercel's deployed working directory, Linux native-library packaging or execution. Hosted production execution remains a separate qualification. This change does not authorize a deployment, provider activation, an ad launch, or spending. Security and Quality closeout belong to the parent sequence after the complete implementation is stable.

## CI evidence retention follow-up

Additional assigned scope: `.github/workflows/ci.yml` and this report append. The earlier configuration, renderer assets and packaging regression are preserved.

The workflow previously retained only failed Playwright traces from `test-results/browser`. The webinar product-review captures live outside that directory, so successful captures and partial results after another failure were not retained by those existing uploads.

Two new steps follow the unchanged verification commands and existing failure uploads:

| Job                                  | Artifact name                       | Exact included path                                            | Expected producer output                                                     |
| ------------------------------------ | ----------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Application verification             | `webinar-preparation-review-frames` | `test-results/product-review-frames/webinar-preparation/*.png` | 24 synthetic local-production setup/retry pictures                           |
| Real PostgreSQL migrations and pgTAP | `webinar-ads-review-frames`         | `test-results/product-review-frames/webinar-ads/*.png`         | 24 seeded setup/review/approved pictures and 16 frozen branded PNG downloads |

Both steps use `if: always()`, the existing immutable `actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a` pin (v7.0.1), seven-day retention and `if-no-files-found: ignore`. The wildcard is restricted to PNG files inside each named evidence directory. No database, credential, raw store, HTML, PDF, unrelated picture directory or baseline file is included.

Producer verification: `tests/browser/webinar-preparation.spec.ts:47` writes choose/setup/retry images for four `REVIEW_FRAMES` and both themes. `tests/browser/review/webinar-ads.spec.ts:36` names the seeded output directory; `:143`, `:199` and `:221` save setup/review/approved images, and `:184` saves each tall/square download before checking its SHA-256 against the frozen manifest. `playwright.config.ts` keeps the synthetic suite in `chromium` and the seeded suite in the database gate's `review` project. Twenty-four local synthetic preparation PNGs existed when this lane inspected the bounded directory. This lane did not run a new browser, server, build, PostgreSQL gate or GitHub upload.

Verification:

- YAML parses and passes Prettier. A source invariant check removes exactly the two added upload blocks and requires the remaining workflow to be byte-identical to the saved pre-change workflow, proving prior events, permissions, concurrency, jobs, verification commands and gates are unchanged.
- Both new blocks independently pass condition, immutable action pin, bounded path, absent-file behavior and seven-day-retention assertions.
- Existing database orchestration/review-run unit suites: 38 passed across two files. These validate command plans with fixtures, rather than starting database or browser services.
- Tooling TypeScript and changed-file whitespace checks pass.
- Final `.github/workflows/ci.yml` SHA-256: `71da6f3875b01cf80cc8ba8480b01cb5c79fb862ac0a6281baf5888cc640490f`.

Local logs: `test-results/webinar-ci-retention-invariants.log`, `webinar-ci-retention-tests.log` and `webinar-ci-retention-types.log`. Security was notified when the workflow became stable for its independent scoped review. Actual artifact availability and completeness remain pending a GitHub run; a partial upload after a failed test is evidence, not a successful verification result.

Sources: [GitHub status-check expressions](https://docs.github.com/en/actions/reference/workflows-and-actions/expressions#always), [upload-artifact inputs and wildcard behavior](https://github.com/actions/upload-artifact#inputs), [GitHub artifact retention](https://docs.github.com/en/actions/tutorials/store-and-share-data); DevOps Weapon `guides/06-actions-security.md` sections 1 through 3 (existing least-privilege permissions and immutable action pins), and `guides/05-actions-architecture.md` section 5 (step/job conditions).
