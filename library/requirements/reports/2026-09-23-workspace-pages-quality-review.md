# Workspace page completion: quality review

Date: September 23, 2026. Branch: `chatgpt/dashboard-testing-release`. Governing scope: `library/knowledge/private/ux-ui/04-screens/workspace-page-completion.md`. Security review: `2026-09-23-workspace-pages-security-self-review.md` in this directory.

## What changed

| Page | Result and evidence |
| --- | --- |
| Ads | Saved campaign queue, search, status filters, planned budgets and review links in `marketing-workspaces.tsx`. Live spend remains unavailable until connected. The browser test opens an approved saved campaign after filtering and clearing the queue. |
| Email & SMS | Three templates in two channels, editable copy with a live preview, draft persistence, unsaved-change protection when changing templates/channels and clipboard feedback. Browser tests cover reload, separate channel records, canceled discard, denied clipboard and failed storage. |
| Automations | Saved routing shown as a four-step flow, plus a sample-lead handoff preview. The browser test proves the simulation uses the saved owner and stage without changing the lead records. |
| Templates and Explore | A detailed Open House Boost package with usable workflow links; six available modules and separately labeled planned products. The package selector points to the relevant asset or review screen. |
| Creative and property sites | Search, feed/story filtering, full asset previews, downloads and explicit saved-campaign generation status in `asset-workspace.tsx`. Empty filters can be cleared. |
| Leads and pipeline | Derived stage metrics, source and stage filters, clear-filter recovery, saved-stage feedback and a suggested next step in the lead detail view. |
| Reports | Pipeline, Campaigns and Partners export their own records through `workspace-report.ts`. Campaign reporting excludes the unrelated example campaign. Tests inspect downloaded CSV content and hostile spreadsheet prefixes. |
| Shared controls | Dialogs and sheets retain focus when the close callback changes. The failing input-focus regression was reproduced before the fix and passes afterward. Mobile marketing links no longer shrink their labels into one another. |

The old generic `ComingSoon` component and duplicate asset implementation were removed. New controls use the existing UI package. No source guard, visual baseline, authentication requirement, campaign approval requirement or database policy was weakened.

## Verification

- All 1,139 unit, integration and component tests passed across 120 files using Node 24.18.0.
- The optimized application build passed using the same pinned runtime.
- The complete 20-scenario dashboard browser suite passed after the governed-control and mobile-tab corrections (2.2 minutes). After the final creative-thumbnail sizing correction, the six affected workspace scenarios passed again (34.3 seconds), including the full nine-page layout and accessibility matrix.
- Type checking, lint, formatting, package boundaries, product-type checks, secrets and dependency audits passed.
- The new page matrix checks nine routes in both themes, screenshots at desktop/mobile widths, and document bounds at 1440, 1180, 768 and 390 pixels. A separate assertion checks that marketing-tab labels fit their links.

Images and traces are retained locally under `test-results/dashboard-preview-local`. Manual image review caught three issues that were corrected: insufficient contrast in the selected message template's description, overlapping mobile marketing-tab text, and undersized creative thumbnails. Tests cover these regressions. Corrected images were inspected, including desktop creative and messaging, mobile templates, dark ads and automation, and mobile Explore.

## Runtime and release limits

The default terminal used Node 22.19.0. Its authentication tests failed because the pinned Node 24 API was unavailable. A verified portable Node 24.18.0 distribution was placed in the ignored `tmp` directory; the full unit/integration/component suite then passed. No global runtime setting or dependency version was changed. Temporary files are excluded from deployment uploads.

The local `pnpm test:db` attempt reported passing migration/pgTAP checks but exited unsuccessfully before completing real database integration and authenticated browser qualification. The local `psql` command is unavailable. This report does not claim the full database or authenticated review release gate passed. The previous PR also had an authenticated tablet-walkthrough focus failure; the shared focus regression is fixed and locally tested, but that complete authenticated journey must be confirmed by its gate.

Direct Vercel access returned 403 for the personal project scope, and the local CLI reported logged out. Publishing the branch can trigger the repository's existing preview integration; a successful local build is not evidence of a hosted deployment or an update to the stable demo URL.

This release improves the explicitly gated product demo. Message sending, live ad delivery, shared accounts, billing, invitations and new asset/site generation remain outside this increment. Drafts are saved on the current browser. Older strict storage readers require a compatibility change before rollback can preserve new draft records.
