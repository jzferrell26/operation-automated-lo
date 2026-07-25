# 05 - Idempotency: manifest, dry-run, read-back, resume

Why the manifest machinery exists, and exactly how to build it. The one-line justification: POST is not idempotent by default, so a retried create makes a DUPLICATE post (`research/idempotency/2026-06-29-idempotency-keys-rest-api.md`).

## Why a client-side manifest (not a server header)

Neither GHL nor Zernio documents a server-side `Idempotency-Key` header (`research/idempotency/2026-06-29-idempotency-keys-rest-api.md`). GHL has a partial server-side signal: it rejects "duplicate content posted within 12 hours" (`research/ghl-social-planner/2026-06-29-ghl-failed-post-error-causes.md`). But that is content-based and time-boxed, not a reliable idempotency key, and a re-run within 12h with identical content might be silently rejected as duplicate, which a naive caller could misread as success. So the CLIENT-SIDE manifest is load-bearing. Do not rely on GHL's 12h duplicate rule for idempotency.

If/when a provider DOES expose an `Idempotency-Key` header, layer it on top of the manifest (belt and suspenders).

## The manifest key

Compute a deterministic key per logical post so dry-run, first run, and resume all derive the SAME key:

```
key = hash(provider + locationId + accountIds + summary + media + scheduleDate)
```

or a caller-supplied stable post-key. Store the real returned post id against that key:

- GHL: `results.post._id`
- Zernio: the post id from the `/posts` create response

A re-run that finds a key already mapped to an id is a no-op for that post (the `--resume` behavior).

## The push pattern (dry-run -> checkpoint -> resume)

This is a textbook checkpoint/resume batch pattern; the manifest IS the checkpoint store (`research/idempotency/2026-06-29-dry-run-checkpoint-resume-pattern.md`).

1. DRY-RUN. Print the full plan (each post -> target accountIds, media URL, `status=draft`) and STOP. No create calls. This is the high-stakes preview and the publish gate (see `guides/01-publish-gate.md`). If any planned post shows a non-draft status, the dry-run catches it before any create fires.
2. PUSH ONE TEST POST. Create a single post, then read it back by id (GHL: `GET .../posts/{id}`) and confirm `status=draft`, the account count, and the media count. Only proceed if the read-back passes.
3. CHECKPOINT. After EACH successful create, write the real post id to the manifest IMMEDIATELY (persist per-post, not at the end of the batch). If the batch dies at post 40 of 50, posts 1-39 are already recorded.
4. PUSH THE REST.
5. RESUME. On re-run, read the manifest and SKIP every post whose key already has a recorded id. A 50-account fan-out that failed at account 40 resumes at 41, not 1. This prevents double-posting AND avoids tripping GHL's duplicate-content rejection.
6. CLEANUP (optional). Mark the manifest complete after the full batch reads back clean.

## Read-back is verification, not optimism

A 201 create proves only that GHL accepted the request. It does NOT prove:

- the stored `status` (read back to confirm `draft`)
- that the post will publish (a created post can still FAIL at publish time: expired account token, oversized media, duplicate-in-12h, policy violation; `research/ghl-social-planner/2026-06-29-ghl-failed-post-error-causes.md`)

So the verification step GETs the post by id and inspects `status`, `accountIds`, `media`, and any failure-reason field. Treat "created but failed to publish" as a distinct failure class from "create 422'd": the detector is the read-back GET, the diagnostic is the failure-reason field. Prefer GET-by-id over `/posts/list` (list is eventually-consistent and its date filter drops date-less drafts; see `guides/04-create-post-payload.md`).

## Manifest shape

See `templates/push-manifest.json` for the full skeleton. Minimum per entry: the manifest key, provider, locationId/accountIds, the real post id, the read-back status, and a timestamp.

## See also

- `templates/push-manifest.json`
- `guides/01-publish-gate.md` (dry-run as the gate)
- `guides/04-create-post-payload.md` (the nested id path, list quirks, delete)
- `examples/01-ghl-drafts-push.md` (manifest + resume in a run)
