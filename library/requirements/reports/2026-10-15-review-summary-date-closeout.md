# Review-summary screenshot stability

## Failure and repair plan

Run38845861631 on d6bd4f3 passed323 actual PostgreSQL route cases and the pgTAP scripts, then failed one sample-catalog browser case: the launch-review needs-changes screenshot at1440/light was1921px high rather than the1942px baseline.145 other sample cases passed and the real-catalog4-case pass passed. The prior password sign-in429 did not recur. The Application job passed284 browser cases plus16 preview cases before the already-corrected Select setup clone failed the duplication gate. This was not a successful aggregate run.

The actual and existing baseline images were inspected. The schedule end date changed from the original October16 shape to October30, letting the date fit beside "From launch until" and shifting the rest of the right column by one line. Existing capture stabilization covered campaign headers, lists and approval/version timestamps, but omitted the step3 summary dates. Preserve every baseline PNG and the0.001 tolerance. Extend only capture-time stabilization to the summary's date nodes; validate plain date markup and restore real text and datetime after capture. Add pixel equality, unrelated-content, failure-restoration and malformed-markup checks, then run Security and Quality before a new canonical head.

## Test evidence

Two isolated browser regressions failed against the prior helper: normalized image bytes still differed, and unexpected nested date markup was accepted. Both failures were actual assertions, not timeouts. After repair all10 screenshot-date-stability cases pass in49.0s with exit0. The new case covers all5 existing launch-review decision states, real datetime preservation, unrelated date preservation, capture-failure restoration and a negative control where changing surrounding words still changes the picture. The second case refuses nested date markup before the capture callback runs. Existing8 header/list/timestamp checks remain.

This local run used a temporary config containing only the static page.setContent tests, with no webServer, application startup, database, authentication, fixture-enabled deployment or provider. It did not retry the historically rejected enabled whole-app fixture startup. It is a real headless-browser helper regression, not customer journey or canonical Linux-baseline proof. The canonical job must compare the untouched original PNGs on the new head.

Tooling typecheck, lint and secret audit pass. No production source, date formatter, stored fixture date, clock, screenshot threshold, mask area, baseline file, dependency or migration changed. The scope is the existing screenshot helper and its regression file.

## Security self-review

Performed inline by the author before Quality. Reviewed helper SHA25614cb71b548ea643dc501d958794fa6b6cfa7cfda26164b5bea921b4bc2f83dda and test12ccf64fee46f3800c84f03c2792e511213b7058efb89b0699641f970c45543b. Authentication/tenant access, injection, PII/financial data, crypto/storage, network, logging and dependencies were checked for this delta. The new selector is confined to existing step3 summary time elements; it validates a single readable weekday label and a date-only datetime attribute. Only the text node changes inside the already established try/finally capture scope. No arbitrary HTML, credentials, request, provider operation or runtime authorization is introduced. Invalid markup is refused before any normalization. No unresolved scoped Security finding.

## Quality self-review

Performed by the same author after Security on the same executable bytes. The plan's pixel-stability, surrounding-copy negative control, original-value restoration, five decision states and malformed-node refusal all pass. Existing8 date-helper cases also pass. All136 canonical baseline PNGs remain unchanged. The prior complete-job failure is retained; no screenshot acceptance or whole-product completion is inferred from the isolated helper pass. Exact-head canonical CI and final popup viewport image inspection remain required.

## PR review

Keep PR100 in draft. Fetch/reconcile main before push, preserve the previously reviewed workspace retry and domain correction, and start a new exact-head run. This is a bounded test-harness correction inside the existing integration checkpoint, with no scope expansion to application dates or new customer functionality. The public launch/report workflows and live provider qualification remain open.
