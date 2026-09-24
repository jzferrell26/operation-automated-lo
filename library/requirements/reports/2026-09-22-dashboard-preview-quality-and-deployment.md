# Dashboard preview quality and deployment record

Date: 2026-09-22. Implementation commit: `6d6805a`.

## Outcome

The requested dashboard is deployed and the public product-testing flows passed. This is direct implementation-session qualification, not independent review. The security self-review was completed before this quality closeout. The full backend and live integrations are not represented as complete.

## Deployment

- Vercel project: `operation-automated-lo-web`, team `jonathan-ferrell`.
- Deployment: `dpl_4kKhypRqqmn3tZGNEaVvaCjC3gLe`.
- Stable URL: `https://operation-automated-lo-web.vercel.app`.
- Immutable URL: `https://operation-automated-lo-fe6bn26d9-jonathan-ferrell.vercel.app`.
- Recorded Vercel status: Ready. Deployment output confirmed the stable alias assignment.
- Build used the committed workspace dependency build command. Hosted Node was 24.19.0; the repository/local verification pin is 24.18.0. Vercel reported the patch-version difference as a warning and completed the build.

## Validation evidence

| Check | Result |
| --- | --- |
| Local unit and integration suite | 112 files, 1,088 tests passed. |
| Web production build | Passed, including the workspace dependency build. |
| Workspace and tooling type checks | Passed. |
| Lint and formatting | Passed, with no lint warnings. |
| Boundary, product-type, and secret audits | Passed. |
| Duplication scan and git whitespace check | Passed. |
| Local dashboard browser suite | Five scenarios passed in 37.3 seconds. |
| Public deployment browser suite | Five scenarios passed in 48.5 seconds against the stable URL. |

The public browser command was `pnpm test:browser:dashboard` with `OALO_PREVIEW_BASE_URL=https://operation-automated-lo-web.vercel.app`. It did not start a local server. Every scenario used sample data.

## Request traceability

| Requested or implemented behavior | Verified result |
| --- | --- |
| See the product at a live URL | The homepage opens the overview; 23 dashboard destinations returned HTTP 200 and displayed their intended heading. Included property page, campaign sample, and creative assets returned HTTP 200. Unknown paths displayed the not-found screen with noindex. |
| Test campaign creation | Filled a sample property, changed the headline, ran real in-memory checks, opened the created campaign, and found it again in the campaign list. |
| Test approval | A passing draft accepted a clearly labeled local test approval; the approval survived reload. A disallowed claim produced blocking findings and a disabled approval control. Publishing remained disabled. |
| Test workspace edits | Added a fictional partner, changed a lead stage, updated the profile and routing preferences, reloaded each screen, and verified the saved values. The report reflected the changed sample stage counts. |
| Keep browsers separate | A fresh browser context could not see the test campaign created in another context. |
| Handle persistence failure | An injected browser storage failure produced a visible not-saved message and no saved campaign link. |
| Reset the preview | Cancel preserved the data; confirmed reset restored the original sample records. |
| Responsive experience | Overview, pipeline, builder, and reports were exercised at 1440, 1180, 768, and 390 pixels with no document-level horizontal overflow. Tables and the board use intentional internal scrolling. Mobile navigation opened and closed with Escape. |
| Themes and accessibility | The overview passed the configured WCAG A/AA axe checks in light and dark themes. Live screenshots were inspected. |

## Remaining integration scope

Shared authenticated accounts, HighLevel/Meta connections, live advertising, messaging, billing, team invitations, and generation/publication of new property sites and print assets are not enabled in this preview. Their screens identify what is unavailable. Browser test records are not production approval or evidence that a provider gate passed.

The full `pnpm verify` real-database/production qualification was not executed for this visual-testing change. No database or provider implementation was modified. Existing authenticated review layouts and screenshot baselines remain unchanged when the preview flag is off.

## Evidence location and recovery

Browser screenshots and test status are under `test-results/dashboard-preview-live`, with the earlier local run under `test-results/dashboard-preview-local`. These are ignored local evidence, not committed production assets. The runbook `docs/operations/dashboard-preview-release.md` records the five preview settings, reproduction command, and rollback procedure.
