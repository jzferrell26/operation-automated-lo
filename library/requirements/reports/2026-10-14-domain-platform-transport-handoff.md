# Local platform transport repair, October 14, 2026

Base: `50c7e281f8914443f49adb219357fab00dd832d4`, branch `codex/domain-completion`. Scope is one routing module, two new regression/probe files, and this handoff. UI, HTTP handlers, proxy, authentication, cookies, CSRF, SQL, migrations, thresholds, dependencies, prior reports and root ledger were not edited.

## Confirmed defect

The installed Next 16.3.8 `apps/web/node_modules/next/dist/server/next-server.js:1284` constructs its initial URL using its configured fetch hostname and transport port. A TLS gateway Host can therefore differ from that URL's port. Installed `next/dist/server/web/next-url.js:15` through `:19` additionally normalizes loopback URL hostnames to `localhost`. The prior `publicDomainAuthority` rejected the Host/URL difference before recognizing the canonical local platform.

Test-first proof: the new initial selection contained 20 tests, with 3 failures and 17 passes on the original module. The failures were exact gateway authority recognition, preservation of the canonical consumer origin, and the real NextRequest proxy/CSP case. An initial same-hostname repair left the NextRequest case red because its URL had become `localhost`. The final regression explicitly checks that framework normalization and still requires the actual raw Host to match the configured canonical platform host.

## Bounded behavior

The exception requires all of: `OALO_ENVIRONMENT=local`, configured HTTPS platform, incoming HTTPS protocol, both URL hostnames in the exact fixed loopback set (`localhost`, `127.0.0.1`, `[::1]`), explicit platform and transport ports, and raw Host exactly equal to the configured platform host. Its return value retains the configured canonical origin. An incoming URL with credentials is refused.

Production, preview, staging and absent-environment cases retain strict Host/URL checks. HTTP transport, missing/wrong/foreign Host, non-loopback platform or transport, unsupported ports and credentialed URLs do not establish the exception. Forwarded-host is not read. Customer-domain ownership checks, finite public paths, private-page denial and prefetch coverage remain unchanged. No request establishes tenant or session authority through this normalization.

## Probe correction and actual production-build proof

The parent's existing ignored `tmp/domain-proxy-transport-probe.mjs` was read and invoked without modification. It returned 404/no CSP/zero bytes before and after the source repair. Investigation found that Node 24 built-in fetch silently replaced its supplied Host header. A separate credential-free ephemeral HTTP receiver observed the transport Host instead of `127.0.0.1:3443`, while the forwarded protocol header was transmitted. Consequently the old probe's gateway label did not establish the actual Host on the wire, and its outputs must not be represented as successful gateway transmission.

The new manual `tooling/tests/funnel-domain-platform-transport.production-probe.mjs` uses native `node:http.request` to transmit the exact Host. It retains the parent's whitelisted child environment and `windowsHide: true`, starts only the owned loopback Next production server on port 3100, waits for readiness from that owned child, drains diagnostics without printing them, limits response bytes, asserts outcomes and stops the child in cleanup. It supplies no database, provider, authentication-signing or customer credential configuration. Cleanup failures and probe failures remain visible.

After the fresh production build, actual static GET `/funnel-media/homebuyers.webp` results were:

| Native HTTP Host / protocol hint | Status | CSP     | Type         | Bytes  |
| -------------------------------- | ------ | ------- | ------------ | ------ |
| `127.0.0.1:3100` / absent        | 404    | absent  | absent       | 0      |
| `127.0.0.1:3443` / `https`       | 200    | present | `image/webp` | 143808 |
| `hostile.example.org` / `https`  | 404    | absent  | absent       | 0      |

The final owned probe exited 0 and stopped its server. This proves the repaired static platform transport and negative controls on the actual Next build. It does not prove authenticated journeys, actual public-domain DNS/TLS qualification, or the cause of the long-running historical CI browser jobs.

## Verification

- Final unit selection: 44 PASS across 5 files, including 19 new transport cases and existing routing/proxy cases.
- `pnpm --filter @oalo/web typecheck`: PASS.
- `pnpm build`: 16 successful workspace tasks; fresh Next web compilation, TypeScript and route generation completed.
- Native production probe: PASS with the exact results above.
- Scoped oxlint and Prettier, boundary audit and its negative fixture, product-types, secrets, and `git diff --check`: PASS.
- No actual PostgreSQL suite was run by this repair. Fresh Security followed by Quality and new hosted CI remain required.

The two historical runs `38531611437` and `38531604133` were reported as stalled by the parent. No assertion about their final result or shared causal diagnosis is made here. No Git write, deployment, live provider request, paid action or global environment change was performed.

## Frozen source pins

| File                                                                  | SHA-256                                                            |
| --------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `apps/web/src/server/funnel-domain-routing.ts`                        | `95aefbc8b6174239f2d2207061cbb6fb44c3c47d5988fa624275f651c6a99c64` |
| `apps/web/src/server/funnel-domain-platform-transport.unit.test.ts`   | `036daffd60a73da5fd9a0e30eec5c3916e15b5de17cd30b2b90a67d250610b3a` |
| `tooling/tests/funnel-domain-platform-transport.production-probe.mjs` | `e927fdd96701c81ecc019da91ba9a148a1879c0d229b66ce7244a9ad988a1fb6` |

The unchanged parent probe SHA-256 is `56be11360275f384f0fc638f423acd025616c9c603e12c03fe4e717973d32565`. All three owned source files and this report are frozen and released to the parent for ordered review. Port 3100 is released.
