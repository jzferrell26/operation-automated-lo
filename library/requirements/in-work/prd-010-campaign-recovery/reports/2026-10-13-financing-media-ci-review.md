# Financing media CI review

Date: 2026-10-13

Reviewer: devops-guardian

Result: PASS for the bounded artifact-retention delta. No unresolved DevOps findings in that delta.

## Scope and resolved finding

The first review found that `tests/browser/financing-photos.spec.ts` runs in the synthetic Chromium project, but the proposed artifact upload existed only in the database job. Separate jobs have separate filesystems, so that upload could not retain the financing screenshots produced by Application verification.

The final workflow resolves this by adding `synthetic-product-review-frames` to Application verification at [ci.yml:85](../../../../../.github/workflows/ci.yml). The database job retains its separate `product-review-frames` upload at line 168. Both upload only `test-results/product-review-frames`, use `always()`, tolerate a missing directory, retain artifacts for seven days, and reuse the existing `actions/upload-artifact` SHA `043fb46d1a93c77aae656e7c1c64a875d1fc6a0a`.

The synthetic producer writes a constant `financing-photos` subdirectory at [financing-photos.spec.ts:24](../../../../../tests/browser/financing-photos.spec.ts). Its PNG captures and synthetic PDF output are outside Playwright's cleared `test-results/browser` directory. The spec uses shared `REVIEW_FRAMES` dimensions at line 37, original fictional image/property/lender inputs, local HTTP upload/save/output requests, and an assertion that provider publication is unauthorized. Lines 43-48 record page requests to external HTTP origins and line 213 requires that list to remain empty. This is synthetic Chromium evidence; it does not claim a signed-in PostgreSQL journey.

## Workflow boundaries

- Events remain `pull_request` targeting main, push to main, and manual dispatch. No privileged event was added.
- Workflow and job permissions remain `contents: read` (lines 12-13, 23-24, and 111-112). No additional token permissions or cloud credentials were introduced.
- `pnpm verify:offline` at line 65 and `pnpm test:db` at line 154 remain unchanged. No verification step, timeout, cleanup, or failure gate was removed or weakened.
- Artifact names distinguish synthetic evidence from database-job evidence. The narrow output directory excludes environment files, credentials, TLS key directories, and general application/database dumps. The test-created PDF contains fictional fixtures.

Governing basis: the installed `devops-weapon/guides/00-principles.md` sections 2, 4, and 7; `guides/06-actions-security.md` sections 2, 3, and 5; and its paired research notes `2026-04-25-actions-permissions-hardening.md` and `2026-04-25-actions-pin-to-sha.md`.

## Verification performed

- Installed `scripts/audit-workflow.sh`: exit 0, clean across both repository workflows.
- Prettier check of final `ci.yml` and financing browser spec: exit 0.
- `git diff --check` for those two files: exit 0.
- Existing real-database orchestration and review-browser-run contract suites: 2 files, 38 tests passed, exit 0. These are orchestration tests with test doubles; they do not execute PostgreSQL or a browser.
- Source diff inspection confirms exactly two additive artifact steps and no changed CI gates or permission blocks.

Actual PostgreSQL, pgTAP, hosted sign-in, provider/live-data qualification, successful GitHub artifact delivery, and the running financing UI matrix remain separate evidence requirements. This review does not certify them. The parent retains Security followed by Quality closeout.
