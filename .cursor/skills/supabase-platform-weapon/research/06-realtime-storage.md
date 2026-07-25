---
source_type: official-docs + blog
authority: high
relevance: medium-high
topic: realtime-storage
sources:
  - https://supabase.com/docs/guides/realtime/authorization
  - https://supabase.com/docs/guides/realtime/postgres-changes
  - https://supabase.com/docs/guides/realtime/broadcast
  - https://supabase.com/blog/supabase-realtime-broadcast-and-presence-authorization
  - https://supabase.com/docs/guides/storage/security/access-control
date_captured: 2026-06-27
---

# Realtime + Storage: production wiring and gotchas

## Realtime: three features
- **Postgres Changes** - listen to INSERT/UPDATE/DELETE. ALREADY respects RLS on the listened table: records are only sent to clients allowed to read them. This is the simplest authz path; reuse the table's RLS.
- **Broadcast** - low-latency ephemeral messages.
- **Presence** - who-is-online state.

## Realtime authorization (Broadcast + Presence)
- Authorization is enforced via RLS policies on the `realtime.messages` table (in the `realtime` schema, managed by Realtime).
- Clients set `private: true` when creating the channel. To enforce private channels, disable "Allow public access" in Realtime Settings.
- On channel join, Realtime loads the JWT claims into a Postgres transaction (via `set_config`), inserts a probe message into `realtime.messages`, checks the RLS policy, and rolls back. The probe is never delivered; it only tests the policy.
- So: to gate a channel topic, write an RLS policy on `realtime.messages` keyed on `realtime.topic()` and the user's claims.

### Gotcha
Postgres Changes scales worse than Broadcast at high write rates (every change is filtered per subscriber). For high-volume fan-out, prefer Broadcast (optionally Broadcast-from-Database via triggers) over Postgres Changes.

## Storage
- Buckets are public or private. Access is governed by RLS policies on `storage.objects` (and `storage.buckets`).
- A policy scopes by `bucket_id` and path segments via `storage.foldername(name)` / `(storage.foldername(name))[1]`.
- Common pattern: a user can only read/write objects under a folder named for their uid:
  ```sql
  create policy "user owns folder"
    on storage.objects for all
    to authenticated
    using ( bucket_id = 'user-files'
            and (storage.foldername(name))[1] = (select auth.uid())::text );
  ```
- Private objects are served via signed URLs (`createSignedUrl`), time-limited. Public buckets serve directly.

### Gotcha
A "public" bucket still ignores RLS for reads, so do not put private data in a public bucket and rely on obscurity. Use a private bucket + signed URLs.
