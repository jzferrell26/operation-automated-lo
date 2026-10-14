# Review top-bar session preparation

Root executes inline as browser-automation-guardian, owning only the top-bar visual preparation call, the shared helper's scope comment and this handoff. Current branch3d04fee inherits the independently reviewed actual-session fixture and eight approved Settings replacements. No production, cookie, current-proof, cache, authentication or rate-limit logic changes.

| File | SHA-256 |
| --- | --- |
| tests/browser/review/top-bar.spec.ts | d79a556a0ef4de1e5fc0853c121501d4a7bc31277ad0312214b09a09442f8fdc |
| tests/browser/review/helpers/signin-session.ts | f672526e8f8ea700482038b34217178d0b6c5d558d12e0c5bf4419b845f79319 |

Canonical38556674879 at3d04fee passes the complete Application and Release gates, all323 actual PostgreSQL cases,162 authenticated review-browser cases and all four real-catalog cases. The remaining top-bar four-frame Light/Dark visual case fails at an actual sign-in429 before visual assertions, including its original retry. The completed raw log remains `tmp/domain-session-ci-38556674879.log`; the whole run remains failed. Settings replacements and webinar session reuse now pass in actual CI.

The top-bar visual/navigation helper now uses the same actual-session preparation reader as the webinar preparation. Before accepting an existing cookie, the unchanged reader verifies the current server identity, token, role and workspace; invalid or revoked candidates fall back once to the original actual password sign-in. It does not sign a cookie or reset counters. Top-bar layout, accessibility, copy, restricted-link, viewport, theme and external-request assertions remain unchanged. Authentication acceptance journeys still invoke the original actual sign-in directly. The helper comment now accurately includes this second preparation consumer.

Existing22 cache/budget/identity/filesystem cases pass, tooling TypeScript, focused lint, secrets and diff pass. An initial discovery command named a nonexistent guessed config and failed; the corrected repository config discovers all eight top-bar cases without running them. Local actual database/browser execution remains unavailable, and discovery is not execution. Fresh Security then Quality and current-head complete canonical CI are required. No production limit, timeout, image, threshold, authentication journey or provider operation is changed.
