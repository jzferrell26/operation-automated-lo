---
source_url: https://docs.stripe.com/api/idempotent_requests
retrieved_on: 2026-06-29
source_type: official-docs
authority: official
relevance: high
topic: idempotency
weapon: social-publishing-weapon
---

# Idempotency keys for safe POST retries (Stripe + AWS + RFC consensus)

## Summary
Cross-source consensus on idempotency-key design for POST create endpoints (Stripe API ref, AWS Builders' Library, the Idempotency-Key RFC, Zuplo guide). The arsenal weapon's idempotency invariant is a CLIENT-SIDE manifest (parse the real post id, write a manifest, resume). This source grounds that pattern in industry best practice and gives the design parameters (key generation, storage, expiry) weapon-forge needs to author the manifest spec rigorously.

## Key quotations / statistics
- "The POST method is not idempotent by default - every time you send a POST request, it usually creates a new resource or triggers a new action." (This is exactly why a social-post create needs dedupe: a retried create = a duplicate post.)
- Pattern: client generates a unique token (commonly an `Idempotency-Key` header), server stores key + response and skips duplicate processing on key reuse.
- Key generation: UUIDs or random strings with >= 128 bits of entropy, generated client-side BEFORE sending.
- Expiration: align with business need; "a 24-hour expiration balances storage vs reliable retries"; critical ops may use longer.
- Storage: use atomic operations (DB transactions or Redis) to prevent race conditions when storing keys.
- Sources converge: Stripe, Adyen, Chargebee, AWS Builders' Library, httptoolkit (RFC).

## Annotations for weapon-forge
- GROUNDS THE MANIFEST PATTERN: GHL, Zernio, Ayrshare, Blotato do NOT all expose a server-side idempotency-key header (Zernio's positioning page did not document one; GHL does not). So the arsenal's CLIENT-SIDE manifest is the correct primary defense: before creating, check the manifest for an already-pushed entry keyed by a content+account hash; skip if present (the --resume behavior).
- DESIGN PARAMETERS for the manifest spec: key = a deterministic hash of (provider + locationId + accountIds + summary + media + scheduleDate) OR a caller-supplied post-key. Store the real returned post id (GHL: results.post._id; Zernio: the post id from /posts) against that key. This makes a re-run a no-op for already-pushed posts.
- If/when a provider DOES support an Idempotency-Key header, layer it on top of the manifest for double safety (belt and suspenders). weapon-forge should note GHL/Zernio do not currently document one, so the manifest is load-bearing.
- The "POST is not idempotent" fact is the one-line justification for why the whole manifest + dry-run + resume machinery exists; use it to open the idempotency guide.
