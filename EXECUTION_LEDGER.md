# Operation Automated LO Phase 0 Execution Ledger

## Raid contract

- Branch: `codex/operation-automated-lo-phase-0`
- Baseline: `f3f2b05d33ffb5ca1657278f85ab816fba147727`
- Scope authority: PRD-001 index, PRD-001j, and the 2026 Build Readiness and Research Gate
- Authorized scope: evidence-producing Phase 0 scaffold and harnesses only
- Prohibited scope: production campaign functionality, live customer changes, live provider writes, external spending, production advertising, any assumption that closes G1 through G7 without named external evidence, and any treatment of G8 as `PASS`
- Status flow: `OPEN` -> `IN PROGRESS` -> `DONE` -> `VERIFIED`

## Acceptance-criteria ledger

| ID | Source | Exact criterion | Dependencies | Owning Guardian | Status | Verification evidence |
| --- | --- | --- | --- | --- | --- | --- |
| P0-001 | PRD-001j, Monorepo and runtime | "Scaffold pnpm workspaces and Turborepo." | None | `typescript-node-guardian` | VERIFIED | Exact pnpm workspace and Turbo configuration resolve 17 projects; frozen install passes. |
| P0-002 | PRD-001j, Monorepo and runtime | "Pin Node 24 LTS and Next.js 16.2.10 or the later patched stable 16.2 release available at scaffold time." | P0-001 | `typescript-node-guardian` | VERIFIED | Node 24.18.0, Next 16.2.10, and React/React DOM 19.2.7 are exact pins. |
| P0-003 | PRD-001j, Monorepo and runtime | "Prefer strict TypeScript 7.0.2 or later stable 7.0.x after the scaffold compatibility suite passes, with the TypeScript 6 compatibility package only for tooling that still needs the compiler API." | P0-001 | `typescript-node-guardian` | VERIFIED | TypeScript 7.0.2 drives product checks; the exact TypeScript 6.0.3 alias is limited to compatibility tooling. |
| P0-004 | PRD-001j, Monorepo and runtime | "Create `apps/web` for Vercel and `apps/tasks` for Trigger.dev." | P0-001, P0-002, P0-003 | `typescript-node-guardian` | VERIFIED | Both app shells typecheck and build under the exact pinned runtime. |
| P0-005 | PRD-001j, Monorepo and runtime | "Create domain, application, contracts, database, auth, HighLevel, AI, billing, rendering, storage, observability, test-support, and UI packages." | P0-001, P0-003 | `typescript-node-guardian` | VERIFIED | All 14 named package shells exist and participate in the workspace graph. |
| P0-006 | PRD-001j, Monorepo and runtime | "Enforce dependency direction and prohibit provider or framework imports in the domain package." | P0-005 | `typescript-node-guardian` | VERIFIED | Boundary audit passes 16 packages and rejects the deliberate domain-to-GHL reverse dependency fixture. |
| P0-007 | PRD-001j, Monorepo and runtime | "Use strict ESM and correct NodeNext relative import extensions." | P0-003, P0-005 | `typescript-node-guardian` | VERIFIED | Strict NodeNext/ES2024 settings and source extension audits pass across all packages. |
| P0-008 | Delivery plan, Phase 0 build | "Monorepo, strict TypeScript, package boundaries, CI, local Supabase, preview environments." Local data must remain synthetic only. | P0-001 | `db-guardian` | VERIFIED | Credential-free validation, local start, data-less reset, and pgTAP all pass on the reserved 5542x port block. Five database assertions pass. The unrelated `equipment-room` project was preserved. |
| P0-009 | Delivery plan, Environment model | Preview uses Vercel preview, Trigger.dev preview branches, Supabase ephemeral preview branches, provider stubs by default, and seeded synthetic data only. | P0-001, P0-008 | `devops-guardian` | VERIFIED | `.github/workflows/ci.yml`, `vercel.json`, and `docs/phase0-preview-environments.md` encode a stub-only, synthetic-only preview contract. Workflow audit passes with 6 of 6 external actions pinned by commit SHA. No live deployment was performed. |
| P0-010 | PRD-001j, Verification and observability | "Provide `pnpm verify` as the canonical local and CI gate." | P0-001 through P0-009 | `typescript-node-guardian` | VERIFIED | Exact Node 24.18.0 and pnpm 11.15.1 frozen install plus the complete `pnpm verify` gate pass. CI invokes the same command. |
| P0-011 | Delivery plan, Phase 0 exit | "`pnpm verify` passes." | P0-010, P0-013 through P0-019 | `quality-guardian` | VERIFIED | Independent QA reran `pnpm verify` under exact Node 24.18.0 and pnpm 11.15.1: 12 test files, 35 tests, 16 typechecks, and 16 builds passed. |
| P0-012 | Delivery plan, Phase 0 exit | "Next.js 16.2.10 or a later patched stable 16.2.x version and its compatible React release are pinned after the official advisory sweep passes." | P0-002 | `dependency-audit-guardian` | VERIFIED | Exact Next 16.2.10 and React/React DOM 19.2.7 pins are peer-valid. Frozen install and `pnpm audit --audit-level=high` pass after exact tar, ws, and engine.io overrides; 3 Moderate findings remain documented. |
| P0-013 | Delivery plan, Phase 0 exit | "TypeScript 7 and any TypeScript 6 compatibility sidecar pass lint, build, tests, editor, and package-tooling checks." | P0-003, P0-010 | `typescript-node-guardian` | VERIFIED | Exact Node 24 verification passes 16 of 16 TypeScript 7 typechecks and builds, with the TypeScript 6 alias confined to compatibility tooling. |
| P0-014 | Delivery plan, Phase 0 build | "HighLevel App Test harness, signed-context fixture, provider schema capture, and golden render fixtures." | P0-004, P0-005 | `gohighlevel-guardian` | VERIFIED | `packages/ghl/src/**` and `tests/contracts/ghl/**` implement fixture replay, signed-context projections, inert live capture, and deterministic provider evidence. |
| P0-015 | Research gate, Core App Test contract suite | "The harness records sanitized request and response fixtures, HTTP status, safe provider IDs, granted scopes, and observed account state. Secrets, tokens, customer data, and live spend are prohibited from fixtures." | P0-014 | `gohighlevel-guardian` | VERIFIED | Strict Zod evidence schemas plus recursive sanitization, tamper hashes, method/path denylist, and secret/PII/spend negative tests pass. |
| P0-016 | Delivery plan, Phase 0 exit | "HighLevel research gates have executable test cases." | P0-014, P0-015 | `gohighlevel-guardian` | VERIFIED | `pnpm test:contracts` passes 4 files and 21 tests. G1 through G6 remain BLOCKED pending named external evidence. |
| P0-017 | PRD-001j, Test fixtures | Golden render fixtures cover common and adversarial content, and unchanged versioned inputs produce stable hashes without shipping a production renderer. | P0-004, P0-005 | `typescript-node-guardian` | VERIFIED | Versioned common, long, and adversarial fixtures produce canonical bytes and stable SHA-256 hashes with zero network access. Two visual harness tests pass. |
| P0-018 | PRD-001j, Rendering and storage | Malicious image, SVG, HTML, URL, oversized, mislabeled, corrupt, and high-decompression fixtures are rejected or isolated by the Phase 0 harness. | P0-017 | `security-guardian` | VERIFIED | Eight hostile rendering vectors are rejected by executable tests with zero network calls. |
| P0-019 | Delivery plan, Phase 0 build | "Threat model and provider contract register." | P0-014 through P0-018 | `security-guardian` | VERIFIED | Strict register covers all 32 Phase 0/threat-model entries and all eight external gates with executable completeness and reference checks. |
| P0-020 | PRD-001 index, Delivery sequence | "Run the $500 founding offer against a working demo." The demo must use synthetic data and expose no provider write path. | P0-004, P0-005 | `react-guardian` | VERIFIED | Static `/demo` uses local synthetic fixtures and includes all eight proof surfaces, manual/automated/read-only labels, a 4-minute walkthrough, scope, and refund policy. Typecheck and build pass. |
| P0-021 | Delivery plan, Phase 0 exit | "No production feature traffic." | P0-014 through P0-020 | `security-guardian` | VERIFIED | Fail-closed environment parsing, disabled live adapter, blocked provider contracts, and static source proof show no production traffic or outbound provider transport. |
| P0-022 | PRD-001j, Repository and builds | "A new developer can install, start local database, run web, run tasks, and execute the complete verification suite from documented commands." For Phase 0, provider execution remains fixture-only unless separately authorized. | P0-001 through P0-021 | `quality-guardian` | VERIFIED | Independent QA executed the documented database, web, fixture-only task, and verification paths successfully. All 15 local README links resolve. |

