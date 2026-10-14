# Webinar full-regression corrections

Date: October 13, 2026, America/Chicago. Implementer: typescript-node-guardian. This is a scoped source handoff, not Security, Quality, current-browser or hosted acceptance.

## Corrected failures

Root's full six-project regression reported 4,089 passed, one existing skip and six failures in five files. The Quality follow-up table in `2026-10-13-webinar-launch-quality-review.md` governs this correction. An independent focused RED run reproduced all six failures before edits, with 62 other cases passing: `test-results/webinar-regression-corrections-red.log`.

The source corrections preserve actual provider behavior and the current publication/approval contract:

- The default-off API inventory adds only the explicit `webinar-ads` preparation/read namespace. Every existing Meta, publication authorization, launch-state and outbound request plant remains enforced. No launch or publish allowance was added.
- Approval confirmation says that recording the decision does not publish an ad or spend money. It no longer contains the lexical claim `launched` that the strict screen guard forbids, even in a negative sentence.
- The eight identified copy terms are replaced with concrete saved-version language. Preparation conflicts still preserve the user's details and require inspection of the latest saved version before another save. Saved review still describes exact lender identity, disclosure, wording and disabled Facebook launch truthfully. Domain findings retain their existing codes, affected fields and remediation behavior.
- Five actually emitted errors receive central sentence pairs: `DESTINATION_UNAVAILABLE`, `WEBINAR_EVIDENCE_UNAVAILABLE`, `WEBINAR_INVALID`, `WEBINAR_UNAVAILABLE` and `WEBINAR_VERSION_CONFLICT`. Uncertain saves advise retrying the same save; conflicting versions advise reviewing the latest saved version before preparing another. The generic unavailable code also covers GET reads, so its save advice is conditional on having been saving.
- The rule-name and fix-target test derives the union of all registered rulesets. It still requires exact equality in both maps, with no absent or extra rule names, so the five webinar rules are covered and future registered rules cannot silently escape the test.

No schema, request, identity, image production, approval execution, provider, migration or workflow behavior changed. No fixture or empty-photo import was added merely to satisfy a scanner.

## Image-summary classification

The legacy source guard matched CSS `styles.images` and the mandatory webinar picture pair as though they were potentially empty property photos. CSS class selection is now removed from the data-read scan.

The webinar exception removes only `manifest.images.map` in the exact review source when its typed `WebinarAdCampaignPage` argument and page/review/manifest bindings are present. The exact schema-parsed test helper's first literal picture field is separately recognized as fixture construction. No directory or complete source file is skipped. Other image fields and reads in those same files remain guarded.

New falsifiable tests prove that:

- The actual webinar fixture parses a tall/square pair, while empty, one-picture, three-picture, reversed-shape and unknown-shape inputs are rejected by the existing contract.
- Planting legacy image counts, property image reads or `manifest.images.length` into the same webinar review source still reports that file.
- A legacy image read planted in the schema-parsed helper is also reported.
- Removing the review's webinar type or placing its source under another filename restores the guard failure.
- A CSS class read alone is not classified as picture data.

The original silent legacy property-screen plant and honest empty-photo control remain intact. No global empty-image-policy exemption or unused empty-property-photo sentence was introduced.

## Verification and open close-out

The final focused run passed 127 tests in eight files across unit, contracts and integration projects, using the existing two-worker bound. It covers every failed guard, webinar foundation checks and preparation/review interactions. Evidence: `test-results/webinar-regression-corrections-green.log`. A final lint-only simplification removed an unnecessary array spread in the registry test; its ten cases passed again in `webinar-regression-registry-final.log`. These overlapping runs are not additive.

The initial combined project command lacked a common worker setting and Vitest refused it before executing tests. It was rerun with `--maxWorkers 2`; no runner configuration, assertion or timeout was weakened.

Web, domain and tooling typechecks, oxlint without warnings, scoped Prettier, boundary audit and zero-clone duplication passed. Evidence files use the `test-results/webinar-regression-` prefix. `git diff --check` passed. No production build or browser capture was run by this lane, per root's coordination instruction.

The full wave remains OPEN pending root's complete regression, fresh screenshots for visible copy changes, independent Security and fresh Quality against these source pins. Prior presentation and source acceptance cannot be inherited unchanged. No commit, push, baseline acceptance, database operation or hosted action was performed.

## Source pins

| File | SHA-256 |
| --- | --- |
| `apps/web/src/features/webinar-ads/preparation.tsx` | `7dfc24bc7ac509e3271c06bbbf68e13cb6d76f6f6219a5d5c67ebb1034a31507` |
| `apps/web/src/features/webinar-ads/review.tsx` | `07491245c68938ca1f5993cea13f83626e6dab9018674b1d06891ae2a9c7e3ec` |
| `apps/web/src/features/campaigns/components/campaign-approval-controls.tsx` | `ea4268376542c733209b43aefec99dba03b1ea2b8a5fc10eb36c4775f8d40bff` |
| `apps/web/src/features/webinar-ads/review.integration.test.tsx` | `7fc99fd8ffa61affda5f9c68e0018648f7734d684e19bc4497042f9520a014ec` |
| `packages/domain/src/webinar-ad-ruleset.ts` | `baf788e4fd9c1718614c2297f578f16119a76bcb8450be426f2b92a8e5ccaf4a` |
| `tests/security/provider-side-effect-default-off.test.ts` | `435dd8282b4999e657932dfbf45d80bf2585e6727108628daf509883b41f7911` |
| `apps/web/src/features/campaigns/launch-model.unit.test.ts` | `3d123a4c3e6b7e98c0a3de6434e120a0b5edd601732a5014fbda9dc3ed6bcad9` |
| `apps/web/src/features/http/user-messages.ts` | `5962b8a5aa7af638c6a4fa9a89ecdc1fb0035685e8400190c33f2d3ee9af4824` |
| `apps/web/src/features/http/user-messages.unit.test.ts` | `da70aa666dce2ce4a5bc913a8fed704d204f2e0cd613c10d1e0159a02e75676c` |
| `apps/web/src/copy/campaign-image-messages.unit.test.ts` | `962c5e4578ef4c94e46728c035adbad8a2b83b2ffc5ba180eaecd3771738b559` |
