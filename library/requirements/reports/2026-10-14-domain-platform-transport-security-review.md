# Final domain packet security review, October 14, 2026

Auditor: security-guardian, `/root/domain_transport_security`. Base: `50c7e281f8914443f49adb219357fab00dd832d4`, branch `codex/domain-completion`. Scope: the eight frozen UI/copy/transport files below and their immediate authorization, proxy, HTTP and shared-state seams.

## Executive summary

**Bounded source PASS.** No new Critical, High, Medium or Low finding was detected in this packet. The local TLS transport exception requires the exact configured raw Host, HTTPS, explicit ports, a local environment and fixed loopback hostnames; it preserves the canonical consumer origin. It introduces no tenant/session authority, provider request, payment or PII surface. The current UI states remain escaped and retain their mutation/reload fences.

The managed CVE intelligence was last refreshed April 24, 2026, over 120 days old. Refresh the Guild intelligence separately. Current production registry audit reports zero advisories; the full audit retains one pre-existing ignored development High, without a new exception. These are bounded statements, not a whole-product or hosted-domain acceptance.

## Scope and ordering

Read the managed Guardian configuration, Weapon, principles, local Next.js catalogs, transport guidance, report template, Dungeon Master routing and repository terrain. The sibling canonical Weapon overlay is absent. The integrated generic transport procedure was used where applicable; Svelte/WorkOS instructions did not replace the actual Next.js seams.

`library/qa/` is absent. Older domain Quality evidence covers superseded packets and predates the base; no Quality report for these eight pins existed at entry. This review follows the frozen AsyncState Security and independent visual closure, and must precede fresh Quality. The prior reports, visual originals, manifest and all source files were preserved.

## Scorecard

| Category | Result | New findings |
| --- | --- | --- |
| Financial/payment security | None detected; no new payment surface | 0 |
| PII, secrets and logging | None detected | 0 |
| Authentication and authorization | None detected in the assigned delta | 0 |
| Injection and hostile text | None detected | 0 |
| Dependencies | No new findings; existing development exception retained | 0 |
| Configuration, host authority and headers | None detected in the assigned delta | 0 |
| Data handling and recovery | None detected | 0 |

## Security evaluation

### Transport and host authority

None detected. `apps/web/src/server/funnel-domain-routing.ts:39-60` rejects URL credentials and gates normalization on all required conditions together. Exact sets contain only `localhost`, `127.0.0.1` and `[::1]`. The returned origin is the configured canonical origin, not a caller's forwarded authority. The exception cannot apply to production, preview, staging, absent environment, non-loopback configuration, foreign raw Host, missing explicit ports or HTTP protocol.

The existing Host/URL mismatch refusal and HTTPS/custom-host normalization remain after this narrow exception (`:62-74`). Caller forwarded-host headers are not read. Customer hosts still enter the finite public-path policy rather than platform routing. `apps/web/src/proxy.ts:38-57` still denies customer private/auth/report paths before rendering, including prefetch requests, and handles invalid configuration with an empty no-store 404. Its matcher has no new prefetch exclusion. The nonce/CSP generation and rejection of inbound nonce/CSP headers remain unchanged (`:73-109`).

The exception describes local transport only. Recognizing a platform origin does not authenticate a request. The unchanged authenticated domain HTTP handler independently resolves its principal and mutation capability (`apps/web/src/server/funnel-domain-http.ts:31-49`), retains strict bounded payloads, owner/revision commands and sanitized errors. Session signatures, CSRF validation and database grants were not changed. No production fallback or customer-to-platform authority override was introduced.

### UI, recovery and injection

None detected. `apps/web/src/features/domains/domain-screen.tsx:240-278` supplies fixed shared-state kinds and escaped React descriptions. DNS values remain inert text (`:73-75`); no HTML sink, browser credential storage, new telemetry or server secret serialization was added. Permission wording describes the single loan officer session and support, without granting authority or introducing customer role choices.

The `inFlight`, `canEdit`, availability and `mustReload` conditions remain intact (`:110-158`). Failed reads and uncertain writes retain the reload fence (`:125-130`, `:189-196`). Deliberate confirmation, exact id/revision, cooldown, stale proof, safe read recovery and the independent editable-session disconnect path remain unchanged. The client still uses constant same-origin endpoints, no-store reads, redirect refusal, session-bound CSRF and strict response schemas. Title inventory/copy changes do not alter runtime authority.

### Dependencies, credentials and deterministic checks

None newly detected. The managed Node scanner completed and produced ignored scratch artifacts. Unicode scan is clean. Scoped pattern review found no new dangerous sink in this packet. The scanner's root-only Next-config lookup is a monorepo limitation; actual headers remain in `apps/web/next.config.ts:5-14`, with nonce CSP in the proxy.

Fresh production audit: 0 informational, 0 Low, 0 Moderate, 0 High, 0 Critical across 153 production/optional dependencies. Full audit exits 0 with one High ignored by the existing `GHSA-vfj7-8cjw-p6xm` development exception (`pnpm-workspace.yaml:51-59`). Resolved Next.js is 16.3.8 and React/React DOM is 19.3.0; the known local catalog's affected version ranges do not include these versions. No dependency/config/lockfile change or new exception occurred. Repository secret audit passed.

