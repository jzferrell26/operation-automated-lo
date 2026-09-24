# Dashboard preview security self-review

Date: 2026-09-22. Reviewed implementation: `6d6805a`.

## Scope and method

Direct review in the implementation conversation, not independent verification. Scope is the explicitly enabled public product preview, its content-check endpoint, browser storage, and the routing changes. This does not qualify the full authenticated product or any live provider integration.

The review used the changed source, its existing callers, the 13 preview-boundary unit cases, the existing authentication regression cases, and the repository's boundary, product-type, and secret audits. No unresolved Critical or High defect was identified in this bounded preview change.

## Boundary evidence

| Area | Evidence and finding |
| --- | --- |
| Runtime scope | `apps/web/src/server/dashboard-preview.ts:8-15` requires the exact preview flag and the existing synthetic-mode classifier. Production/staging application environments, live providers, real data, and authorized review mode are refused by the boundary tests. The display-only preview owner is not a real authentication session. |
| Request handling | `apps/web/src/server/dashboard-preview-handler.ts:12-26` compares the browser Origin with the HTTP destination Host and refuses cross-site requests. `:34-50` gates the endpoint, checks JSON, and enforces a 100,000-byte input cap before compilation. Invalid fields are returned as field paths, without echoing values. |
| Side effects | `apps/web/src/server/dashboard-preview-handler.ts:59-85` uses the existing compiler's in-memory repository and returns `persistenceKind: browser` and `providerPublicationAuthorized: false`. This endpoint makes no database, model-provider, advertising, or messaging call. |
| Stored data | `apps/web/src/features/dashboard-preview/preview-provider.tsx:35-79` validates stored data before loading or saving and reports failures. `:85-98` removes only the preview's own storage key on reset. The schema caps campaigns and partners and rejects foreign campaign links and an approved record with blocking findings. |
| Existing authentication | The existing review authentication and tenant persistence mechanisms are preserved. Unit/integration regressions for authenticated principals, runtime composition, and review-surface isolation passed in the unchanged implementation tree. |
| Browser output and secrets | Preview fields render as React text. No HTML injection path, new public secret, production credential, database migration, or direct provider client was added. The repository secret audit and package-boundary audit passed. |

## Limits

This is an unauthenticated sample-data preview. Browser records are editable by the visitor and are not authorization, private account storage, shared storage, or production approval. The interface asks for fictional details. A direct automated caller can construct HTTP headers; the same-origin check is a browser request boundary, not authentication or a distributed abuse limit. No costly external operation is reachable through the preview endpoint. Full production abuse controls, database-backed accounts, and live integration security remain outside this release.

No dependency version changed. This review is not a new dependency-advisory certification. No provider or database gate is marked complete by this report.
