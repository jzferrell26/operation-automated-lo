# Domain shared-state repair handoff

Date: October 14, 2026. Author: `/root/domain_async_state_repair`, ux-ui-guardian. This is author verification of the bounded DUV-01 repair, pending independent visual closure, Security and fresh Quality.

## Governing contract and delivered change

The shared state specification says: "screens may compose it with `Metric` or `SafeAction` but do not implement state views ad hoc." See [AsyncState component contract](../../knowledge/private/ux-ui/03-components/async-empty-error-permission-state.md), Design Brief sections 15, 16 and 18, and rubric axis 9. The [domain screen specification](../../knowledge/private/ux-ui/04-screens/domain-setup.md) now names the exact wrapper mapping and session wording.

`apps/web/src/features/domains/domain-screen.tsx:240-278` replaces the generic loading span, error paragraph and two capability Cards with `AsyncState` imported from `@oalo/ui`. Kinds are `loading`, `error`, `permission_restricted` and `degraded`, each with `surface="card"` directly on the page. The shared wrapper supplies the named surface, glyph, status/alert semantics and busy announcement. No wrapper is nested inside another Card. No CSS, token, library, motion or overlay behavior changed.

The permission fields describe the current loan officer session and account support. They introduce no customer roles, role choice or invented administrator. Existing plain DNS settings/hosting records/serves-funnels copy from the parent's pending correction remains intact. Loading, current-state refresh and pending-write conditions retain their actual predicates. The sanitized failure remains the description, with SupportReference unchanged. Saved records and deliberate disconnect remain available when editable and platform setup is unavailable. Field errors and concise successful notices retain their existing seams.

## Executed verification

- Four meaningful composition regressions in `domain-screen.integration.test.tsx:26-81` first reproduced **4 failed, 22 passed** against the pre-repair source. They check accessible region names, shared kinds/card surfaces, loading busy semantics, sanitized error with GET-only recovery, current-session restriction without a role selector, and retained saved-host/safe-disconnect availability. After repair, the domain and existing Settings interaction suites passed **39 tests in two files**. All original pending-operation, typed-input, clipboard, current-proof, cooldown, confirmation and focus-return assertions remain.
- Root language guards, page title, domain client and full refusal-copy inventory passed **83 tests in five unit files**. Shared-state primitive tests passed **5 tests**; governed-controls and hand-built-layers guards passed **9 tests in two files**. No vocabulary exception or global guard was changed.
- Web TypeScript, tooling TypeScript, scoped lint, owned-source Prettier and diff whitespace checks passed. The browser gate completed its actual production build and temporary Next server startup before exercising the rendered screen.
- Final production-server browser run: **8 passed in 1.3 minutes**, with 1440, 1180, 768 and 390 widths in Light and Dark. `tests/browser/domain-setup.spec.ts:23-43,125-170` adds a blocked GET and its failed response, verifies all four shared state kinds/card surfaces, checks loading/error write exclusions, and confirms safe reload recovers. Every page-state capture passes scoped WCAG AA axe and document-overflow checks. Confirmation Escape/focus-return checks remain. There were no page errors or external requests.
- The initial browser command supplied a variadic project option incorrectly and exited before building or executing tests. Correcting the invocation to `pnpm exec playwright test tests/browser/domain-setup.spec.ts --config=playwright.config.ts --project=chromium` produced the passing run. No source or gate change was needed.

The browser axe scope remains the domain page region. The separately mounted confirmation dialog retains existing focus tests and unchanged shared wrapper tests; this packet does not claim a new exhaustive dialog axe sweep or real DNS/provider evidence.

## Original capture evidence

Final whole originals are `test-results/product-review-frames/domain-setup/`: **88 PNGs**, eleven states for each frame/theme: empty, ownership, DNS, certificate, ready, stale, platform unavailable, disconnect dialog, session read-only, blocked loading and failed read. Image SHA-256 and sizes are recorded in `source-images.json`, SHA-256 `c5534f0060c027471105120f4adaaa66acd42169fdf5fb5fea60a72aa5ca7dc5`.

Before overwrite, all **72 pre-repair originals and their manifest** were copied intact to `test-results/product-review-frames/domain-setup-before-async-state/`. Verification against that retained manifest returned **72 matches, zero mismatches**. Its manifest SHA-256 is `40080d283c092b234bfbdfed8768e3d9f6df4d570b5575a3d47f8ed195b69448`. The independent pre-repair review remains untouched at SHA-256 `8fdee56b81cc990e53698aa8401824fe097af2ea79ab6bd2a5016290d2650595`.

Author inspection covered literal desktop Light loading, mobile Dark error, mobile Light session restriction and desktop Dark unavailable originals. This is not independent scored approval. A separate reviewer must inspect the new whole originals before DUV-01 scored closure. No canonical baseline image was written. The eight Linux Settings baseline approvals remain the parent's separate responsibility.

## Frozen owned source pins

| Path | SHA-256 |
| --- | --- |
| apps/web/src/features/domains/domain-screen.tsx | a2498ac1355b8d3aa776be63037615aa28118b62d8e5c8ae473faeab0ec14b73 |
| apps/web/src/features/domains/domain-screen.integration.test.tsx | 090a5003a89f9719954f43d7accf74bec76d262e043438b10f2c20eb7690d210 |
| tests/browser/domain-setup.spec.ts | 04fc61b7a3bcefca205381d6128daf800976cee2f70d633db8dd40f8b55bbbab |
| library/knowledge/private/ux-ui/04-screens/domain-setup.md | ce9b8bf34e36580840cbb44e59dc39d14c1caebdb604ac4e2775119595ab5685 |

Only these four owned files and this new handoff were edited. The parent's dirty page-title unit correction, earlier copy/frame handoff, other frozen reports, server, SQL and source authority were not edited. No Git commit/push, dependency update, provider action or deployment occurred. The browser's temporary server stopped after its run; port 3100 has no listener. Current-head CI and independent Security then Quality remain required; this packet does not claim the branch shippable or the whole domain feature complete.