## External gate register

These gates are not acceptance criteria for this implementation raid. G1 through G7 remain external blockers and must not be silently converted to `PASS`. G8 is recorded as `ACCEPTED CONSTRAINT`, never `PASS`, under the product-owner decision in the raid log.

| Gate | Current state | Required external evidence |
| --- | --- | --- |
| G1 Distribution contract | BLOCKED | HighLevel App Test plus Marketplace decision |
| G2 OAuth and session contract | BLOCKED | HighLevel App Test |
| G3 Meta publish contract | BLOCKED | HighLevel App Test with controlled test assets |
| G4 Special Ad Category contract | BLOCKED | HighLevel and Meta test evidence plus counsel and lender approval |
| G5 Lead routing contract | BLOCKED | No-spend Meta test lead evidence |
| G6 Billing lifecycle | BLOCKED | Stripe test mode plus HighLevel billing evidence |
| G7 Legal operating model | BLOCKED | Counsel and lender approval |
| G8 Demand | ACCEPTED CONSTRAINT | No 15-paid-founder evidence exists. The product owner directed proceeding without it, commercial validation remains unproven, and 15 paid founders is now a post-start target. |

## Dependency waves

### Wave 1: scaffold and deterministic harness foundation

| Guardian | Model selection | Ownership | Exit criteria |
| --- | --- | --- | --- |
| `typescript-node-guardian` | `gpt-5.6-sol`, high effort. Deep multi-package scaffolding and contract-test work need the strongest coding and reasoning profile available in this harness. | Root workspace and TypeScript configuration, `apps/**`, `packages/**`, test runner, boundary checks, verification scripts, golden render fixture plumbing | P0-001 through P0-007, P0-010, P0-013, and P0-017 are DONE with passing evidence |
| `db-guardian` | `gpt-5.6-terra`, high effort. The bounded local Supabase scaffold needs careful database security judgment without production schema construction. | `supabase/**` only | P0-008 is DONE with synthetic-only local configuration and executable checks |

