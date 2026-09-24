# Authenticated workspace pages: security review

Scope: the changes on `fix/authenticated-workspace-pages` after merged AVM release `da8dfb9`. This is the implementing agent's security self-review, not an independent audit. It precedes the final quality review.

## Result

No unresolved critical or high issue was identified in the reviewed changes. The new settings API reuses the authenticated, tenant-scoped preference store and does not add a credential, provider request, payment action, database migration or public write path.

| Boundary | Evidence |
| --- | --- |
| Authentication and authorization | `apps/web/src/server/workspace-preferences.ts:174-210` resolves the established session before reads and the CSRF mutation gate before writes. `:75-83` and `:125-136` deny support access and restrict edits to owner/creator roles. Read-only users are not trusted to self-declare their role. |
| Tenant and person isolation | `workspace-preferences.ts:36-59,103-111,145-170` binds location and actor from the verified identity and uses parameterized SQL inside the existing RLS transaction. Tests exercise another person in the same workspace and an unrelated workspace. Neither receives the owner's personal settings. |
| Key and input boundaries | `features/workspace/model.ts:24-82` closes the preference-key and field sets, bounds partner/message values and rejects unknown command fields. `workspace-preferences.ts:137-144,200-207` bounds the UTF-8 record and request body before persistence. Keys cannot target onboarding, billing or prototype properties. |
| Concurrency and retries | `workspace-preferences.ts:145-170` locks the exact person/location/key, checks the prior revision and returns the committed revision in the same transaction. An identical retry returns the existing value. Conflicting updates return 409 and preserve the newer stored record. |
| Damaged stored data | `workspace-preferences.ts:85-123` validates stored records and refuses unreadable data. A malformed row does not silently become a default or get overwritten by the next edit. The real-database test verifies the original malformed fixture remains intact until test cleanup. |
| Browser/network boundary | `features/workspace/use-workspace-preferences.ts` uses the existing same-origin, no-store, redirect-refusing API helper and validates the response. Personal settings are not copied into local/session storage, query strings, analytics or console logs. JSX and governed text controls render user values as text. |
| Routing and navigation | The catch-all route allowlists implemented destinations. Unknown paths return the not-found document with noindex. `features/workspace/navigation.ts` enables only implemented preparation links; the existing role-capability projection still runs afterward. It changes navigation availability, not authority to mutate data. |
| Partner permission | Campaign partner selection copies a saved display name and clears the material-permission checkbox. Choosing a partner never grants marketing permission or sends an invitation. |
| Report identity and external effects | Saved identity becomes the default for new reports only. Existing report snapshots remain unchanged. Page reads and preference saves make no valuation, CRM, workflow or billing request. |

## Verification and corrections

The nine real PostgreSQL preference scenarios passed, including session/CSRF/origin refusal, role and key injection, tenant/person isolation, concurrent edits, exact retry, malformed records, length limits and revocation. Targeted language and model checks passed. The security scan completed; its production dependency report has zero known vulnerabilities, and the rule-file Unicode scan is clean. Repository boundary, product-type, secret and dependency checks passed. No dependency versions changed.

Review also closed user-data reliability issues: a conflicting partner edit now has an in-dialog recovery path that retains typed fields; missing clipboard access is handled without an uncaught error; editing clears stale saved/copy confirmations; forms use actual normalized saved values. The browser tests exercise these paths before release.

## Limits

Partner entries are a personal list within this user/workspace, not shared brokerage membership or CRM records. Team invitations, payment operations and live-provider activation are not introduced by this correction. Live RentCast, HighLevel and Meta evidence is not inferred from successful preference persistence. Hosted verification uses synthetic identities; their account/session cleanup is part of deployment closeout.
