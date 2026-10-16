# Webinar publishing status: Security author review

Scope: [status increment plan](2026-10-16-webinar-publisher-status-plan.md), based on main `ddb0649edb6c11dc169b40af97e189bec8628b4c`. Inline implementation-author review using Neeson 3.0.1 `security-weapon`, including its response/tenant and actual-risk procedures. Completed before Quality. This is not independent review, whole-product clearance or live-provider qualification.

## Findings and evidence

No unresolved Critical, High, Medium or Low code finding was detected in this bounded read-only delta. Qualification gaps below remain open.

| Category | Inspected control and actual evidence | Limit |
| --- | --- | --- |
| Authentication and object authority | `webinar-publisher-status.ts:117` resolves the signed read principal before parsing/storage; unsigned synthetic and signed non-owner refuse. `:41` uses existing native `readWorker`, whose scoped path refreshes authority before and after the transaction. `:67` checks the requested operation and actor/location/projection lineage again. | Positive and denied HTTP controls use signed-session fixtures and an injected repository result. Actual new-route database role/pool reuse proof NOT_RUN. |
| Integrity and serialization | `webinar-publisher-status.ts:67` validates complete operation/launch records, independently checks summary and projection hashes, rejects a future observation, and returns an allowlisted DTO. Native IDs, provenance, media leases, raw failures and credentials are omitted. | Stored worker standing is historical evidence, not a current provider lookup. |
| Browser/cache boundary | Every handled GET success/error has private no-store and nosniff. `publisher-status-model.ts:65` uses same-origin no-store reads with redirects refused. `publisher-status.tsx:22` ignores a previous operation's late response; failed refresh removes the old financial details. | No authenticated production browser cache/revocation/back-navigation proof is claimed. |
| Provider effects | The native read-only adapter's evidence/dispatch/checkpoint methods throw if reached. It grants no admission, emits no command and never invokes a provider adapter. No POST export exists. All158 default-off/contracts tests pass unchanged. | Owner launch/pause producer and trusted worker binding remain unfinished. |
| Injection, secrets and disclosure | React text children and validated HTTPS destination only; no HTML sink, environment value serialization or raw exception response. Lint, boundaries, product types and six-root secret audit pass. Production dependency audit reports zero vulnerabilities. | No dependency or provider setting changed. |
| Financial truthfulness | Actual provider observation and status-read timestamp remain distinct. The latest campaign standing has no invented observation. Missing observation, uncertain, pending pause and cancelled command do not claim delivery or stopped spend. Estimated total is labelled an estimate. | No spending-cap or remote-stop guarantee is made. |

19 new HTTP tests pass, included in the wider publisher and webinar-read unit selection that passed229 cases. The final19-case HTTP selection also passes after relocating the read-only route. Final UI selection passes22 cases, including13 new status cases and9 existing review cases. These totals overlap and must not be added as unique whole-suite coverage.

The final Next16.3.8 production build succeeds and lists both dynamic routes. A normal production server on127.0.0.1:3117, without enabling a fixture environment, actually returned GET403 with private/no-store and only FORBIDDEN, POST405 with empty body, and status-page200 with private/no-cache headers in the existing unsigned local fallback. This proves safe refusal, not authenticated operation access. The server was stopped afterward. No provider was contacted by these requests.

## Scanner and historical failures

Ran the bundled Windows Node scanner from a temporary copy with only its output directory changed to `tmp/webinar-status-security-scan`, preserving the pre-existing reports directory and the installed skill. Its root-only Next configuration probe misses `apps/web/next.config.ts`; that file and the concrete response headers were inspected separately. Scanner hits in its own source, existing test strings and existing trusted theme bootstrap are not new sinks in this delta. Scoped searches found no new HTML/eval/logging/public-secret pattern. The unchanged April24 CVE catalog is over120 days old; its stale catalog does not certify current vulnerabilities. Current production `pnpm audit` reports zero advisories; no broad fresh CVE audit is claimed.

The first combined unit/integration invocation failed Vitest project scheduling before any test executed; separate project commands passed without configuration changes. The boundary audit rejected importing the existing MJS fixture inside the app package, so that test now lives with the existing publisher tests under tooling. Two default-off contract failures correctly caught the initial new top-level namespace and a publish-named request argument. The GET now lives under existing `webinar-ads/status`, with an explicitly read-named helper. The entire original security test and all its assertions remain unchanged. No baseline, timeout, scanner exclusion, tolerance or authority was weakened. An initial computed empty-directory cleanup was rejected by automatic approval review; separately named literal empty-directory removals succeeded. No fixture-only whole-app startup was attempted.

## Exact reviewed SHA256 pins

| Path | SHA256 |
| --- | --- |
| `apps/web/src/app/(authenticated)/marketing/campaigns/webinar/status/[operationRef]/page.tsx` | `b1567b2c4fd07a7dbf7abcb2b7aa0e666343542ddce2c6b60e5a200cc1505968` |
| `apps/web/src/app/api/campaigns/webinar-ads/status/[operationRef]/route.ts` | `6cca1dfdd0e0fb08729a866a48018dfc2af8e1ac8e176227a0c6d3d4532fc23f` |
| `apps/web/src/features/webinar-ads/publisher-status-model.ts` | `1c5e5aca230df6e24b6d34b6490ed16c9c5fa95702e850dbfa092ecb1b5e35b4` |
| `apps/web/src/features/webinar-ads/publisher-status.tsx` | `d56b9dd13e3b705c1b61820820d33aeb48de7e04582d8b7e82d8b1295e4cf0c6` |
| `apps/web/src/features/webinar-ads/publisher-status.test-support.ts` | `9adcb4b49a4bca4de475f3abbc6b06129d574835b1799b2bfff4c8c2529ffdb4` |
| `apps/web/src/features/webinar-ads/publisher-status.integration.test.tsx` | `a04d5569d294d8b4a30351a03b8577bc3e3c7e89164f50fce3da759984f2c779` |
| `tooling/tests/unit/webinar-publisher/status-http.test.ts` | `a03904ec1bbf112e74defe5aecbf98e635711232baff39f5a7ef2adc061eca56` |
| `apps/web/src/server/webinar-publisher-status.ts` | `dfe0bdec4c690d0b616135416aef1ffdf4853b65dac69f5ef0215f94dec0e8f0` |

Accepted CTR-003 revision1 hash remains `dfc912bfa9f00892641936794ce0488adc1fdea3df6bdf7a997cb8f00a48fe23`. No executable edits after these pins belong to this review. The new real-database route, authenticated production requests, screenshot/axe matrix, independent review and provider qualification remain NOT_RUN. Keep the PR draft and parent card open pending their applicable evidence. Eight excluded hosted migrations, live deployment, purchase, spend and customer messages remain outside this increment.