## Findings and remediation

Critical: None detected. High: None newly detected. Medium: None detected. Low: None detected.

Only this report was added. No source remediation, frozen report/image change, environment widening, Git write, provider call or deployment occurred. `git diff --check` passed and the assigned production diff was reviewed. No Medium-or-above repair requires another remediation cycle.

## Independent verification

| Executed check | Result |
| --- | --- |
| Transport, routing, proxy, principal, client and title units | 67 passed across eight files |
| Domain screen integration | 26 passed |
| Shared state primitive components | 5 passed |
| Web TypeScript | Passed |
| Managed scanner, production/full dependency audits, secrets | Passed with limits above |
| Exact eight source pins and three frozen review/handoff pins | Matched |
| Current visual manifest and original image hashes | 88 matches, zero mismatches |
| Native HTTP probe against existing production build | Passed on unchanged final retry; details below |
| Owned child cleanup and port 3100 | Stopped; port free |

The first native probe ran alongside scanner/tests and timed out on the initial static request after its existing five-second bound. The second unchanged serial attempt also timed out at that same request, before a response row was printed. Both exited 1 and cleaned up their owned child. No source, timeout or gate was changed to overcome either failure, and their cause is not established.

A third in-memory diagnostic execution changed only stdout/stderr listeners and an initial-request marker. It confirmed the owned Next child reached ready in 257 ms, loaded config in 63 ms and produced all expected results. No diagnostic source file was written. A fourth execution of the completely unchanged frozen probe exited 0 and independently reproduced:

| Actual native HTTP Host / protocol hint | Status | CSP | MIME | Bytes |
| --- | --- | --- | --- | --- |
| `127.0.0.1:3100` / absent | 404 | absent | absent | 0 |
| `127.0.0.1:3443` / `https` | 200 | present | `image/webp` | 143808 |
| `hostile.example.org` / `https` | 404 | absent | absent | 0 |

The child environment uses the frozen whitelist and supplies no database, provider, signing or customer keys. The exact HTTP probe uses `node:http.request`; Node 24 fetch's supplied-Host replacement is not used as authority evidence. This test proves local static transport, not authenticated browser journeys, DNS ownership, a real TLS handshake, production host behavior or the cause of historical CI stalls. No PostgreSQL or hosted browser suite was executed by this reviewer. The author's build and independent visual acceptance are attributed evidence, not repeated executions.

## Frozen provenance

| File | SHA-256 |
| --- | --- |
| apps/web/src/features/domains/domain-screen.tsx | a2498ac1355b8d3aa776be63037615aa28118b62d8e5c8ae473faeab0ec14b73 |
| apps/web/src/features/domains/domain-screen.integration.test.tsx | 090a5003a89f9719954f43d7accf74bec76d262e043438b10f2c20eb7690d210 |
| tests/browser/domain-setup.spec.ts | 04fc61b7a3bcefca205381d6128daf800976cee2f70d633db8dd40f8b55bbbab |
| library/knowledge/private/ux-ui/04-screens/domain-setup.md | ce9b8bf34e36580840cbb44e59dc39d14c1caebdb604ac4e2775119595ab5685 |
| apps/web/src/copy/page-titles.unit.test.ts | 6823f91b6def90a946462a3e429212879d2b7011eea075e6dea417f1b3eeb7f8 |
| apps/web/src/server/funnel-domain-routing.ts | 95aefbc8b6174239f2d2207061cbb6fb44c3c47d5988fa624275f651c6a99c64 |
| apps/web/src/server/funnel-domain-platform-transport.unit.test.ts | 036daffd60a73da5fd9a0e30eec5c3916e15b5de17cd30b2b90a67d250610b3a |
| tooling/tests/funnel-domain-platform-transport.production-probe.mjs | e927fdd96701c81ecc019da91ba9a148a1879c0d229b66ce7244a9ad988a1fb6 |

Transport handoff: `7395baf718b3c8768f66368dbdbc2ab121067c334b2a7caddb228a6d55da4c10`. Prior AsyncState Security: `bbf151cc35bd09aee4dfb0bcb55bcd0916794f6dde0b6c78edb5195c2fc8264b`. Independent visual closure: `c6b5678f07a54317a7002cc347835d7b81843a3022e49ebe1f9bc6147876da09`. Current image manifest: `c5534f0060c027471105120f4adaaa66acd42169fdf5fb5fea60a72aa5ca7dc5`.

## Required next step and limits

Run fresh Quality against these exact eight pins, then orchestrator repository-health and current-head canonical CI. Preserve both timeout attempts and the successful actual HTTP retries. Obtain separate review of the eight Settings baseline originals when available. No complete domain/FUN acceptance, canonical Settings approval, provider qualification or production deployment is implied. Refresh the stale Guild CVE intelligence separately and retain the existing development advisory disposition.
