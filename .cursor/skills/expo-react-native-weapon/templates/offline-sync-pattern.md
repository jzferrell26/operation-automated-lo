# Offline-first sync pattern (fill-in note)

See `guides/05-offline-first.md`. This is a planning stub to fill in once the store and backend are chosen. Do NOT paste a sync-loop code example until you have re-fetched a current verbatim one (see the TODO re-fetch in guide 05).

## 1. Decide the two layers

- **Store layer:** {{store_choice}} (expo-sqlite + Drizzle / TanStack Query + persister / WatermelonDB / PowerSync or ElectricSQL / op-sqlite). Reason: {{why}}.
- **Sync layer:** {{sync_choice}} (hand-rolled push/pull / WatermelonDB sync protocol / managed sync engine).
- **Backend of record:** {{backend}}. If Supabase Postgres, default to a sync engine (PowerSync / ElectricSQL).

## 2. Conflict policy

- Default: last-write-wins.
- Escalate to field-level merge only if: {{do_users_share_records}}.
- CRDT only if truly collaborative (concurrent edits to shared documents).

## 3. The write loop (optimistic + durable queue)

1. Write locally first; update UI optimistically.
2. Enqueue an outbound mutation in a durable queue (a table in the store, survives restart).
3. On reconnect, flush oldest-first against the server.
4. On accept, mark done; reconcile local record with the server response.
5. On conflict, apply the ladder (last-write-wins by default).
6. Retry on failure with backoff; never drop a mutation silently.

## 4. Rules

- Parameterized / prepared SQL only. Never string-concatenate.
- Secrets do NOT live in the store or kv-store. Tokens -> expo-secure-store (directive 5).
- Connectivity detection triggers the flush on transition to online.

## 5. Open question to resolve first

> TODO: open question -- Confirm the backend of record with the operator before committing the store. Supabase Postgres backend -> sync engine is the strong default.
