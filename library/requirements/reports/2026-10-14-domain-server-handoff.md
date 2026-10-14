# Customer domain server handoff

Date: October 14, 2026 UTC. Base:6b7afbec. Source author: domain_server_completion, TypeScript Guardian. Root transcribed the released author packet for independent Security. This transcription is not an independent review or real database proof.

## Implemented source

The packet adds saved domain claims, exact server-issued TXT challenges, one current verified owner with atomic revision checks, fixed project/team provider checks, bounded DNS/TLS checks, authenticated lifecycle operations and independent exact-host publication/inquiry checks. Pending claims do not globally reserve the host. Disconnect stops routing without requiring the provider. Customer hosts cannot render authenticated application pages, including prefetch paths. Existing visitor encryption, receipt derivation, consent and HighLevel delivery are retained.

API: GET /api/funnel-domains returns available, canEdit and domain. POST accepts the existing strict DomainCommandSchema actions connect/check/disconnect. Records include challengeExpiresAt and nextCheckAt. readCurrentDomainBinding supplies current authority for a future public-financing consumer. The implemented customer-host path allowlist covers /f UUID steps, inquiry POST, Next static assets and the two existing funnel hero assets.

## Verification reported by source author

The final focused set passed67 tests across8 unit files. Web types, scoped lint, formatting, boundaries, product-types, secrets and diff checks passed. Production build passed all16 workspace tasks, including Next16.3.8 route generation. Six real-PostgreSQL cases and11 pgTAP checks are authored but locally unrun because the local Docker Linux pipe is unavailable. Canonical CI must execute them; no mock or source inspection replaces that gate.

Current provider routes/response fields were checked against primary [project-domain documentation](https://vercel.com/docs/rest-api/projects/get-a-project-domain), [add-domain documentation](https://vercel.com/docs/rest-api/projects/add-a-domain-to-a-project), [verification documentation](https://vercel.com/docs/rest-api/projects/verify-project-domain) and [configuration SDK source](https://github.com/vercel/sdk/blob/main/src/funcs/domainsGetDomainConfig.ts). These are source references, not actual provider execution.

## Required consumers and release evidence

Guided Settings Domains UI, autonomous recheck worker, hostname-root default redirect and owned-host DNS/TLS/browser qualification remain open. The server persists nextCheckAt and refuses routing after72 hours of ownership expiry; it does not renew proof automatically. No whole FUN criterion, deployed host, provider provisioning, database migration execution or customer journey is declared complete.

Root owns Security then fresh Quality, Git/current-main/MERGEABLE and actual CI. The source author released all files without committing, pushing, deploying or making live provider calls.

## Released source SHA-256 pins

| Path | SHA-256 |
| --- | --- |
| apps/web/src/features/domains/model.ts | f0d9de4c4a2c74b2e0e889ec098d9116298f1f98c2dcdc9028ff79fad28ea892 |
| apps/web/src/features/domains/model.unit.test.ts | 46a91a06d44b1c7d6c6a7de5b5117026808460bf6b0010f6e1cdba926d122193 |
| apps/web/src/server/funnel-domain-provider.ts | 6285b349935133927283c8a8c46860aa5a7d4f82859619c02a69fcb80b75d279 |
| apps/web/src/server/funnel-domain-provider.unit.test.ts | d5df298916285b308db1cfe3f3edaab64c08a104c76474c7428018247488aebe |
| apps/web/src/server/funnel-domain-store.ts | fbdd97fd032a4f4fb630f6986a6d42db3488f739f132b0c2e5ae1c5112493e92 |
| apps/web/src/server/funnel-domain-store.unit.test.ts | a47ca5a44e5e28a7058fa69756f08a227c22e41d57f9e111206231e35c94c50f |
| apps/web/src/server/funnel-domain-http.ts | 2117ca07fbbe81b8d47e78e473fa779595777e51cfee58a0ce5d8cb41717f1c4 |
| apps/web/src/server/funnel-domain-routing.ts | 646c32155c7c65d4344f95613c01180579fc55d5ffe1fb8f0e791e069072218e |
| apps/web/src/server/funnel-domain-routing.unit.test.ts | 37342048ee76622ecf35089109fa0a02bea799deed98490273d822f297dccf87 |
| apps/web/src/server/funnel-domains.postgres.test.ts | 29f6e2d7bd2818a08d8dfc366545bb530c5b1e78dc3bf49335f27453a1888337 |
| apps/web/src/server/funnel-public-store.ts | 013836eeb96f8673fdcaffb3a3d62d0c27c0798ada7acb87a51384e324207360 |
| apps/web/src/server/funnel-public-http.ts | f7f96ab84d6465339fbd2219b39def27427e017eccddc4a7f998e45d4fe9b7d2 |
| apps/web/src/proxy.ts | f5fb924e00d8a4d71220f1f990eef8f14ceab3c3d1eadab939482ea5d15f3782 |
| apps/web/src/proxy.domains.unit.test.ts | 50627fa3cb2fe870f8fb081fa421cc896b6dd9964f9f73842577e7e13ef639b6 |
| apps/web/src/app/api/funnel-domains/route.ts | e36802c36661b9d515d084ef19b9e51ca38a2931bbc9160d79c924fbad948b3d |
| apps/web/src/app/(public)/f/[id]/[[...step]]/page.tsx | a75362ba56cf9b622fba9fe89b0cec05ffb83f0d2cd67f080c26d2f382c0fb92 |
| supabase/migrations/20261014060000_funnel_domains.sql | a8c2f463a5a9289601a780b3e919b3109d8b72b99d750f5f4169d9d7a2b391cd |
| supabase/tests/funnel_domains.pgtap.sql | ac043996cb3c28cbf5e3da83d4fe52719d8320edda1ef8415890fb646928b300 |