### Wave 2: provider evidence, preview delivery, and founder demo

| Guardian | Model selection | Ownership | Exit criteria |
| --- | --- | --- | --- |
| `gohighlevel-guardian` | `gpt-5.6-sol`, high effort. OAuth, signed context, provider schemas, no-spend cases, and denylist controls have high security and contract risk. | `packages/ghl/**`, `packages/contracts/**` only where coordinated, and `tests/contracts/ghl/**` | P0-014 through P0-016 are DONE with fixture-only evidence |
| `devops-guardian` | `gpt-5.6-terra`, high effort. Greenfield CI and preview wiring are bounded and tool-heavy. | `.github/**`, preview configuration, and delivery documentation, with no database migration authorship | P0-009 and the CI portion of P0-010 are DONE |
| `react-guardian` | `gpt-5.6-terra`, high effort. The demo is a well-specified synthetic React surface with strict no-write boundaries. | `apps/web/src/app/demo/**` and demo-only components/fixtures | P0-020 is DONE and the demo build passes |

### Wave 3: independent verification and repair

Fresh verifier passes test the Wave 1 and Wave 2 work. Any failed item returns to its owning Guardian. `dependency-audit-guardian` verifies P0-012. Domain owners repair only their own files. The ledger reaches zero `OPEN` and zero `IN PROGRESS` before close-out.

### Wave 4: mandatory close-out

1. `security-guardian`, armed with `security-weapon`, verifies and remediates P0-018, P0-019, and P0-021 plus the full Phase 0 attack surface.
2. `quality-guardian`, armed with `quality-weapon`, verifies P0-011 and P0-022 and independently checks every DONE criterion against its source.
3. Any regression reopens its criterion and returns to the responsible implementation Guardian.

### Wave 5: ship

Fetch `origin/main`, resolve conflicts, rerun `pnpm verify`, confirm mergeability, commit, push, open the PR with this ledger and close-out results, then monitor CI until green.

## Raid log

| Time | Event |
| --- | --- |
| 2026-07-20 | Verified clean baseline `f3f2b05`, fetched `origin/main`, and created `codex/operation-automated-lo-phase-0`. |
| 2026-07-20 | Read the complete PRD-001 corpus, research gate, construction specifications, and threat model. |
| 2026-07-20 | Reconciled authorization to Phase 0 only. G1 through G8 remain blocked. |
| 2026-07-20 | `db-guardian` completed P0-008 under `supabase/**`. Credential-free validation passed; Docker-backed reset and pgTAP remain pending until the local Linux engine is available. |
| 2026-07-20 | `dependency-audit-guardian` completed the official pre-lockfile advisory sweep and established exact pins. Resolved-tree verification remains pending. |
| 2026-07-20 | `devops-guardian` completed P0-009 and the CI configuration portion of P0-010. Static workflow and preview-contract checks passed; integrated verification awaits the lockfile. |
| 2026-07-20 | `dependency-audit-guardian` reran P0-012 against the resolved tree after remediation. Critical and High findings are zero; 3 Moderate transitive findings remain documented. |
| 2026-07-20 | `gohighlevel-guardian` completed P0-014 through P0-016. Contract, safety, signed-context, and G1 through G6 replay tests pass without live provider access. |
| 2026-07-20 | `typescript-node-guardian` completed P0-001 through P0-007, P0-010, P0-013, and P0-017. Exact Node 24.18.0 verification passed with 29 assertions and 16 successful builds. |
| 2026-07-20 | `react-guardian` completed P0-020 with a static synthetic demo and no provider, payment, spend, or customer-data path. |
| 2026-07-20 | `db-guardian` moved the local scaffold onto an unused 5542x port block. Supabase start, reset, and all 5 pgTAP assertions passed without touching the unrelated project on port 54322. |
| 2026-07-20 | `security-guardian` completed the mandatory penultimate pass with 0 Critical and 0 High findings. P0-018, P0-019, and P0-021 are DONE; exact Node 24 verification passes 12 files and 35 tests. |
| 2026-07-20 | `typescript-node-guardian` added the no-network `pnpm tasks:local` runner, and `readme-writing-guardian` rebuilt onboarding around verified Phase 0 commands. |
| 2026-07-20 | `security-guardian` refreshed the audit after the onboarding repair. Exact Node 24 verification passed with no new finding. |
| 2026-07-20 | `quality-guardian` completed independent close-out: 22 of 22 criteria passed with zero Criticals, Warnings, or Suggestions. Every P0 row is VERIFIED; G1 through G8 remain BLOCKED. |
| 2026-07-20 | Watchdog found that the initial documentation worker made no filesystem progress. The worker was terminated and the task was decomposed. |
| 2026-07-20 | Product owner explicitly directed: "Proceed, we are moving without the 15 paid founders." G8 is `ACCEPTED CONSTRAINT`, never `PASS`. No 15-paid-founder evidence exists, and commercial validation remains unproven. G1 through G7 remain `BLOCKED`, and production stays unauthorized until each is `PASS`, `ACCEPTED CONSTRAINT`, or `DEFERRED OUT OF CORE`. |

