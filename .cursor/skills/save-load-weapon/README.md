# save-load-weapon

The procedural arsenal for `save-load-guardian`, DRIFT's local on-device persistence specialist (Unity 6, C#, mobile) for Tier 0–1.

## What this weapon covers

- **Tier discipline** — why save is `[NOT STARTED]` and intentionally deferred (GDD §3 gray-box, CLAUDE.md §3/§7, Hard Rule #1); design-only by default
- **Save model vs runtime** — a dedicated `[Serializable]` model distinct from `MonoBehaviour`/`ScriptableObject`; capture on save, apply on load
- **Stable IDs, never references** — serialize `ItemDefinition.id` / `Tier0Balance` constants; rehydrate via `ItemDatabase.TryGetById`
- **JSON vs Unity binary** — `JsonUtility` vs Newtonsoft vs binary `FileStream`; trade-offs and the pick
- **Schema + versioning + migration** — `schemaVersion`, ordered v1→v2 migration ladder, additive-first evolution
- **Atomic writes + corruption** — temp + rename, flush, `.bak` backups, load fallback chain, never hard-crash
- **Save slots + metadata** — a metadata header readable without loading the full save
- **persistentDataPath + platforms** — the one correct writable mobile path; never `dataPath`/hardcoded
- **EditMode round-trip testing** — round-trip + migration tests under the Awake-less convention (Rule #11)

## Reading order

1. Read `SKILL.md` — master index, hard rules, severity rubric, routing table, output paths
2. Read `guides/09-tier-discipline-note.md` — the tier gate; decide design-only vs. elevated BEFORE anything else
3. Read `guides/00-principles.md` — the eight non-negotiable principles
4. Open the guide matching your task (see the routing table in `SKILL.md`)
5. Reference `research/research-plan.md` if you need the authoritative Unity source for a claim

## Key rule

**Default to design, not code.** Save/load is deferred to Tier 1 — the gray-box deliberately ships with no save (GDD §3). Produce the clean design, the ADR, the migration plan. Only build the save layer when the user *explicitly* elevates scope past the Tier 0 gate. And when you do design it: **serialize stable string IDs, never object/SO references** — that is the one rule that keeps a save loadable across every future rebuild.
