# Guided domain setup UI handoff

Date: October 14, 2026. Author: `/root/domain_setup_ui`, ux-ui-guardian. Worktree: `codex/domain-completion`, source base `bae4fa65f59df7aa0db854f869b5633bc2ff4141`. This is author verification, pending independent Security followed by fresh Quality.

## Delivered consumer

Settings exposes Domains (`workspace-screen.tsx:50-58`), with a named page title and local loading/error routes. `domain-screen.tsx:96-222` reads and strictly validates current-owner API state, normalizes hostnames, confirms connections and disconnects, uses existing CSRF helpers, blocks duplicate requests and requires a current-state reload after refused or unconfirmed writes. Typed hostname and apex choice survive these retries. Reconnection preserves the saved default kind; new claims use the existing Live webinar compatibility default. There is no unused root selector, customer role manager or QR manager.

`domain-screen.tsx:310-428` displays the exact saved ownership and provider records, distinct control/hosting/DNS/HTTPS states, freshness, cooldown, expired proof, read-only and provider-unavailable explanations. Editable saved records can be disconnected without an available provider. Clipboard errors offer manual copying and never render raw exception details. A reload failure does not leave a success badge claiming current verification. This packet links to the existing Campaigns funnel workspace, not an invented custom-host or root publication link.

The new [screen specification](../../knowledge/private/ux-ui/04-screens/domain-setup.md) cites Design Brief sections 9-11, 14-16 and 18: "The interface must never promise provider behavior that has not been verified." Existing `@oalo/ui` wrappers, Inter, semantic tokens, shallow cards and both themes remain governing. The checkbox uses FormField wiring and the existing focus/target tokens. No tokens, global styles, dependencies, financial calculations, server models or databases were changed.

## Executed verification

- Original full route-code inventory reproduced RED: 1 failed and 38 passed, naming four absent static domain codes. The additive catalog supplies six actual static/dynamic domain refusals and keeps all legacy financing/webinar entries. Final client plus complete catalog tests: **55 passed, two unit files**.
- Final screen and existing Workspace interactions: **35 passed, two integration files** (22 domain cases and 13 Workspace cases). Coverage includes all seven saved statuses, hostname validation, confirmation/Escape focus return, deliberate disconnect without provider access, inherited kind on reconnect, exact clipboard values and rejection, read-only/cooldown/stale states, initial schema refusal, CSRF forwarding, pending check/disconnect exclusion, lost response and current revision after reload.
- Web and tooling TypeScript, scoped lint and formatting, product-types, secret audit, positive/negative boundary audit and diff checks: **PASS**. Full duplication scan: **zero clones**. Production build: **all 16 tasks passed**, including the new `/settings/domains` route.
- Production Next server using the existing synthetic runtime on loopback: **four Playwright cases passed**, 1440 and 390 in Light and Dark, final run39.8seconds. Every state frame passed scoped axe WCAG AA checks and document overflow checks. No page errors or external requests. The API responses are synthetic test fixtures, not provider outcomes or persisted live records.

The first interaction run passed19 cases, then test-only tuple inference caused web type errors; adding explicit mocked RequestInit arguments corrected these. No production type check was waived. The first browser run passed all four cases but full-page screenshots retained the current scroll location of the sticky shell. Original captures remain untouched; the final capture explicitly scrolls to the page heading, and confirmation frames capture the actual viewport.

## Original visual evidence and remaining proof

Final originals: `test-results/domain-ui-originals/v2/`, **36 PNGs**, nine frames per width/theme: empty, ownership, DNS, certificate, ready, stale, provider unavailable, disconnect confirmation and read-only. The original first-pass 36 PNGs remain in the parent directory. Final image hash/size manifest `v2/source-images.json` SHA-256: `15743a6a5a400e0a8abcf76490cb081a7fb9a41fc814a28fbe509a25f0e014f6`. Author inspected desktop Light and mobile Dark DNS plus mobile confirmation originals. Independent visual approval remains pending.

