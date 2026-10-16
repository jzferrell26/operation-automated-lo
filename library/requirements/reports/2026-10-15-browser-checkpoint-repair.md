# Browser checkpoint repair

## Plan and observed failures

Continue on the main-based completion branch after its rebase onto1bb9644. Run38759415780 on ebb9f99 failed Application verification in the two390px domain cases: the capture helper scrolled the open selector off-screen and Select correctly dismissed it. All six larger-frame cases passed. The database job's sample-catalog browser pass failed the final password test's initial sign-in with429 after162 other cases passed; its real-catalog pass passed all4 cases. Container pull throttling was also logged before recovery. These failures do not establish a migration defect.

Keep the open chooser in view during its capture, assert that it remains expanded with all5 options afterward, and retain axe/overflow checks. Reuse the existing strictly scoped, freshly server-verified session for the4 homeowner presentation setups. Keep both password-test sign-ins and their POST200 assertions unchanged. Run targeted session/evidence tests and tooling types, lint and secret audit; then Security, Quality and PR review before committing and requesting a new canonical run. No timeout, retry budget, baseline, product limiter or production setting changes.

## Implementation and local evidence

The domain frame helper now distinguishes an open chooser from ordinary top-of-page states and checks its viewport position. The readiness spec calls signInForReviewPreparation with the existing password helper as its one fallback. It does not manufacture credentials or sessions. The helper verifies the original seeded identity, CSRF, exact owned loopback origin, fresh private cache and actual server response. Authentication journeys continue to use fresh sign-ins.

Both existing regression files pass:36 cases across browser-signin-session.test.ts and database/review-browser-evidence.test.ts. Tooling typecheck, lint and secret audit pass. The canonical failure is the browser RED evidence; browser GREEN and actual updated frame inspection remain pending until the new head runs in CI. The historical local whole-app fixture-startup policy rejection was respected; it was not retried or repackaged.

## Security self-review

Performed inline by the implementation author before Quality. This is not independent review. Reviewed both changed browser specs and the existing session helper. Access/auth/session/tenant boundaries, injection, logging, PII/financial data, network, crypto/storage and dependency categories were checked for this delta. No production source, authentication handler, database role, rate-limit value, fixture credential, cache implementation or external destination changes. The existing cache only accepts the sample review run at its exact HTTPS loopback origin, validates file ownership/mode and candidate age, and requires fresh server identity and CSRF proof; invalid candidates get one real sign-in fallback. Its negative cases pass. Browser origin guards remain asserted. No unresolved scoped Security finding.

Reviewed domain spec SHA256:0082226ba0ed2007f36842f806778cb1b45d977578cdb41cb9790ff638b11982. Reviewed readiness spec SHA256:db6cdbbd3f654a256c936b7ec9845ecdf9a71aceb1e4cd3af937d54b95de62d4.

## Quality self-review

Performed by the same author after Security on the same bytes. Scope is the above plan, not whole-product acceptance. The popup capture preserves real layout and still requires all5 options, actual choice, confirmation/cancel/readback, axe, overflow and frame outputs. Readiness presentation still covers all4 frames and all existing report assertions while using the existing setup helper. The password mutation/restore/proof journey remains untouched.36 targeted cases, types, lint and secret audit pass. New canonical browser execution and actual visual review remain required; no GREEN browser or new approved baseline is claimed.

## PR review

Keep PR100 in draft. This is a small corrective increment in the existing integration PR; it does not independently validate its large preserved implementation. Reviewer focus is capture-induced scrolling and the narrowly scoped presentation setup call. Fetch current main and confirm no conflict before push. Require a new exact-head gate and preserve original failure artifacts. Hosted domain publication, provider qualification, unfinished publisher/property workflows and whole-product completion remain open.
