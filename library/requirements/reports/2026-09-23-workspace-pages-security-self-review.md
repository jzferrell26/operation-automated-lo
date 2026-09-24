# Workspace pages: security self-review

Date: September 23, 2026. Branch: `chatgpt/dashboard-testing-release`. Scope: the page-completion changes following `48b0336`. This is the implementing agent's review, not an independent audit.

## Scope and result

The changed pages remain behind the existing explicit dashboard-preview gate. This increment adds no server action, API route, database migration, authentication bypass, external request, delivery action, payment operation, or dependency. No new high or critical finding remains in the reviewed diff.

| Area | Evidence and outcome |
| --- | --- |
| Browser input | `apps/web/src/features/dashboard-preview/model.ts:58-77` defines six unique message slots, a 160-character subject limit and a trimmed 1–5,000-character body. The existing strict storage provider validates reads and writes. Older records default to an empty draft collection. Invalid, duplicate and oversized drafts are rejected by tests. |
| Output encoding | Message text is rendered as React text and form values in `marketing-workspaces.tsx`; no HTML parsing or injection sink is introduced. Asset paths and navigation destinations are fixed in source or use the existing validated campaign contract. |
| Spreadsheet export | `workspace-report.ts:5-10` quotes every cell, doubles embedded quotes and prefixes formula-like values with an apostrophe, including values with leading whitespace. Unit and browser tests cover hostile prefixes and selected-view exports. |
| Storage failure | `marketing-workspaces.tsx:295-310` shows a saved confirmation only when the existing save function returns success. Browser tests deny storage writes and confirm there is no saved confirmation. |
| Clipboard | `marketing-workspaces.tsx:311` catches denied clipboard writes and offers manual selection. No success message is shown on failure. |
| Live effects | `marketing-workspaces.tsx:492` implements a local routing simulation only. The existing campaign schema still requires `providerPublicationAuthorized: false`. Saving or copying a message does not send it; previews do not create contacts or spend money. |
| Focus ownership | `packages/ui/src/components/overlay.tsx:89-150` keeps the latest close callback without restarting the open/focus effect. Regression tests demonstrated focus loss before the fix and preserved focus afterward. Existing nested-control key handling and modal behavior are retained. |
| Secrets and dependencies | Repository secret, package-boundary, product-type and dependency audits passed. The production dependency audit reported zero vulnerabilities; no dependency versions changed. The rules-file Unicode scan was clean. |

## Reviewed limitations

Message drafts use the existing local demo storage, are not synchronized between devices, and should contain fictional demo content. There is no claim of a production borrower-data store. Reset clears the drafts with the rest of the demo workspace.

The additive storage field is compatible with older saved data on this reader. Rolling back to an older strict reader requires a compatible reader or migration; reverting the app alone does not guarantee that new saved records remain readable.

The scan script's generic root-level header check is not a validation of the Next.js app's response headers. This review does not claim a full production security assessment. Current Vercel access and the broader authenticated/database release gate are tracked separately in the quality report.

## Verification

`pnpm audit:boundaries`, `pnpm audit:product-types`, `pnpm audit:secrets`, and `pnpm audit:dependencies` passed. The security scan output is retained locally in `reports/scan-output`. After the security corrections, all 1,139 unit, integration and component tests passed on the pinned Node 24.18.0 runtime.
