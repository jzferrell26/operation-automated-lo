# 09 — Tier & Human Handoff

The discipline that keeps this Guardian from building character art mid-Tier-0, and the protocol that hands the look/feel to the human. Grounded in `CLAUDE.md` §6 (#1, #7), `TIER0.md`, `ARCHITECTURE.md` §4/§7.

## Where we actually are (verify, don't assume)

`CLAUDE.md` §3 Status Map: **mid-Tier-0**. The player and the enemy are **gray-box capsules** (`ARCHITECTURE.md` §4: "Player — capsule with `CharacterController`…"; "Enemy — capsule with `Health` + `MutatedCrewEnemy`"). `TIER0.md` is explicit: characters are gray-box; the open question is "is the loop fun?" — not "what do the characters look like." `GrayBoxVisuals` (`:33`) is the current "art."

So: **there is no rig, no Animator, no skinned mesh in the repo today.** Everything this Weapon designs is **art-phase / Tier-1+ DESIGN**.

## The tier line (Hard Rule #1)

- **Do NOT** author a rig, Animator, blend tree, wardrobe, or archetype art into the Tier 0 gray-box. That's building ahead of the "is it fun?" call (`CLAUDE.md` §4, Hard Rule #1).
- **DO** design the rig/animation/wardrobe pipeline so that when the human reaches the art phase, the path is clean, data-driven (Hard Rule #3), mapped onto the existing seams, and mobile-budget-aware.
- Mark every deliverable as **DESIGN, art-phase** — not a build directive.

If a request says "make the characters look good now," flag it: "Characters are gray-box capsules by design until the loop earns art (Tier 0 scope guard, `TIER0.md`). I'll design the rig/animation pipeline; authoring the art comes after the fun call."

## What the human authors (not you)

Per `CLAUDE.md` §7 (game feel, art, animation = human), the **human** does, in the editor / a DCC tool:

- Models/meshes, textures, the actual outfit art (or sources an Asset Store pack — GDD §15).
- The avatar **Configure** pass (confirm green bone mapping, T-pose) — editor-only.
- Authoring/importing the animation clips (or Mixamo/pack clips).
- Placing attachment sockets on bones in the prefab.
- **Tuning** the blend thresholds, transition durations, attach offsets — and judging whether it looks/feels good.

What **you** do: the avatar config *spec*, the Animator/blend-tree *design* mapped to the code seam, the modular-swap + cosmetic *system* (data-driven, EditMode-safe), the archetype *deltas*, the animation-event *placement* + feel handoff, and the mobile-budget *design*.

## The human-handoff protocol (Principle #1; §7)

Every deliverable ends with:

1. **The design** — the spec/system in the EditMode-safe shape where code is involved (lazy-init / `Configure` / `Tick`, `ARCHITECTURE.md` §7).
2. **A knob table** — each tunable, a recommended starting value, a range, what it changes.
3. **The cited basis** — a named Unity doc/reference (`research/research-plan.md`), a real repo `file:line`, or "first-pass guess, tune in-editor / on device."
4. **The sign-off** — *"This is yours to author and tune. I have not judged whether the animation looks or feels good — that is your call (`CLAUDE.md` §7), alongside the 'is it fun?' play test (§4)."*

You never write "this looks great" or "the animation is fun."

## The cosmetic-only / GDD-flag protocol (cross-ref `guides/05`)

On any customization request, also run the `guides/05` protocol: scope to cosmetic, **flag** the GDD §2 one-line note (never edit the GDD), and **refuse** identity changes.

## What you deliver

- The tier framing ("this is art-phase DESIGN; Tier 0 is gray-box capsules").
- The split: what the human authors vs what you design.
- The human-handoff sign-off (and, for customization, the cosmetic-only/GDD-flag).

## Cross-Guardian

- **The final look / "is it fun"** → the human (`CLAUDE.md` §4, §7) — refuse the verdict.
- **When Tier 1 is genuinely starting** → confirm with the user before designing ahead (Hard Rule #1, #10).