## UI Foundation Raid

### UI raid contract

- Branch: `codex/oalo-ui-foundation`
- Initial baseline: `18ad155abcfb896946a1e7b73bd2acacc87be968`
- Shipping baseline after rebase: `ff6b02bd2c65fb4d1be899667b23882907c5589d`
- Initial merged Phase 0 ledger blob: `59f4db6a2195f66174dc13673f7aac79d378f785`
- Rebased Phase 0 ledger blob: `e565b9c9d82a8fc6f4353d906ae31569a39a963e`
- Scope authority: PRD-001 index dashboard acceptance criteria, PRD-001h, and `library/knowledge/private/ux-ui/**`
- Authorized scope: React design-system foundation, authenticated synthetic shell, Platform Overview, onboarding and readiness surfaces, Light/Dark/System behavior, and their deterministic evidence
- Prohibited scope: real authentication, live GoHighLevel OAuth, Meta or Stripe access, AI generation, production routing, customer records, live provider writes, spend, or any UI-derived Launch Ready decision
- Existing P0 rows, owners, statuses, and evidence remain unchanged. UI criteria use the same `OPEN` -> `IN PROGRESS` -> `DONE` -> `VERIFIED` flow.

### UI acceptance-criteria ledger

| ID | Source | Exact criterion | Dependencies | Owning Guardian | Status | Verification evidence |
| --- | --- | --- | --- | --- | --- | --- |
| UIF-000 | Raid handoff, Phase 0 boundary | Preserve every existing P0 ledger row, owner, status, and evidence while appending a separate UI Foundation section. | None | `quality-guardian` | VERIFIED | After rebasing, the `origin/main` ledger blob is `e565b9c9d82a8fc6f4353d906ae31569a39a963e`. Its complete pre-UI content and the current prefix are ordinal-equal and share normalized SHA-256 `756cfdd4d54c945823af2544e88238fc48c78c8d91169e6e5d040202d4fa0470`. |
| UIF-001 | UX master tokens and design brief | Implement semantic Light and Dark tokens for canvas, surfaces, text, borders, actions, status, focus, elevation, type, spacing, radius, breakpoints, and motion. Product components must not consume raw palette values. | UIF-000 | `ux-ui-guardian` | VERIFIED | Independent token and theme verification passed semantic coverage, WCAG AA, Phase 0 compatibility, package build, stylesheet export, consumer resolution, and source/dist SHA-256 equality. |
| UIF-002 | PRD-001 dashboard AC, UX design brief | Provide an accessible Light, Dark, and System segmented control with visible selected state, text, and glyph. | UIF-001, UIF-021 | `dark-mode-theming-guardian` | VERIFIED | Independent exact Node 24 verification confirms the accessible three-option radiogroup, visible glyph and text selection, and keyboard behavior. |
| UIF-003 | UX design brief, Theme behavior | First visit follows the operating-system preference. System follows later media-query changes, while explicit Light or Dark remains stable. | UIF-002 | `dark-mode-theming-guardian` | VERIFIED | Independent exact Node 24 verification confirms first-visit System behavior, live media changes, and stable manual modes. |
| UIF-004 | PRD-001 dashboard AC, UX design brief | Theme changes persist without reload, navigation, refetch, or loss of route, focus, scroll, disclosure, checklist, or local form state. | UIF-002, UIF-003 | `dark-mode-theming-guardian` | VERIFIED | Independent jsdom verification confirms theme changes preserve local application state without navigation, reload, refetch, or writes. |
| UIF-005 | UX design brief, First paint | Apply the correct theme before first paint without hydration mismatch or flash of the wrong theme. Hydration suppression is limited to the root theme attribute. | UIF-002, UIF-003 | `dark-mode-theming-guardian` | VERIFIED | Independent pinned-Chromium evidence confirms stored Dark is present on the first animation frame without a Light sample, hydration warning, or page error; root-only suppression remains intact. |
| UIF-006 | UX design brief, Tenant theming | Accept only server-validated semantic tenant accent overrides with complete Light and Dark values, contrast validation, and safe fallback. User-provided CSS or raw primitive overrides are prohibited. | UIF-001 | `dark-mode-theming-guardian` | VERIFIED | Independent source and exact Node 24 test verification confirms fixed allowlisted Light/Dark semantic-variable projection, safe fallback, and no client-controlled arbitrary CSS path. |
| UIF-007 | UX accessibility contract | Meet WCAG AA contrast, visible 2 px focus with 3 px offset, non-color status communication, readable disabled states, and reduced-motion behavior. | UIF-001, UIF-002 | `ux-ui-guardian` | VERIFIED | Final Quality confirms axe-clean Light/Dark desktop/mobile and open-drawer states, visible focus, readable disabled states, non-color labels and glyphs, and reduced motion. |
| UIF-008 | PRD-001 dashboard AC, Campaign and artifact workflow | Theme and dashboard UI state must remain structurally absent from campaign inputs, approval projections, artifact manifests, canonical bytes, identifiers, and hashes. | UIF-004 | `react-guardian` | VERIFIED | Final Quality confirms strict local schemas exclude UI state, reject unknown keys, and preserve deterministic approval bytes, SHA-256, manifest IDs, approval IDs, and artifact IDs. |
| UIF-009 | Application shell specification | Build the authenticated shell with the full nine-item navigation, subordinate Marketing navigation, selected, expanded, collapsed, restricted, unavailable, planned, and degraded states, plus accessible desktop, compact rail, and mobile drawer behavior. | UIF-001, UIF-021 | `react-guardian` | VERIFIED | Independent pinned-Chromium verification confirms the full nine-item shell, accessible 80 px CSS compact rail, explicit collapse, state-aware labels and tooltips, subordinate Marketing behavior, and mobile drawer. |
| UIF-010 | Application shell specification, PRD-001h | Render validated synthetic session context for location, user, and role. The browser must not derive tenant or authority from URL state and must not expose an arbitrary location switcher. | UIF-009 | `react-guardian` | VERIFIED | Independent verification confirms strict synthetic session projection, capability-based access, no URL-derived authority, and no location switcher. |
| UIF-011 | PRD-001h, Status and attention specification | Readiness and attention states show safe server-shaped evidence, freshness, last verification, invalidation, responsible party, remediation, and next authorized action. | UIF-009, UIF-010 | `react-guardian` | VERIFIED | Independent verification confirms readiness and attention evidence, including freshness, remediation, responsibility, next action, exception code, and correlation ID. |
| UIF-012 | Safe action contract | Create and other consequential actions remain authority-aware, disabled when prerequisites fail, and accompanied by persistent reason, responsible party, and next action. UI code never derives authorization. | UIF-010, UIF-011 | `react-guardian` | VERIFIED | Independent verification confirms consequential actions fail closed with persistent prerequisite and authority evidence. |
| UIF-013 | Platform Overview screen specification | Render the required header, health strip, authorized quick actions, Business Pulse, Active Work, Attention Queue, Recent Activity, and Workspace Status. The page remains useful without an active campaign. | UIF-009 through UIF-012 | `react-guardian` | VERIFIED | Independent build and integration verification confirms every required `/overview` region and usefulness without an active campaign. |
| UIF-014 | Platform Overview, Source-of-truth policy | Every metric exposes value, source, and freshness. Unavailable, stale, partial, and true zero remain distinct. Synthetic values are visibly labeled with source and timestamp. | UIF-013 | `react-guardian` | VERIFIED | Independent verification confirms all six metric truth states, provenance, freshness, synthetic labeling, and explicit-zero semantics. |
| UIF-015 | UX design brief, Platform Overview | Cover loading, new workspace, setup incomplete, blocked, healthy without campaign, provider degraded, unavailable data, restricted viewer, authorized agency, route error, and safe retry states without inventing healthy or zero data. | UIF-013, UIF-014 | `react-guardian` | VERIFIED | Independent verification confirms the eleven-state Overview matrix and safe local retry behavior. |
| UIF-016 | PRD-001h, Onboarding screen specification | Render Get Connected with exactly five outcome items and Launch Readiness with exactly four items. Launch Readiness remains locked until Get Connected is satisfied, and each item routes to its exact completion surface. | UIF-009 through UIF-012 | `react-guardian` | VERIFIED | Independent verification confirms exactly five Get Connected and four locked Launch Readiness items with completion routes. |
| UIF-017 | PRD-001h, Onboarding state model | Model each onboarding item as not_started, in_progress, blocked, complete, or stale with text and glyph. Completion evidence includes verifier version, verification time, safe evidence, and permitted provider IDs. The browser cannot set completion or Launch Ready. | UIF-016 | `react-guardian` | VERIFIED | Independent verification confirms all five onboarding states, completion evidence, permitted synthetic provider IDs, and read-only browser authority. |
| UIF-018 | UX README, Raid boundary | All dashboard and onboarding data is frozen, strictly parsed, visibly synthetic, writes-disabled, and unable to record approval, readiness, publication, provider access, or customer data. | UIF-010, UIF-013, UIF-016 | `react-guardian` | VERIFIED | Independent verification confirms strict parsing, recursive freezing, visible synthetic disclosure, and provider, network, and write isolation. |
| UIF-019 | UX design brief, Responsive priorities | At 1180 px preserve Business Pulse, Active Work, and Attention with compact navigation. At 390 px prioritize readiness, two highest-value quick actions, four priority metrics, and attention before lower-priority content. | UIF-013 through UIF-018 | `ux-ui-guardian` | VERIFIED | Final Quality confirms the 1180 px desktop priorities and the 390 px ordering with exactly two primary actions, four primary metrics, and Attention before secondary content. |
| UIF-020 | UX accessibility contract | Support keyboard and screen reader flows, drawer focus trap, Escape, background scroll lock, focus return, logical checklist order, 44 px touch targets, reduced motion, and no ambient dashboard animation. | UIF-009, UIF-016, UIF-019 | `ux-ui-guardian` | VERIFIED | Final Quality confirms focus, 44 px targets, checklist order, drawer trap, Escape, scroll lock, focus return, reduced motion, screen-reader semantics, and drawer-open axe. |
| UIF-021 | UX source-of-truth change control | Product UI consumes governed `@oalo/ui` wrappers, semantic tokens, and approved icons. Existing Phase 0 demo files remain isolated, and product code imports no canvas examples, demo styles, or raw library primitives. | UIF-001 | `ux-ui-guardian` | VERIFIED | Fresh React verification passed exact Node 24 frozen install, package typecheck/build, 12 focused tests, CSS hashes and exports, web typecheck/build, semantic scans, and canonical contract alignment. |
| UIF-022 | React and theme verification | Add separate strict unit and jsdom integration coverage for fixture parsing, navigation access, theme behavior, drawer and checklist interaction, state continuity, status semantics, and retry behavior. Async Server Components are not rendered in jsdom. | UIF-002 through UIF-021 | `react-guardian` | VERIFIED | Independent exact Node 24 verification passes 12 shared UI tests, 24 unit tests, 13 jsdom tests, 16 package typechecks, and the graph-aware production build. |
| UIF-023 | PRD-001 dashboard AC, Artifact invariance | Assert identical canonical approval bytes and SHA-256 values before and after Light, Dark, and System changes, with unchanged artifact and approval identifiers and no generation, approval, provider, or network request. | UIF-008, UIF-022 | `react-guardian` | VERIFIED | Final Quality confirms byte-identical canonical approval evidence, SHA-256, approval, manifest, and artifact IDs across Light, Dark, and System with zero transition requests. |
| UIF-024 | UX evidence contract | Capture Overview and Onboarding in Light and Dark at 1180 x 900 and 390 x 844, plus drawer and state galleries. Run keyboard flows, automated accessibility scans, hydration-console checks, and first-paint theme checks. | UIF-005, UIF-007, UIF-013 through UIF-023 | `ux-ui-guardian` | VERIFIED | Final Quality confirms ten synthetic-only screenshots, the evidence summary, eight route/theme/viewport axe scans, drawer-open axe, keyboard flows, zero hydration/page errors, and first-paint evidence. |
| UIF-025 | Phase 0 verification contract | Use exact dependency versions, preserve the frozen lockfile contract, install the required browser explicitly, and include UI unit, integration, and browser suites in root `pnpm verify`. | UIF-022 through UIF-024 | `react-guardian` | VERIFIED | Final exact Node 24.18.0 and pnpm 11.15.1 `pnpm verify` passes with 76 non-browser tests, 15 browser tests, 16 typechecks, 16 builds, all audits, and 0 clones. |
| UIF-026 | Asset registry contract | Determine whether the Universal Asset Registry exists at implementation time. If adopted, register and drift-check all new pages, routes, surfaces, controls, nav entries, tokens, icons, fonts, motion, and breakpoints. If absent, record `not applicable: registry not adopted` with evidence and do not invent a production catalog. | UIF-009 through UIF-025 | `asset-guardian` | VERIFIED | `not applicable: registry not adopted`. Asset Guardian inventory found no registry KB, schema/models, migrations, scripts, drift output, code annotations, or catalog directories; `packages/db` remains a Phase 0 shell. No catalog was invented. |
| UIF-027 | Mandatory security close-out | Audit the entire UI foundation and remediate every Critical and High finding. Confirm CSP and embedding decisions, synthetic-data isolation, client/server trust boundaries, dependency posture, and absence of sensitive browser storage. | UIF-001 through UIF-026 | `security-guardian` | VERIFIED | Security audit reports 0 Critical and 0 High findings. Synthetic and provider isolation, fixed theme storage, strict tenant-accent projection, approval invariance, trust boundaries, security headers, secrets, package boundaries, and dependency posture were verified. Four non-blocking Moderate follow-ups remain: nonce or hash CSP and three transitive advisories. |
| UIF-028 | Mandatory quality close-out | Independently verify every UIF criterion after security, including exact source traceability, automated evidence, visual evidence, accessibility, responsive priorities, and unchanged P0 content. | UIF-027 | `quality-guardian` | VERIFIED | Final Quality report has no Critical, Warning, or Suggestion findings. All five axes pass; UIF-000 through UIF-028 are independently traced and verified. |
| UIF-029 | Raid shipping contract | Rebase onto current `origin/main`, rerun exact-runtime verification, confirm a clean worktree and MERGEABLE green PR, and open the ready PR without merging it. | UIF-028 | `quality-guardian` | OPEN | Pending final PR and CI evidence. |

