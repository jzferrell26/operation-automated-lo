# Financing public client identity adapter handoff

Date: 2026-10-14. Author: typescript-node-guardian. Worktree: property-marketing-release. Base commit: 5f48bb2408d4c11f215d9194cd2fc036ae16e4a7.

## Delivered scope

The new server-only `createVercelFinancingClientResolver(environment)` validates the server deployment profile once and returns an async Request-to-Uint8Array resolver. It accepts only a single numeric `x-vercel-forwarded-for` value. It produces versioned family-tagged network-order address bytes for the existing independently keyed native admission HMAC consumer. It neither hashes nor logs, stores or echoes raw addresses. No ordinary forwarding header, request deployment identifier, URL, cookie, browser nonce or generated identity is used as a substitute.

Only the two new adapter source/test files and this handoff were authored. The public runtime, HTTP helpers, Next routes, proxy, config, database, renderer and seven browser-session transplant files remain frozen. The existing default inquiry handler is still unbound and returns 503. No runtime integration, environment write, provider action, live activation, dependency change, Git commit or deployment was performed.

## Explicit server configuration

| Variable | Required value or relationship |
| --- | --- |
| `OALO_FINANCING_CLIENT_IDENTITY_PROFILE` | Exactly `vercel-direct-v1` |
| `OALO_FINANCING_VERCEL_PROJECT_ID` | Server-owned expected `prj_` project ID, bounded to 128 characters |
| `VERCEL_PROJECT_ID` | Exact case-sensitive match to the expected project ID |
| `OALO_FINANCING_VERCEL_ENVIRONMENT` | Explicit `production` or `preview` selection |
| `VERCEL_ENV` | Exact match to the selected platform environment |
| `VERCEL` | Exactly `1` |
| `OALO_ENVIRONMENT` | `production` for platform production; `preview` or `staging` for platform preview |

Missing, unsupported, malformed or mismatched configuration throws the existing sanitized `FINANCING_RELEASE_UNAVAILABLE` error (UNAVAILABLE, 503). Runtime development/local/test profiles refuse setup. Validated values are copied by the schema; later mutations of the supplied object cannot silently change the selected profile. The native admission HMAC key remains independently configured in its existing repository; this adapter reads no key.

## Header and address policy

The accepted header is bounded to 45 characters and validated by Node's `isIP` after a strict numeric lexical check. Commas and coalesced duplicates, paths, CIDR suffixes, zone identifiers, bracketed or IPv4 ports, nonnumeric values and invalid IP syntax are refused. Standard Fetch Headers normalization can remove outer HTTP whitespace before this adapter receives a Request. No raw HTTP field inventory or pre-normalization byte claim is made. Unbracketed numeric IPv6 with a final `:443` group is a legitimate address; it cannot be distinguished from a port intention and is treated as the address Node validates.

IPv4 bytes are `[1,4,...four octets]`; IPv6 bytes are `[1,6,...sixteen octets]`. Equivalent expanded, compressed, uppercase and embedded-dotted IPv6 representations produce the same bytes. IPv4-mapped IPv6 produces the same bucket as IPv4; IPv4-compatible IPv6 remains IPv6. Every call returns a fresh array. The adapter has no cache, database/provider calls, permission policy or user-role fabrication.

## Primary source basis and deployment limits

Vercel documents that it overwrites `x-forwarded-for` to prevent spoofing and that `x-vercel-forwarded-for` is equivalent. It also describes the external-proxy caveat and separately configured Trusted Proxy support. That supports the explicitly selected direct-topology source policy; it does not qualify an unknown proxy arrangement. [Vercel request headers](https://vercel.com/docs/headers/request-headers).

`VERCEL=1` means Vercel system variables are exposed. `VERCEL_ENV` and `VERCEL_PROJECT_ID` are available at runtime. They provide the required server configuration consistency checks, not cryptographic platform attestation. [Vercel system environment variables](https://vercel.com/docs/environment-variables/system-environment-variables). Numeric address validation uses the existing Node runtime API. [Node net.isIP](https://nodejs.org/api/net.html#netisipinput). Mapped address normalization follows the IPv4-mapped address representation. [RFC 4291](https://www.rfc-editor.org/rfc/rfc4291.html#section-2.5.5.2).

Before enabling this profile in a deployment, the owner must qualify the exact Vercel project/environment, direct ingress topology, absence of an unqualified external reverse proxy, and observed platform header behavior including attempted visitor spoofing. Local Requests with these headers and variables are source tests, not deployment evidence. This packet does not claim that hosted ingress, real native PostgreSQL admission, actual signed inquiry capture or configured whole-app serving was exercised. The direct-topology qualification remains open. Arbitrary proxies require a separately engineered and reviewed profile; none is inferred here.

## Verification

- Initial missing-module RED was followed by implementation GREEN. Removing only the exact project identity comparison produced two failing cases; the original source bytes were restored before final verification.
- Final `vitest run --project unit apps/web/src/server/financing-release-vercel-client.unit.test.ts`: 50 cases passed. They cover both families, equivalent representations, mapped versus compatible IPv6, extreme compression/full-width values, duplicate and malformed headers, refusal without the selected header, spoofed alternative metadata, deployment/profile guards, isolated arrays and sanitized errors.
- `tsc --noEmit -p apps/web/tsconfig.json`, focused configured oxlint and Prettier checks passed. Boundary audit passed 16 workspace packages and rejected both prohibited fixture edges. Product-type and secret audits passed. Configured duplication scan found zero clones across 786 files.
- Tests use synthetic project metadata and documentation addresses. No production startup or service call was attempted. The earlier fixture-enabled production startup rejected by automatic approval review remains rejected and unrun; it was not retried.
- Independent Security then Quality review of these exact new files is still required. Root owns any later runtime wiring, combined reviews, CI and Git operations. The domain branch CI reported by root is evidence for its identical browser-session sources, not a property-branch CI pass for this adapter.

## Frozen SHA-256 source inventory

| File | SHA-256 |
| --- | --- |
| `apps/web/src/server/financing-release-vercel-client.ts` | `0d6729835213ed15a2b9328c4d83d5be01e7604e3f81d603e8cc6c1b68cc695f` |
| `apps/web/src/server/financing-release-vercel-client.unit.test.ts` | `4db545ca303162d1304207f6eb94242292baca83a3eb8b6229d8263eb1868222` |

Protected public runtime SHA-256 remains `73682e199e765c23e2c6d9e53d5b0127ca4c5389498e2edf62b9f94e19848bad`. Protected browser-session handoff remains `3d30362f5e18973a61f362c7afd5463e3f1f4794ec2d9e00b696dd1375a3fdc0`.
