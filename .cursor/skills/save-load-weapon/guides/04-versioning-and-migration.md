# 04 — Versioning and migration

The save schema *will* change between Tier 1 builds — new fields, renamed fields, dropped fields, reshaped sub-objects. A save written by an old build must still load in a new build. That requires a version field read first and an ordered migration ladder run before the model touches runtime.

## The version field

The top-level model carries `int schemaVersion`, and it is the **first thing load reads**:

```csharp
[Serializable] class SaveEnvelope { public int schemaVersion; }   // tiny header probe

int version = JsonUtility.FromJson<SaveEnvelope>(json).schemaVersion;
```

An unversioned save format is a **must-fix** (`guides/00-principles.md` Rule #4). Without it, the first schema change after ship can't tell an old file from a new one and silently mis-reads or discards it.

## The migration ladder

Migrations are **ordered and additive**: v1→v2→v3, each step transforming one version to the next. You never jump v1→v3 directly; you run v1→v2 then v2→v3. This keeps each migration small and testable in isolation.

```
loaded version = 1, current = 3
  → run Migrate_1_to_2
  → run Migrate_2_to_3
  → apply to runtime
```

A migration takes the parsed-or-raw old data and returns the next version's shape. With `JsonUtility`, migrate on the deserialized DTO (keep the old DTO class around, or migrate field-by-field). With Newtonsoft (`guides/02-json-vs-unity-serialization.md`), you can migrate on a `JObject` without keeping every old class — which is why Newtonsoft becomes attractive once the ladder gets long.

See `templates/save-migration.cs` for the interface + runner, and `examples/02-v1-to-v2-migration.md` for a concrete step.

## Schema evolution rules (additive-first)

| Change | Safe? | How |
|---|---|---|
| **Add a field** | ✅ safest | New field gets a sensible default; old saves simply lack it (JsonUtility leaves it at default). A migration can backfill a smarter value. |
| **Rename a field** | ⚠️ needs migration | Read old name, write new name in the v→v+1 step. Never just rename the C# field — old saves lose the value. |
| **Rename a content id** (e.g. `tool_cutter` → `cutter`) | ⚠️ needs migration | Map old id → new id in the migration; this is exactly why ids are saved, not references (`guides/03`). |
| **Change a field's type** | ⚠️ needs migration | Convert explicitly in the step (e.g. int → float, or wrap a scalar into a sub-object). |
| **Drop a field** | ✅ usually | Stop reading it; old saves carrying it are harmless. Only migrate if removal changes the meaning of remaining fields. |
| **Reorder an enum** (`Tier0LoopPhase`) | ❌ dangerous | Pin enum integer values; if you must reorder, a migration must remap old ints. (`guides/02` footgun.) |

**Additive-first** means: prefer adding a new field over reshaping an existing one. The fewer destructive changes, the shorter and safer the ladder.

## Why migration is a Tier 1 problem you design now

There are no shipped saves yet (Tier 0 has no save — `guides/09-tier-discipline-note.md`), so there is nothing to migrate *from*. But the migration discipline must exist **before the first save format ships**, because v1 is only forgiving if v1 was versioned and the runner exists. Designing the ladder now (and stamping the first real format as `schemaVersion = 1`) is the prep; running real migrations is Tier 1+.

## Checklist

- [ ] `schemaVersion` is present, is the first field, and is read before applying.
- [ ] A migration runner exists that steps version-by-version (no version skipping).
- [ ] Each migration step is a separate, individually testable unit.
- [ ] Content-id renames handled in migrations (possible *because* ids are saved, not references).
- [ ] Enum integer values pinned; enum reorders only via explicit remap migration.
- [ ] The first shipped format is stamped `schemaVersion = 1`, even though nothing precedes it.
