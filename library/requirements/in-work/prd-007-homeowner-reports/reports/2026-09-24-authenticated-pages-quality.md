# Authenticated workspace pages: quality review

Scope: `2026-09-24-authenticated-pages-scope.md`. Reviewed after the security self-review in `2026-09-24-authenticated-pages-security.md`. This records the implementing agent's verification, not an independent audit.

## Implementation result

All sixteen existing catch-all destinations now render an authenticated page instead of requiring demo mode. Marketing and settings hubs connect the existing campaign and homeowner-report workflows. Property-site/creative lists use saved records and explicit generation state; ads, routing, team and billing pages distinguish current account information from unavailable external capabilities.

The personal report identity, partner list and six channel-specific drafts persist in the existing user/location preference table. Revision conflicts preserve the submitted form and require reconciliation. The partner dialog can reload current revisions while retaining edits. Selecting a saved partner populates the campaign name and clears the material-permission checkbox. Report branding becomes the default for a new report, while saved snapshots remain unchanged.

## Traceability

| Requirement | Evidence |
| --- | --- |
| Authenticated routes and unknown routes | `tests/browser/review/workspace-pages.spec.ts` opens all 16 destinations through a signed-in session, checks the main heading and rejects the unknown-route document. An unauthenticated context reaches sign-in. |
| Branding persistence and consumption | The browser journey saves company, officer, email, NMLS and tagline, reloads them, exercises a two-tab conflict and, with reports enabled, verifies the saved company/tagline inside the new-report form. The unavailable valuation submit remains disabled. |
| Partner CRUD and permission | The journey adds, edits, reloads, searches/selects and removes a partner. Selecting a saved partner clears the previously checked material permission. A second-tab conflict is recovered inside the still-open dialog without losing its typed phone number. |
| Independent message drafts | Email and SMS drafts save separately. Unsaved switches require a choice, canceled switches retain text, and reload returns the saved channel. Failed storage and missing clipboard APIs never display a false success. New edits clear previous saved/copy feedback. |
| API boundaries | Nine `workspace-preferences.postgres.test.ts` scenarios exercise real persistence, concurrent writes, exact retries, user/location isolation, role/CSRF/origin/key refusal, record bounds, corrupted stored data and revoked sessions. No provider request is made. |
| Navigation | `navigation.unit.test.ts` verifies enabled preparation links retain their capability requirements and that the original fixture remains unchanged. The report-enabled browser journey checks the actual navigation links. |
| Responsive and accessibility behavior | Seven browser journeys pass together against a fresh optimized build, real local PostgreSQL and HTTPS. The nine-page matrix passes accessibility checks in both themes and document bounds at 1440, 1180, 768 and 390 pixels. |

## Corrections from review

The mobile breakpoint now immediately removes the desktop rail margin, preventing a transient sideways page during a viewport transition. Desktop rail toggles retain their animation. The branded preview explicitly keeps its dark surface inside the governed Card component, and small card links use the theme's accessible information-text color. No screenshot tolerance, accessibility rule or data-isolation assertion was weakened.

An incremental local build once rendered shared buttons without their expected style mapping. A fresh optimized build removed that inconsistency; the complete browser journey and both-theme matrix passed on that build. The CI run will independently build from its clean checkout. No duplicate button styling was introduced to conceal the symptom.

Actual light marketing and dark report-branding mobile screenshots were opened and inspected. They show readable labels, visible inputs/actions, correctly stacked cards and no clipped content. Screenshots and traces are retained under `test-results/browser`.

## Verification completed before publication

- 950 unit tests passed with the repository's coverage thresholds unchanged.
- 184 integration tests passed, including the existing guided setup journeys.
- All nine real PostgreSQL preference tests passed.
- The final metadata-only summary read passed together with the existing homeowner tests: 23 PostgreSQL scenarios in three files. General workspace pages no longer load report snapshots merely to show a property count.
- All seven authenticated workspace browser journeys passed together (1.2 minutes on the clean build).
- Optimized build, type checking, lint, formatting, boundary/type/secret/dependency audits and clone detection passed. Clone detection reported zero clones; the dependency audit reported no known vulnerabilities.

The new browser suite is discovered by the existing real-database review project. The report-enabled local run additionally checks the live navigation projection and new-report defaults. Existing synthetic and review fixtures remain separate. Full CI, hosted preview, merge and production results are recorded on the release PR as those actions complete.

The final repository refinement uses property metadata and a database report count for workspace hubs instead of loading every saved financial snapshot. All 23 relevant PostgreSQL scenarios passed afterward: nine workspace preference tests, nine homeowner repository tests and five homeowner route tests. The added case checks both the returned metadata and tenant isolation; the source change does not modify the rendered page contract or database schema.

## Deployment limits

The demo browser configuration now excludes `review/**`, matching the existing separation in the legacy synthetic runner. Its basename match for `workspace-pages.spec.ts` had also discovered the authenticated suite under that directory, which requires the separate PostgreSQL/TLS review server. The seven signed-in scenarios remain in the canonical real-database gate; no test assertion is skipped within its intended runtime.

The Linux release gate exposed a stylesheet-order dependency in the existing Connections notice: its title could inherit the Card's standard text color instead of the intended information tone. The shared notice title now declares its existing semantic text color directly. The 390px light/dark reference images were inspected and kept unchanged; no screenshot tolerance was changed. This also stabilizes the same title styling on the existing onboarding page.

No new migration, subscription price, live API credential, provider request or customer message is part of this change. The signed-in pages do not authorize live ads, billing, CRM imports or team invitations. RentCast activation still requires its licensed credential, an approved workspace UUID and an explicit lookup allowance. The current map update preserves the historical acceptance ledger and labels older deployment/authentication statements as historical.