No canonical baseline PNG was written or changed. The added Settings entry intentionally changes that screen's composition, so its existing desktop/mobile Light/Dark canonical frames require fresh capture and independent inspection. The nine new domain frames are candidates for that same controlled process, not pre-approved baseline replacements.

All eighteen server source SHA-256 pins in `2026-10-14-domain-server-handoff.md` remain unchanged at release. Existing Security `8d9ce400...` and Quality `af00fbc5...` qualify that previous server subset only. Parent reported actual database CI requiring test fixture/inventory corrections; this author neither changed that packet nor declares it green. Full current-head CI, real authenticated API/database writes, autonomous rechecks, default root routing and an owned-host DNS/TLS/visitor journey remain outside this UI proof. No provider call, DNS edit, deployment, domain purchase, source commit or push occurred. The browser-owned temporary server stopped after its run; port3100 has no listener.

## Frozen UI source pins

| Path                                                                  | SHA-256                                                          |
| --------------------------------------------------------------------- | ---------------------------------------------------------------- |
| apps/web/src/copy/page-titles.ts                                      | 7df1b86e2d593cf1030d22058371194787b9d6e2d56a553b1ddfc4ae22fb4d4e |
| apps/web/src/features/http/user-messages.ts                           | fcfcfd794cebb4ea52a038b8049bd40fe928d354a320e06355e5fa1c934121dd |
| apps/web/src/features/http/user-messages.unit.test.ts                 | 8020b95a5e221f5ff3e3c3fa61c00870cbc789689921c0b10bf4d2f41caa002d |
| apps/web/src/features/workspace/workspace-screen.tsx                  | 6121760e1490050168e1625c4590c40e5996427572b41ed852e68d4ca4f808fb |
| apps/web/src/features/workspace/workspace-screen.integration.test.tsx | aff71ed6b98a8dd31c2695c43bc3698314f057e10c52489ab62f0b74f59043e6 |
| apps/web/src/app/(authenticated)/settings/domains/page.tsx            | 817235e27fd2821750b645ff171754c618a5826a6cacc82634fe13c98eb1b75c |
| apps/web/src/app/(authenticated)/settings/domains/loading.tsx         | fc269e59d491742595b0a6de127e8b03d1cc14e82760696bbb7c688db2560920 |
| apps/web/src/app/(authenticated)/settings/domains/error.tsx           | bee903515858ec19a377055c420e301a48c302b80f5981b6a360aa9789a35282 |
| apps/web/src/features/domains/client.ts                               | ca2d18f8a63473363d6317853ad144bd81e1d8ab64b0a5c14772b9a048c2586b |
| apps/web/src/features/domains/client.unit.test.ts                     | 56ccea367ded2080ae75550f597d57d24af522148206e3509ca51dcbd1417767 |
| apps/web/src/features/domains/domain-screen.tsx                       | ef9b9a8a6b0d696baa899e2b854d41886cd93d52a68dbc28c07ccc0f4558a7d0 |
| apps/web/src/features/domains/domain-screen.integration.test.tsx      | 6a4109fbc4c8e8b6452ab7f281a9f4e5719ef1c1abd3fe9df8999adb180804ba |
| apps/web/src/features/domains/domain.test-support.ts                  | 65c6d33307356612a40eb3b6553cded5a27fb86e9f2ab754cb1988d5707067d6 |
| apps/web/src/features/domains/domains.module.css                      | 595315ed052851d9089416fadb3d109eae540d8324b8cc2b716857067a23a718 |
| library/knowledge/private/ux-ui/04-screens/domain-setup.md            | 91a699c817f7ceb8152b85c4e8709a00e1457a9e08070b367c4984cd4c766eaa |
| tests/browser/domain-setup.spec.ts                                    | c74c03ea4e1ebc80260e94f85516a60360ffb8e99fa0d7bf321f455cd600e96a |
