# 05 - Realtime and Storage (RLS-gated)

Wiring Realtime channels and Storage buckets with RLS enforcement. Backed by `research/06-realtime-storage.md`.

## Realtime: three features, two authz models

| Feature | What it is | Authz |
|---|---|---|
| Postgres Changes | listen to INSERT/UPDATE/DELETE on a table | ALREADY respects the table's RLS; reuse it |
| Broadcast | low-latency ephemeral messages | RLS on `realtime.messages` |
| Presence | who-is-online state | RLS on `realtime.messages` |

### Postgres Changes (the simplest path)
Records are only delivered to clients allowed to read them by the listened table's RLS. No extra authz to wire: if the table's RLS is correct (`guides/04`), Postgres Changes is correct. Caveat: it filters per subscriber, so it scales worse than Broadcast at high write rates. For high-volume fan-out, prefer Broadcast.

### Broadcast / Presence authorization
Authorization is enforced with RLS policies on the `realtime.messages` table (in the `realtime` schema, managed by Realtime):

```sql
-- allow members of a room to receive/send on its topic
create policy "room members can read"
  on realtime.messages for select
  to authenticated
  using (
    exists (
      select 1 from public.room_members
      where room_id = (realtime.topic())::uuid
        and user_id = (select auth.uid())
    )
  );
```

- Clients must create the channel with `private: true`.
- To enforce private channels, disable "Allow public access" in Realtime Settings.
- On join, Realtime loads the JWT claims into a transaction, inserts a probe into `realtime.messages`, checks the policy, and rolls back. The probe is never delivered; it only tests the policy.

## Storage: RLS on storage.objects

Buckets are public or private. Access is governed by RLS policies on `storage.objects` (and `storage.buckets`). Scope by `bucket_id` and path segments via `storage.foldername(name)`:

```sql
-- a user can only touch objects under a folder named for their uid
create policy "user owns their folder"
  on storage.objects for all
  to authenticated
  using (
    bucket_id = 'user-files'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'user-files'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
```

### Public vs private buckets
- A PUBLIC bucket serves reads WITHOUT RLS. Never put private data in a public bucket and rely on obscurity.
- For private data: use a PRIVATE bucket and serve via time-limited signed URLs (`createSignedUrl`).

## Verify

- Realtime: join the private channel as an authorized user (should succeed) and as an unauthorized user (should be denied).
- Storage: as user A, attempt to read user B's object (must fail); read your own (must succeed). Use a real user token, not the service-role client.

## Boundary

This guide wires the channels/buckets and their RLS and proves enforcement. The completeness of the policy set against the threat model is security-guardian's audit. The underlying table design (e.g. `room_members`) is db-guardian's.
