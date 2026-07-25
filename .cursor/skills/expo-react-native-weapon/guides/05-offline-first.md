# 05 - Offline-first patterns

ACTION step 5. Implement an app that works without connectivity: a local store + a sync / queue layer, optimistic updates, and conflict handling. The store choice is **per-app**; teach the pattern and the trade-offs, do not hardcode one library. Template: `templates/offline-sync-pattern.md`. Demonstrated in `examples/01-greenfield-app-setup.md`.

Source notes: `research/offline-first/2026-06-29-expo-sqlite-local-store.md` (official store anchor), `research/offline-first/2026-06-29-offline-first-library-landscape.md` (practitioner library landscape; weight as opinion).

## The two layers of offline-first

Every offline-first design separates a **local store** (where data lives on device) from a **sync layer** (how local and server reconcile). Decide them independently.

## Store layer options and when to reach for each

Decision matrix (Source: `offline-first-library-landscape.md`; corroborated facts, "recommended" framing is practitioner opinion, present neutrally):

| Need | Reach for |
|---|---|
| Read-mostly cache, server already exists, minimal new infra | TanStack Query with a persister (MMKV / AsyncStorage) + optimistic updates + a mutation queue. |
| Full SQL control / ORM ergonomics, first-party | `expo-sqlite` + Drizzle ORM, hand-rolled sync (most work, most control). |
| Local-first app, large datasets, multi-device sync, built-in sync protocol | WatermelonDB (reactive, lazy-loading, built-in sync protocol). |
| You control a backend Postgres and want automatic bidirectional sync | A managed sync engine: PowerSync or ElectricSQL (streams Postgres into client SQLite). |
| Raw perf, simple key-value | op-sqlite or MMKV. |

### The first-party default: expo-sqlite

`expo-sqlite` is Expo's first-party local SQLite database (Source: `expo-sqlite-local-store.md`). Async API: `openDatabaseAsync`, `execAsync`, `runAsync`, `getAllAsync`, `getFirstAsync`, `getEachAsync`. React integration: `SQLiteProvider` + `useSQLiteContext`. Official Drizzle ORM integration. A `expo-sqlite/kv-store` drop-in for AsyncStorage exists.

Two rules when using it:
- **Always use prepared / parameterized statements**, never string-concatenated SQL. Prepared statements separate query logic from input (SQL-injection defense).
- The `kv-store` drop-in is **not encrypted**. Secrets still go to `expo-secure-store` (directive 5; `guides/02-native-modules-config-plugins.md`), never to the kv-store.

## Sync layer and the conflict-resolution ladder

The conflict ladder to teach (Source: `offline-first-library-landscape.md`):

1. **Last-write-wins.** Start here. The most recent write replaces the record. Sufficient for the large majority of apps where users edit their own data.
2. **Field-level merge.** Escalate only when users genuinely collaborate on the same records. Merge per field rather than per record.
3. **CRDT.** Only if the app is truly collaborative (concurrent edits to shared documents).

With a managed sync engine (PowerSync / ElectricSQL), the **server is the source of truth** and all clients converge to it once their local changes are accepted.

## The optimistic-update + mutation-queue pattern

The core offline write loop (template in `templates/offline-sync-pattern.md`):

1. **Write locally first** (to the store) and update the UI optimistically.
2. **Enqueue an outbound mutation** in a durable queue (a table in the local store).
3. **On reconnect, flush the queue**: replay each mutation against the server, oldest first.
4. **On server accept**, mark the mutation done and reconcile the local record with the server response.
5. **On conflict**, apply the ladder (last-write-wins by default).
6. **Retry on failure** with backoff; do not drop a mutation silently.

Detect connectivity with the network-state module and trigger the flush on transition to online. Keep the queue durable across app restarts (persist it in the store, not in memory).

## Backend-dependent default (open question)

> TODO: open question -- The offline store default is per-app. If the backend-of-record is Supabase Postgres (which Cuantico uses elsewhere), a sync-engine path (PowerSync / ElectricSQL streaming Postgres into client SQLite) becomes the strong default, because the server-as-source-of-truth model and bidirectional sync come for free. Confirm the backend with the operator before committing a concrete offline example. Source: `research/offline-first/2026-06-29-offline-first-library-landscape.md`.

## Verify before publishing code

> TODO: re-fetch -- The store layer is anchored in official docs (`expo-sqlite`), but the SYNC-loop code is not. Before writing a concrete sync example into a deliverable, fetch a current verbatim example: an `expo-sqlite` + TanStack Query (or hand-rolled push/pull) sync loop, and, if writing a WatermelonDB example, the `@nozbe/watermelondb` sync API from its README. The library-landscape note is practitioner / vendor-sourced (PowerSync is a vendor); present library "recommendations" neutrally.

## Audit checklist for offline-first

- [ ] Store choice is documented with a reason tied to the app's data shape.
- [ ] Writes are optimistic and the mutation queue is durable (survives restart).
- [ ] Conflict policy is stated (last-write-wins by default) and matches whether users share records.
- [ ] Reconnect triggers a queue flush with retry + backoff; no silent drops.
- [ ] SQL is parameterized; secrets are NOT in the local store / kv-store.