### UI dependency waves

#### UI Wave 1: source contracts and runtime foundations

| Guardian | Model selection | Ownership | Exit criteria |
| --- | --- | --- | --- |
| `ux-ui-guardian` | `gpt-5.6-sol`, high effort. Cross-document component contracts, responsive composition, and visual evidence require deep design-system reasoning. | `packages/ui/**`, UX component and screen specifications, semantic product styles, icons, and visual baselines | UIF-001, UIF-007, UIF-019, UIF-020, and UIF-021 are DONE with contract and visual evidence. |
| `dark-mode-theming-guardian` | `gpt-5.6-terra`, high effort. The theme runtime is bounded but hydration-sensitive and test-heavy. | `apps/web/src/theme/**`, root theme bootstrap, persistence, tenant override validation, and theme-specific tests | UIF-002 through UIF-006 are DONE without flash, hydration drift, or state loss. |
| `react-guardian` | `gpt-5.6-sol`, high effort. The shell, Overview, onboarding state model, and evidence harness span multiple React 19 and Next.js 16 boundaries. | `apps/web/src/app/(authenticated)/**`, `apps/web/src/features/**`, synthetic UI fixtures, UI tests, Playwright configuration, and coordinated root scripts | UIF-008 through UIF-018 and UIF-022 through UIF-025 are DONE with exact-runtime evidence. |

