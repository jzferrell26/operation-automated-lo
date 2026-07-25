---
source_url: https://docs.expo.dev/versions/latest/sdk/sqlite/
retrieved_on: 2026-06-29
source_type: official-docs
authority: official
relevance: high
topic: offline-first
weapon: expo-react-native-weapon
---

# expo-sqlite local store for offline-first (official Expo docs)

## Summary
expo-sqlite is Expo's first-party local SQLite database, the official-docs anchor for the offline-first store layer. It exposes an async SQLite API (`openDatabaseAsync`, `execAsync`, `runAsync`, `getAllAsync`, `getFirstAsync`, `getEachAsync`), a React integration (`SQLiteProvider` + `useSQLiteContext`), official Drizzle ORM integration, and a `kv-store` drop-in replacement for AsyncStorage. Prepared statements are emphasized for SQL-injection defense.

## Key quotations / statistics
- Provides "access to a database that can be queried through a SQLite API" with data persisting across app restarts.
- APIs: `openDatabaseAsync()` / `openDatabaseSync()` (open connections), `execAsync()` (batch SQL), `runAsync()` (INSERT/UPDATE/DELETE), `getAllAsync()` (full result set), `getFirstAsync()` (single row), `getEachAsync()` (incremental iteration).
- React integration: `SQLiteProvider` component + `useSQLiteContext()` hook "for providing database access throughout component trees without prop drilling."
- ORM: "Drizzle ORM integrates with expo-sqlite"; official integration guide in Drizzle's docs; the library "enables broader integrations with third-party libraries."
- `expo-sqlite/kv-store` is "a drop-in replacement for" AsyncStorage; `localStorage` compatibility via `expo-sqlite/localStorage/install`.
- Security: prepared statements "explicitly separate a SQL query's logic from its input parameters" (SQL-injection defense).

## Annotations for weapon-forge
- This is the official-docs backbone for the offline-first store guide; pair with the library-landscape note (WatermelonDB / PowerSync / op-sqlite trade-offs). expo-sqlite + Drizzle is the recommended "first-party, full SQL control" default; the landscape note covers when to reach for a sync engine instead.
- The `kv-store` drop-in for AsyncStorage is a useful migration tip; but remember it is NOT encrypted - secrets still go to expo-secret-store (directive 5).
- Prepared-statements note matters for the offline mutation-queue code examples; show parameterized queries, never string-concatenated SQL.
- For the SYNC layer on top of expo-sqlite, weapon-forge should fetch a current expo-sqlite + TanStack Query (or a hand-rolled push/pull sync) example at build time; this page is the store layer only.
