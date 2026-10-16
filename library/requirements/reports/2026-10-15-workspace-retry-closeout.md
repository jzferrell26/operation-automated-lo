# Workspace retry closeout

## Implementation evidence

Governing plan:2026-10-15-workspace-retry-plan.md. The authenticated root error wrapper now calls the existing Next router refresh followed by its supplied reset inside startTransition. The shared RouteError component, copy, support reference, layout and authentication handlers are unchanged. A click initiates a new server read rather than relying solely on the failed payload's client reset. It is not a fix for the cause of the intermittent database acquisition timeout.

The regression was RED with actual order [reset] instead of [refresh,reset]; its safe-digest case already passed. After implementation both pass. The first Windows pnpm shim invocation could not parse the parenthesized path and was not RED evidence; the retained direct Vitest invocation produced the actual assertion failure. The4-case wrapper/shared-boundary selection passes. A later48-case selection also covers all33 domain cases and11 shared Select interactions.

The full duplication scan exposed an existing75-token duplication between the domain and shared Select test setup. The domain test now uses the existing installSelectLayoutForTest helper already used by the property, financing and webinar tests. Its cleanup and all assertions remain; all33 cases pass with that shared visible anchor. The broad scan is now zero clones, with no configuration or threshold change. This corrects the earlier domain receipt's insufficient zero-clone verification; that receipt remains historical.

Web/tooling typechecks, web production build, lint, secret audit and package-boundary checks pass. No browser baseline changed. Current-head canonical CI and actual hosted recovery after a future release remain required. The prior local whole-app fixture-startup policy rejection was respected.

## Security self-review

Performed inline by the author before Quality, not independently. Reviewed error.tsx, its regression, domain setup deduplication and the unchanged shared Select helper. Authorization/session/tenant boundaries, injection, PII/financial data, logging, crypto/storage, network and dependencies were checked for this delta. The retry invokes the current router's read refresh only after an explicit button click. It accepts no URL, secret, serialized principal or provider payload, makes no mutation, adds no automatic retry and does not change the mandatory session read. Raw exception messages remain hidden; the existing digest is retained. No new dependency, privilege, external destination or unsafe sink exists. Test setup affects jsdom geometry only. No unresolved scoped Security finding.

SHA256 pins: authenticated error7258397f54a4eac68e44f698641049e2349151b16ee267fbf15283fb27e543cb; regressiondad9d196ac3ea2450ee77103fef6c4070406e7e23feb5d98dea1087b2caa7db4; domain interactionabdd85829dbf4d9e6923062387f16fd3501fc27f454d50575bcb248ee9771431.

## Quality self-review

Performed after Security on identical executable bytes by the same author. The plan's fresh-render-before-reset and no-automatic-retry criteria pass at the actual wrapper seam. Existing safe error text/digest/surface tests pass. The corrected domain setup retains its full behavioral coverage.48 interactions, types, web build, lint, secrets, boundaries and zero clones pass. This is source acceptance of the bounded retry; production recovery and exact-head canonical CI remain OPEN. The live shell temporarily claimed signed-out during the acquisition failure; this separate presentation defect and the acquisition root cause remain open, with no security or live-recovery pass inferred from the later full reload.

### Browser evidence follow-up, Security then Quality

Run38845861631 on d6bd4f3 passed284 standard browser cases and16 dashboard-preview cases. The Application job then failed only at the same Select test clone removed above. The new390px selector cases passed in both themes. Actual downloaded1440-light,768-dark,1180-light/dark and390-light/dark chooser pictures were inspected across the two runs:5 legible options, visible selection, no horizontal clipping. The mobile full-page picture displaced the sticky header because capture preserved the live scroll position. The chooser-only picture now uses the actual viewport; ordinary states remain full-page. No baseline is adopted. Updated screenshot-spec pin:f9774e66f195e18912c106873bed9f901d00c487eca292ec093352128407a428.

Security reviewed this capture-only follow-up before Quality: it changes no requests, authentication, API fixture, guard, assertion, secret or production behavior; no scoped finding. Quality then verified all original axe/overflow/choice/confirmation/readback assertions remain and the only capture policy change is fullPage false while the chooser is open. Fresh exact-head browser execution and inspection of those final viewport images remain pending. Earlier browser passes are supporting evidence only.

## PR review

Keep this scoped increment in draft PR100 and require current-main reconciliation, fresh required checks and MERGEABLE before a shippable claim. Reviewer focus: the wrapper refresh/reset order, preserved explicit action and safe support rendering, and use of the already shared selector test seam. The production request observation is narrower than the product's unfinished publication and lead-delivery flows. No deployment or provider action occurred in this increment.

## Dependency observation

GitHub alert43 is the existing accepted GHSA-vfj7-8cjw-p6xm / CVE-2026-93687, braces3.0.3 through the Trigger CLI devDependency in apps/tasks. Registry latest remains3.0.3. The existing owner-approved exception in pnpm-workspace.yaml, protected by accepted-advisories.test.ts, expires for review on November3. No ignore entry, package or lockfile was changed. Fresh pnpm audit --prod reports zero vulnerabilities across153 dependencies; the full audit still counts the accepted high finding with an empty actionable advisory map. The GitHub alert remains open. This is continuation of its existing recorded decision, not a new waiver or a clean-all-dependencies claim.
