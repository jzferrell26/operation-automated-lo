# Self-service domains for the five funnels

Owner request: complete the project and finish customer-domain setup, October 7, 2026.
Base: merged reference-led release `728d5f0e`. Branch: `chief/custom-domain-onboarding-2026-10-07`.
Status: implementation in progress, not deployed or live-qualified.

## Customer outcome

Settings -> Domains -> enter the domain or subdomain -> prove control with a DNS record -> connect hosting -> verify HTTPS -> use the five published funnel journeys on that domain. The customer keeps the existing field-only editor. No separate Vercel account, page builder or per-funnel hosting project is required. A subdomain is the recommended default so the existing website and email remain untouched.

## Authority and lifecycle

Domain control requires an exact `_automatedlo.<hostname>` TXT challenge for the signed-in publisher, even if Vercel already considers the domain verified for the platform team. Pending claims must not globally reserve a domain before control is proved. Only one proved owner may route it. An unknown, disconnected, stale or unverified host must never show authenticated application pages or another publisher's funnel. Existing platform-hosted URLs and immutable publication snapshots remain unchanged.

Use the Vercel API with a dedicated server-side domain-management credential and explicit project/team IDs. Never move an existing domain to another project, buy a domain, edit nameservers, touch MX records or overwrite an existing redirect. Display Vercel's actual recommended DNS values, not a remembered generic CNAME. Ownership, routing and TLS are separate checks. TLS verification connects only to a previously resolved public address with the original hostname as SNI, validates the certificate and sends no credentials.

Disconnect must stop domain routing immediately. Revocation and inquiry export continue to work independently of provider availability. Retained domain-verification data must be rechecked on a bounded schedule. New DNS proof is required for a later connection; old links must never be repointed to another customer's content.

## Completion evidence

The implementation must include the setup UI, persistent owner binding, exact-host public routing, same-origin submissions, receipt and follow-through pages, conflict/retry states, bounded rechecks, and tests for cross-tenant requests, unverified hosts, stale proof, disconnect and SSRF prevention. A configured Vercel API or a successful certificate alone is not an end-to-end test. Validate an owned test hostname through publication and a synthetic visitor request before declaring hosted completion.

## Current access constraint

At this authoring checkpoint the desktop bridge returns `tunnel_client_not_seen`, and the Vercel connector rejects access to the known `jonathan-ferrell` team. GitHub source access and branch writes work. Continue through GitHub without changing another team's project or weakening gates. No successful local build, migration, DNS provisioning or production deployment is implied by this branch.

## Primary references checked October 7

- [Vercel custom-domain setup](https://vercel.com/docs/domains/set-up-custom-domain): use the specific recommended records and verify TLS separately.
- [Vercel API authentication](https://vercel.com/docs/rest-api): server-held access token and explicit team scope.
- [Adding domains](https://vercel.com/docs/domains/working-with-domains/add-a-domain): A/CNAME and ownership challenges.
