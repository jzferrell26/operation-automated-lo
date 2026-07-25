# 04 — Modular Equipment Swapping

How a character changes its visible gear/outfit pieces at runtime via skinned-mesh sharing and attachment sockets. Grounded in Unity `SkinnedMeshRenderer` API (`bones`, `rootBone`, `sharedMesh`) + the standard shared-skeleton modular-character pattern (named, general — no fabricated URL).

> This guide is the **mechanism**. The cosmetic *policy* (cosmetic-only, GDD §2, the flag) lives in `guides/05` and governs everything here.

## Two attachment kinds

### 1. Skinned modular pieces (share the skeleton)

For deformable pieces that must bend with the body (a jacket, armor torso, legs, a different body mesh): the new piece is a **`SkinnedMeshRenderer` that shares the character's existing bones**. You don't re-skin per swap — you re-point the new renderer at the base skeleton:

```
// Conceptual: bind a modular SkinnedMeshRenderer to the shared skeleton.
newPiece.bones    = baseSkeletonBones;   // the same Transform[] the base body uses
newPiece.rootBone = baseRootBone;
// newPiece.sharedMesh is the piece's mesh, authored against the same skeleton.
```

The piece's mesh must be **authored/rigged against the same avatar skeleton** (same bone names/order) — that's the contract that makes one `Transform[]` drive every piece. This is the canonical Synty-style / modular-character approach: one skeleton, many swappable skinned renderers.

> **Flagged for in-editor confirmation:** bone-array binding correctness is an editor/runtime check; it cannot be verified headless (`AGENTS.md`). State the contract; the human confirms the piece deforms correctly.

### 2. Rigid attachments (parent to a socket)

For non-deforming props (a helmet, a backpack, a held weapon): a plain mesh parented to an **attachment socket** — an empty child `Transform` on the relevant bone (head, spine, hand). No skinning; just a parent + local offset. Cheaper than a skinned piece and the right choice for hard props.

## Attachment sockets / attach points

A **socket** is a named empty `Transform` placed (in the editor, by the human) as a child of a bone:

- `Socket_Head` (child of head bone) — helmets, headgear
- `Socket_Back` (child of upper spine) — backpacks, the oxygen tank fiction (GDD §1)
- `Socket_HandR` / `Socket_HandL` (child of hand bones) — held tools/weapons (cutter, welder, plasma drill — the GDD §3 starter tools)

A small registry component maps a socket **name → Transform** so swappers attach by name, not by hardcoded references. `templates/modular-equipment-socket.cs` is the EditMode-safe attacher: lazy-init, `Configure(socketRegistry)`, and deterministic `Attach(prefab, socketName)` / `Detach(socketName)` (Hard Rule #11, `ARCHITECTURE.md` §7).

## Reuse-one-base ties in (Principle #3)

Because every character shares one avatar skeleton (`guides/01`), the **same socket layout and the same modular pieces work across the protagonist and enemy archetypes**. A raider just attaches different rigid props and skinned pieces to the same sockets/skeleton — no new rig (`guides/06`).

## EditMode-safe shape (Principle #9)

The swap/attach `MonoBehaviour` must be testable:

- **Lazy-init** the socket registry (`EnsureInitialized()` from both `Awake` and every public entry).
- **`Configure(...)`** to inject the registry/skeleton (no reliance on `Start`/tags).
- **Deterministic `Attach`/`Detach`** methods (not logic-only-in-`Update`), so a test can attach and assert the child transform without Play mode.

## Mobile cost note

Each active `SkinnedMeshRenderer` is a skinning + draw-call cost. Prefer **a single merged body+outfit skinned mesh per character where possible**, and keep the *count* of simultaneous skinned pieces low. Merging vs separate-renderers is a perf trade-off **co-owned with `mobile-game-perf-guardian`** (`guides/08`) and the import/atlas side with `unity-art-pipeline-guardian`. You flag the cost; they set the ceiling.

## What you deliver

- The socket layout (named sockets → bones).
- The skinned-vs-rigid decision per piece type.
- The bone-sharing contract (pieces authored against the same skeleton).
- The EditMode-safe attacher (`templates/modular-equipment-socket.cs`).
- The **handoff** + the perf/import co-ownership note.

## Cross-Guardian

- **Skinned-mesh count / merge-vs-separate perf** → `mobile-game-perf-guardian` (co-own).
- **Mesh import (read/write, compression) for swappable pieces** → `unity-art-pipeline-guardian` (co-own).
- **The cosmetic policy governing what may be swapped** → `guides/05` (this Guardian) — cosmetic only.
