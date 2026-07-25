# 10 — Test Doubles & Fixtures

DRIFT doesn't use a mocking framework. It builds real, lightweight objects in code and tears them down deterministically. This guide is the fixture vocabulary the ten suites share.

## The `Track` + `[TearDown]` fixture (every suite)

The core pattern: a `List<Object>` records everything created; `[TearDown]` disposes it with `DestroyImmediate`. From `RuntimeOxygenTests.cs`:

```csharp
readonly List<Object> _created = new();

[TearDown]
public void TearDown()
{
    for (var i = 0; i < _created.Count; i++)
        if (_created[i] != null)
            Object.DestroyImmediate(_created[i]);   // EditMode-legal; Destroy would throw
    _created.Clear();
}

T Track<T>(T value) where T : Object { _created.Add(value); return value; }
```

Usage threads through the helpers:

```csharp
OxygenSystem CreateOxygen() => Track(new GameObject("OxygenOnly")).AddComponent<OxygenSystem>();
```

Both the `GameObject` and any `ScriptableObject` instance get tracked. This is the entire test-isolation strategy: no test sees state from another (`SKILL.md` Hard Rule #10).

`RuntimeSpawnerTests` is the exception — it builds a whole world via `Tier0RuntimeSpawner.Build()`, so its `[TearDown]` sweeps *all* GameObjects:

```csharp
var objects = Object.FindObjectsByType<GameObject>(FindObjectsSortMode.None);
for (var i = 0; i < objects.Length; i++) Object.DestroyImmediate(objects[i]);
```

Use the targeted `Track` list for focused tests; the sweep only for whole-world spawner tests.

## Code-built ScriptableObject content (the "data double")

DRIFT's content is ScriptableObjects (`ItemDefinition`, `RecipeDefinition` — CLAUDE.md Rule #3). Tests build them in code with `ScriptableObject.CreateInstance<T>()` rather than loading authored assets. From `RuntimeInventoryTests.cs`:

```csharp
ItemDefinition MakeItem(string id, string displayName, ItemCategory category,
                        int stackMax = 999, int durabilityMax = 0)
{
    var item = Track(ScriptableObject.CreateInstance<ItemDefinition>());
    item.id = id;
    item.displayName = displayName;
    item.category = category;
    item.stackMax = stackMax;
    item.durabilityMax = durabilityMax;
    return item;
}

RecipeDefinition MakeRecipe(ItemDefinition output, params CraftCostEntry[] ingredients)
{
    var recipe = Track(ScriptableObject.CreateInstance<RecipeDefinition>());
    recipe.output = output;
    recipe.outputAmount = 1;
    recipe.ingredients = ingredients;
    return recipe;
}
```

This is also **why the suite can't run under plain `dotnet`/`mono`**: `ScriptableObject.CreateInstance` requires the Unity runtime (`AGENTS.md`). It's a Unity-batchmode-only suite by construction.

`Tier0RuntimeSpawner` uses the *same* `CreateInstance` pattern in production (`CreateRuntimeDatabase`), so tests and runtime build content identically — keeping the "data double" faithful.

## Configure-based dependency injection (the seam)

Instead of mocks, DRIFT injects real collaborators via `Configure(...)` (Pattern 2, `guides/03-editmode-safe-design.md`). The test controls the graph:

```csharp
// RuntimeEnemyTests.cs — inject a real player transform + spawn anchor
enemy.Configure(player.transform, Vector3.zero);

// To test the leash, just move the injected anchor far away — no mock needed:
enemy.Configure(player.transform, new Vector3(0f, 0f, -30f));   // beyond leash radius
Assert.AreEqual(EnemyState.Return, enemy.Step(0.1f));
```

The "double" is a real `GameObject` placed where the test needs it. Position *is* the test input. This is faithful (it's the real component) and deterministic (the test sets every input).

## Reflection field injection (last resort)

When a field is private and there's no public seam, DRIFT pokes it via reflection — but only as a fallback. From `RuntimeInventoryTests.cs`:

```csharp
static void SetPrivate(object target, string field, object value)
{
    var info = target.GetType().GetField(field, BindingFlags.NonPublic | BindingFlags.Instance);
    Assert.IsNotNull(info, $"Field '{field}' not found on {target.GetType().Name}");
    info.SetValue(target, value);
}
// used to set SalvageInventory.slotCount before Add behavior is tested
```

Prefer a `Configure(...)` seam. Reaching for reflection where a `Configure` already exists (or should) is a **should-refactor** — flag it and, if the seam is missing, hand the API decision to `unity-csharp-guardian`.

## The fixture decision tree

```
Need a system under test?        → new GameObject().AddComponent<T>(), Track() it
Need content (item/recipe)?      → ScriptableObject.CreateInstance<T>(), set fields, Track() it
Need a collaborator?             → build the real one, inject via Configure(...)
Need to set a private field?     → Configure(...) if it exists; reflection SetPrivate only as fallback
Cleanup?                         → [TearDown] DestroyImmediate on the tracked list
```

No NSubstitute, no Moq. Real objects, controlled inputs, deterministic teardown.
