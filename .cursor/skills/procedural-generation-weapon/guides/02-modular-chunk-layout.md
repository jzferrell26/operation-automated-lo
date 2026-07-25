# 02 — Modular Chunk Layout

How to assemble an LDOE-style location from authored kits. This is the core layout algorithm: a
seeded walk that places chunks, matches connection sockets, and guarantees reachability — while the
**kit prefabs themselves are `unity-level-design-guardian`'s** (co-owned seam).

## The data model (data over code — Hard Rule #3)

A chunk is described by data, not a class hierarchy. A `ChunkDefinition` ScriptableObject carries:

- `id` — stable string id (e.g. `corridor_straight`, `room_medbay`, `junction_t`).
- `prefab` — the authored kit piece (level-design owns this reference's *contents*).
- `footprint` — grid cells the chunk occupies (e.g. 1×1, 2×1).
- `sockets` — the edges that can connect, each with a direction + a `socketType` tag so only
  compatible edges join (a `corridor` socket matches a `corridor` socket).
- `tags` — `entrance`, `objective_slot`, `dead_end`, etc., used to place required content.
- `weight` — selection weight **(VALUE owned by `game-balance-guardian`; the field lives in data,
  this Guardian reads it, balance tunes it).**

A `ChunkSet` SO is the palette: the list of `ChunkDefinition`s a location can draw from, plus the
entrance chunk and any required-objective constraints (e.g. "exactly one `objective_slot`").

## The layout algorithm (constructive socket-matching)

A grid/graph walk, seeded and deterministic:

1. **Place the entrance.** From `(seed, config)`, place the entrance chunk at the origin cell. Its
   open sockets become the **frontier** (a queue of `(cell, direction, socketType)` openings).
2. **Grow the layout.** While the frontier is non-empty and the placed-chunk count is below the
   target (target count = a difficulty-read VALUE; see guide 06):
   - Pop a frontier opening (deterministic order — pop by a stable index, never by hash-set order).
   - Select a compatible chunk: filter `ChunkSet` to chunks with a matching socket, then pick by
     **weighted selection** (guide 03) using the generator's seeded PRNG.
   - Test placement: does its footprint fit the unoccupied grid without overlap? If not, try the
     next candidate; if none fit, **cap the opening** with a wall/dead-end chunk.
   - On placement, push its other open sockets onto the frontier.
3. **Place required content.** After the shell exists, place objective slots (tool caches, the
   extract pad) into chunks tagged `objective_slot`, chosen by seeded selection.
4. **Validate reachability** (guide 09) — flood-fill from the entrance; assert every required slot
   is reachable. If not, the generator is broken for that seed — fail loud in EditMode, don't ship.
5. **Return a layout description** — a list of `(chunkId, gridCell, rotation)` placements + the
   objective assignments. **The generator returns DATA; it does not instantiate prefabs itself in
   the testable path** (instantiation is a thin separate step so the algorithm stays EditMode-pure).

## Socket matching keeps it readable

The single most important rule: **only matching `socketType`s connect.** This is what makes the
output read as an authored space rather than a random blob — a corridor socket joins a corridor
socket, a doorway joins a doorway. It also makes reachability tractable: connectivity is exactly the
socket graph.

## Determinism discipline (guide 05 in miniature)

- The frontier is an **ordered** structure (queue / list indexed by a stable rule), never an
  unordered set — iteration order must be identical across runs and platforms.
- The PRNG is the generator's seeded stream (guide 05); no `UnityEngine.Random`.
- Candidate filtering iterates `ChunkSet` in declared order; ties broken deterministically.

Same `(seed, config)` → identical placement list. This is what makes example 01's
"same seed → same rooms" test possible.

## EditMode shape (Hard Rule #11)

```
Configure(ChunkSet set, LayoutConfig config, int seed)  // lazy-init deps, no Awake needed
LayoutResult Generate()                                  // pure: runs the walk, returns DATA
```

`Generate()` runs the full walk with no Unity lifecycle. The test calls `Configure` + `Generate`
twice with the same seed and asserts identical `LayoutResult`, plus a reachability assertion. See
`templates/chunk-layout-generator.cs` and `examples/01-seeded-modular-room-layout.md`.

## Lane handoffs

- **The kit prefabs, room art, socket authoring** → `unity-level-design-guardian`. This Guardian
  references `ChunkDefinition.prefab`; it does not build the prefab. Co-owned seam.
- **The `weight` / target-count / difficulty VALUES** → `game-balance-guardian`. This Guardian reads
  them from data; balance tunes them.
- **Instantiation perf / pooling the placed prefabs** → `mobile-game-perf-guardian`.

## Output

A layout invocation produces a **seeded layout generator** (`Configure` + `Generate` returning a
placement DATA list) + an EditMode test asserting same-seed-same-layout and reachability, with the
kit references flagged to level-design and the weights flagged to balance.