#### UI Wave 2: integration, evidence, and asset reconciliation

Fresh cross-owner verification repairs any integration drift. `asset-guardian` then resolves UIF-026 without inventing a registry. Visual and automated evidence must be complete before any implementation criterion moves from DONE to VERIFIED.

#### UI Wave 3: mandatory close-out

1. `security-guardian`, armed with `security-weapon`, completes UIF-027 and remediates Critical and High findings.
2. `quality-guardian`, armed with `quality-weapon`, completes UIF-000, UIF-028, and UIF-029 only after security is clean.
3. Any regression reopens its owning criterion and returns to the responsible Guardian.

#### UI Wave 4: ship without merge

Fetch and rebase on `origin/main`, rerun the exact Node 24 and pnpm 11 frozen-install gate, push the branch, open the ready PR, monitor CI to green, and confirm GitHub reports `MERGEABLE`. Do not merge the UI Foundation PR.

### UI raid log

| Time | Event |
| --- | --- |
| 2026-07-20 | Read-only recon completed while PR #5 remained open. No UI implementation branch or product file was changed. |
| 2026-07-20 | PR #5 and the post-merge full-review fixes in PR #8 merged. All 22 P0 rows remain VERIFIED. |
| 2026-07-20 | Fetched `origin/main` at `18ad155`, verified the merged P0 ledger, and created `codex/oalo-ui-foundation`. |
| 2026-07-20 | Appended UIF-000 through UIF-029 without changing any existing P0 row. UI Wave 1 is ready for armed Guardian dispatch. |
| 2026-07-20 | Dispatched `ux-ui-guardian` for UIF-001 and the implementation-ready source contract that unlocks the theme and React lanes. |
| 2026-07-20 | Watchdog interrupted the first UIF-001 brief after it stalled in broad documentation review without file changes. Decomposed the work into semantic tokens and contrast first, then component specifications. |
| 2026-07-20 | Watchdog interrupted the decomposed UIF-001 run after a second no-edit stall. Reduced ownership to the `@oalo/ui` semantic token deliverable and contrast proof only. |
| 2026-07-20 | Retired the original UIF-001 Guardian instance after a third no-edit stall and re-dispatched the two-file token task to a fresh armed `ux-ui-guardian`. |
| 2026-07-20 | Fresh `ux-ui-guardian` completed UIF-001. Light faint/card is 4.97:1, Light primary action is 4.55:1, Dark faint/card is 7.40:1, Dark primary action is 5.22:1, and all status pairs pass 4.5:1. Dispatched independent theme-side verification. |
| 2026-07-20 | Independent `dark-mode-theming-guardian` reopened UIF-001. Semantic and contrast checks pass, but `@oalo/ui/tokens.css` fails with `ERR_PACKAGE_PATH_NOT_EXPORTED`; returned the packaging defect to the UX owner. |
| 2026-07-20 | UX owner fixed the stylesheet export and deterministic CSS build. Independent theme verification passed package build, web consumer resolution, byte equality, formatting, and all prior semantic checks. UIF-001 moved to VERIFIED and UIF-021 began. |
| 2026-07-20 | Watchdog interrupted the initial UIF-021 documentation and wrapper lanes after both stalled before file changes. Decomposed into source specifications, interactive controls, state/data primitives, and a later shared-export integration pass. |
| 2026-07-20 | Decomposed UIF-021 work completed: six new component specs, four governing spec extensions, interactive controls, state/data primitives, shared package integration, exact CSS output, and 8 focused tests. UIF-021 moved to DONE for independent React verification. |
| 2026-07-20 | Independent React verification reopened UIF-021. Build and packaging pass, but six specs use the wrong package name and public Button, SafeAction, AsyncState, and Metric unions drift from their canonical contracts. Returned documentation and code defects to separate UX owners. |
| 2026-07-20 | Documentation identity repair completed. Component API repair added the canonical variants and states, then a separate test-repair pass reached exact Node 24 typecheck with three stale tests. Watchdog stopped its non-reporting tail and dispatched fresh React re-verification. |
| 2026-07-20 | Fresh React re-verification passed exact Node 24 frozen install, UI typecheck/build, 12 tests, CSS hashes and exports, web typecheck/build, formatting, scans, and repaired contract alignment. UIF-021 moved to VERIFIED; dark-mode and React implementation lanes began in parallel. |
| 2026-07-20 | Dark-mode lane completed UIF-002, UIF-003, UIF-005, and UIF-006 with 8 pure tests and a production build. UIF-004 remains IN PROGRESS until the shared jsdom harness runs its state-continuity test; exact Node 24 integration verification remains pending. |
| 2026-07-20 | React lane completed UIF-009 through UIF-018 and UIF-022. Exact Node 24 passes 16 typechecks, 24 unit tests, 13 jsdom tests including theme continuity, and the graph-aware `/overview` and `/onboarding` production build. Dispatched integrated independent verification. |
| 2026-07-20 | Independent integrated verification marked UIF-002 through UIF-004, UIF-010 through UIF-018, and UIF-022 VERIFIED; held UIF-005 at DONE pending browser FOWT proof; reopened UIF-006 for unapplied tenant accents and UIF-009 for unnamed CSS-compacted navigation links. |
| 2026-07-20 | Dark-mode repair completed UIF-006 with server-only fixed semantic-variable projection for accepted Light/Dark accents, safe fallback, 10 pure theme tests, one jsdom runtime test, typecheck, and graph-aware build. |
| 2026-07-20 | React shell repair completed UIF-009 with unconditional accessible navigation names and tooltips across CSS-driven and user-driven compact modes; focused integration, typecheck, and graph-aware build pass. |
| 2026-07-20 | React evidence lane completed UIF-008, UIF-023, and UIF-025: three strict projection contracts and one pinned Chromium invariance scenario pass on exact Node 24; frozen install, strict browser typecheck, lint, format, and graph build pass. Independent review also marked repaired UIF-006 VERIFIED. |
| 2026-07-21 | UX evidence lane completed UIF-007, UIF-019, UIF-020, and UIF-024 with a 14/14 pinned-Chromium matrix, 10 visually inspected synthetic screenshots, axe-clean Light/Dark desktop/mobile and open-drawer states, first-paint/hydration evidence, responsive priority assertions, and focus/touch/motion checks. UIF-005 and repaired UIF-009 are independently VERIFIED. |
| 2026-07-21 | Asset Guardian marked UIF-026 VERIFIED as `not applicable: registry not adopted`; no registry KB, schema, migration, script, generator output, annotations, or catalog exists, and `packages/db` is still the Phase 0 shell. |
| 2026-07-21 | Security Guardian marked UIF-027 VERIFIED with 0 Critical and 0 High findings. Four non-blocking Moderate follow-ups remain: nonce or hash CSP, PostCSS, OpenTelemetry core, and development-only esbuild advisories. The audit also repaired local declaration of pinned web test dependencies so the 16-package boundary gate passes. |
| 2026-07-21 | Quality preflight found the root zero-duplication gate failing on seven clone groups. Implementation consolidated shared semantic link styling, status rendering, metric schema fields, and evidence details; `jscpd` now reports 0 clones. Post-repair Security reran secrets, product types, package boundaries, production audit, and diff checks with unchanged 0 Critical and 0 High findings. |
| 2026-07-21 | Final Quality marked UIF-000 through UIF-028 VERIFIED with no Critical, Warning, or Suggestion findings. Exact Node 24.18.0 and pnpm 11.15.1 `pnpm verify` passes 76 non-browser tests, 15 Chromium tests, 16 typechecks, 16 builds, all audits, and 0 clones. UIF-029 remains the ordered shipping step. |
| 2026-07-21 | Rebase resolved the sole ledger conflict by preserving `origin/main` PR #9 G8 evidence verbatim and retaining the separate UI section. The rebased main ledger and current pre-UI prefix are ordinal-equal with normalized SHA-256 `756cfdd4d54c945823af2544e88238fc48c78c8d91169e6e5d040202d4fa0470`. |
| 2026-07-21 | Ready PR #10 opened MERGEABLE. Its first canonical GitHub run exposed that Linux CI did not provision Playwright Chromium. The read-only SHA-pinned workflow now installs the pinned Chromium build and system dependencies before verification. Security reran with 0 Critical and 0 High findings, then the complete local `pnpm verify` gate passed again. UIF-029 remains OPEN pending repaired green GitHub evidence. |
