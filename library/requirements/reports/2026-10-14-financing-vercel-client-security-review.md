# Security review: direct Vercel financing client adapter

Date: 2026-10-14. Independent reviewer: security-guardian. Worktree: property-marketing-release. Scope: the two frozen adapter files and their handoff. Ownership: this report only.

## Executive summary

Scoped PASS, cleared for fresh independent Quality. No Critical, High, Medium or Low finding detected in this two-file packet. All 50 existing unit cases pass independently. The adapter accepts one bounded numeric platform header under an explicitly selected, consistent server deployment profile and returns canonical address bytes. It introduces no handler activation, database mutation, raw-address persistence or provider operation.

This is source qualification for the stated direct Vercel topology. Hosted ingress qualification, runtime integration and actual native admission/capture qualification remain open. Environment variables are configuration consistency checks, not cryptographic platform attestation. The existing default inquiry handler still returns 503 before constructing its runtime or reading the inquiry body.

The managed Security Weapon and integrated authorization/PII procedures apply. Its CVE intelligence last refreshed 2026-04-24 remains beyond 120 days and needs a separate refresh. This delta adds no dependency. Current primary Vercel and exact Node runtime documentation were read for this source policy. Broad scanner external audits and writes are outside this bounded brief. No new payload, probe, hosted request, credential read, database execution, provider call, startup, source repair, Git operation or ledger edit occurred. No earlier Quality review of this new adapter packet was present; prior reviews concern separate frozen packets.

## Surface coverage checklist

### Configuration and authority

None detected. financing-release-vercel-client.ts:6-19 bounds the expected project identifier and selects exactly vercel-direct-v1, production or preview, VERCEL=1 and supported application environments. Lines 58-69 require exact case-sensitive project and platform-environment equality plus application/environment consistency. Missing, malformed, mismatched, development/local/test setup refuses with the existing sanitized UNAVAILABLE/503 error. Parsed configuration is copied rather than retaining mutable caller authority.

No visitor URL, deployment-looking header, nonce, cookie, generated identity or ordinary forwarding header can satisfy these server configuration checks. The configuration alone cannot prove actual platform ingress. That separate operational qualification is stated in the source comment at lines 53-56 and retained below.

### Header boundary and bounded parsing

None detected. Lines 71-78 read only x-vercel-forwarded-for. A missing value, value over 45 characters, nonnumeric lexical form or invalid Node IP syntax refuses. Coalesced duplicate values contain commas and refuse. The source neither selects the first item from a forwarding chain nor substitutes x-forwarded-for/x-real-ip, request URL, cookie or deployment identifier. Standard Fetch Headers may normalize outer whitespace before this adapter sees it; these tests do not prove raw HTTP field preservation. A numeric unbracketed IPv6 suffix is treated as address syntax validated by Node, rather than guessed to be a port.

Current official Vercel documentation describes overwriting forwarded client IP input to prevent spoofing, x-vercel-forwarded-for equivalence, and separate proxy/Trusted Proxy considerations. This supports the declared direct-ingress policy; it does not establish the actual deployment topology. [Vercel request headers](https://vercel.com/docs/headers/request-headers).

The required system variables are documented as available at runtime. VERCEL=1 indicates exposure of system environment variables. These documented meanings support the consistency checks without upgrading them to signed attestation. [Vercel system environment variables](https://vercel.com/docs/environment-variables/system-environment-variables).

### Canonical bytes and admission input

None detected. Lines 25-50 parse only after Node validation, with bounded IPv4 octets or eight expanded IPv6 groups written in network byte order. Lines 77-84 include version/family tags, normalize equivalent compressed/expanded/case/dotted IPv6 representations and fold IPv4-mapped IPv6 into the same IPv4 bytes. Compatible IPv6 remains its own family. Returned arrays are fresh; there is no shared mutable bucket or cache.

Node v24.18.0 documents isIP returning the address family for valid numeric forms and zero for invalid forms, including IPv4 with leading zeros or CIDR suffixes. [Node v24.18.0 net.isIP](https://nodejs.org/download/release/v24.18.0/docs/api/net.html#netisipinput). The mapped-prefix check matches the RFC-defined zero/FFFF/IPv4 layout. [RFC 4291, section 2.5.5.2](https://www.rfc-editor.org/rfc/rfc4291.html#section-2.5.5.2).

This output is address material for the existing independent keyed HMAC consumer, not a user principal, permission or authentication token. The adapter adds no HMAC key, SQL admission policy or retention operation. Native concurrency and the separately active timezone repair are excluded from this review.

### Secrets, PII and financial data

None detected. No log, persistence, response serialization, telemetry, key read or database/provider call exists in the adapter. Raw IP bytes remain in memory for the intended admission consumer. Lines 21-23 expose only the fixed application error; tests verify rejection text omits address and project detail. Tests use synthetic project metadata and documentation addresses. No customer balance, contact, inquiry payload, credential or card handling is added.

### HTTP, SSRF, injection and provider boundaries

None detected in this delta. There is no network transport, arbitrary host/path, HTML/SQL generation, body parser, signature verifier, cookie writer or role mutation. Request URL and alternative headers are not identity fallback inputs. Source search finds the new resolver only in its declaration and unit tests. The protected public runtime remains byte-identical and its default inquiry refusal at financing-release-public-runtime.ts:401 remains in place.

### Dependencies, generated code and guard preservation

None detected in this delta. Existing Node and Zod imports are reused; no manifest, lockfile, route, proxy, renderer, font, artifact, SQL, fixture cleanup or browser-session source is changed by this packet. Explicit environment and address validation, bounded allocation and sanitized errors are present. Existing boundary, product-type and secret audits pass independently. Full branch CVE, deployment, production and mutable database qualification are not inferred from this source review.

## Findings and remediation

Critical: None detected. High: None detected. Medium: None detected. Low: None detected in the two-file scope. No remediation required. Only this new report was authored.

| Severity | Count | Fixed by reviewer |
| --- | --- | --- |
| Critical | 0 | 0 |
| High | 0 | 0 |
| Medium | 0 | 0 |
| Low | 0 | 0 |

## Independent verification

| Check | Result |
| --- | --- |
| Existing adapter unit suite, Vitest unit project | 50 passed, exit 0 |
| Web TypeScript, tsc --noEmit -p apps/web/tsconfig.json | Passed, exit 0 |
| Focused configured oxlint for both files | Passed |
| Focused Prettier for both files | Passed |
| Secret audit | Passed across six source roots and public environment boundary |
| Boundary audit | Passed for 16 packages; two prohibited fixture edges rejected |
| Product type audit | Passed |
| Source, test and handoff hashes | All match frozen pins |
| Protected public runtime hash | Matches retained 73682e pin; default inquiry remains unbound |
| Runtime integration search | Only declaration/test references found |

The author-reported mutation RED/GREEN and configured duplication scan are attributed evidence, not additional reviewer execution. No live service, PostgreSQL admission, actual inquiry capture, hosted spoofing attempt or whole-app production startup was run by this review.

## Frozen inventory

| File | SHA-256 |
| --- | --- |
| apps/web/src/server/financing-release-vercel-client.ts | 0d6729835213ed15a2b9328c4d83d5be01e7604e3f81d603e8cc6c1b68cc695f |
| apps/web/src/server/financing-release-vercel-client.unit.test.ts | 4db545ca303162d1304207f6eb94242292baca83a3eb8b6229d8263eb1868222 |
| library/requirements/reports/2026-10-14-financing-vercel-client-handoff.md | 3440661288ab5ff2afa2b9ab77b0fd6fdc80e8e28dd1f2c885d8b17cb764bc22 |
| apps/web/src/server/financing-release-public-runtime.ts, retained supporting boundary | 73682e199e765c23e2c6d9e53d5b0127ca4c5389498e2edf62b9f94e19848bad |

## Release limits and handoff

Proceed to fresh independent Quality for these exact two source pins. Root owns later combined runtime wiring, reviews, canonical CI, Git and deployment. Before enabling this profile, qualify the actual expected Vercel project/environment, direct ingress, absence of an unqualified reverse proxy and platform overwrite behavior against attempted visitor header spoofing. Arbitrary proxy arrangements need a separately engineered and reviewed profile. Local synthetic Requests and matching variables do not provide that evidence.

The previous combined runtime/admission Security report d950081dd54e1a1fa9f2ef8f3f4cac969c86dee11c2f765e56120a2d32c6e2fb remains historical evidence for its frozen scope. Root subsequently reported native America/Chicago retention failures and assigned the active SQL/timezone repair to another owner. That mutable packet was not inspected, modified or approved here and requires its own fresh Security then Quality after freeze. Separate publisher holds, original render qualification limits and pending provider effects are not cleared by this adapter review.

Automatic approval review rejected the prior configured whole-app startup using fixture DB/R2 hooks and an activation flag with the stated reason "blocked by policy." That action remains unrun and was not repackaged or retried.
