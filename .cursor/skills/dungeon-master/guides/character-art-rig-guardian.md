# Character Art Rig Guardian — Dungeon Master's Guide

The Dungeon Master routing skill's record of when to invoke `character-art-rig-guardian`. Use this guide to decide whether a user request belongs to this Guardian.

**Guardian:** [`agents/character-art-rig-guardian.md`](../../../../agents/character-art-rig-guardian.md)
**Weapon:** [`.claude/skills/character-art-rig-weapon/`](../../character-art-rig-weapon/)
**Command Brief:** [`ai-tools/command-briefs/character-art-rig-guardian-command-brief.md`](../../../../ai-tools/command-briefs/character-art-rig-guardian-command-brief.md)
**Trigger policy:** on-demand (proactive: false)

---

## Domain

`character-art-rig-guardian` is PROJECT-DRIFT's 3D character-visuals specialist (Unity 6 / low-poly 3D humanoid / fixed angled top-down / portrait mobile). It owns the *rig, animation, and wardrobe* of characters — never their behavior, feel, runtime perf ceiling, import settings, or stats. Its remit: the humanoid **Mecanim avatar/rig** (one retargetable base shared by every character); the **Animator controller + locomotion blend trees** mapped onto the existing `TopDownPlayerController` seam (`IsSprinting`/`CurrentMoveSpeed`/`ResolveMove`); top-down facing/locomotion (twin-stick-lite, root-motion OFF because movement is code-driven via `CharacterController.Move`); modular **cosmetic** equipment/outfit swapping via shared-skeleton `SkinnedMeshRenderer` + attachment sockets; a data-driven (ScriptableObject, Hard Rule #3) **cosmetic customization** system on the fixed-identity protagonist; **enemy character setup** (mutation/raider archetypes as deltas off the one base, consuming `MutatedCrewEnemy.EnemyState`); **animation events** + the feel handoff; the **mobile animation budget**; and the tier/human handoff. Opinionation is the product: "one Humanoid base, Mecanim blend trees mapped to the real seam, cosmetic-only customization, kept inside the mobile budget — and the look/feel call is the human's."

Two boundaries are load-bearing and define this Guardian:
- **Cosmetic-only / identity-locked.** GDD §2 + Hard Rule #7 lock the protagonist identity ("the main guy"). The user confirmed they want "looks and outfits" customization. **Cosmetic ≠ identity, so it's compatible** — but the GDD doesn't say so. Per Hard Rule #10 this Guardian (a) scopes customization to cosmetic only, (b) **FLAGS** that GDD §2 needs a one-line cosmetic-customization note (it does **not** edit the GDD), and (c) **REFUSES** any identity change.
- **§7 human-handoff.** Animation, art, and game feel are human-handled (`CLAUDE.md` §7). This Guardian designs the rig/Animator/wardrobe and exposes knobs; it never declares the animation "looks good" or "is fun."

## Trigger phrases

Route to `character-art-rig-guardian` when the user says any of:

- "Design the character rig" / "set up the humanoid avatar" / "configure the avatar"
- "Build the locomotion blend tree" / "wire movement to animation"
- "How should the character face / turn under the top-down camera" / "strafe vs face-move"
- "Swap outfits" / "modular equipment" / "attachment sockets / attach points"
- "Outfit / skin customization" / "let the player change their look"
- "Avatar mask" / "layered animation" / "upper-body attack over running legs"
- "Rig the enemies" / "the mutation vs raider look" / "enemy character setup"
- "Add an animation event for the attack / footstep / fire"
- "Is this animation too heavy for mobile?" / "character animation budget"
- Anything touching the character *rig, Animator, blend tree, skinned mesh, or cosmetic wardrobe*

Or when the request implicitly involves how a character is rigged, animated, dressed, or set up visually.

## Do NOT route when

- The user wants enemy AI **behavior** — transitions, perception, aggro, *when* the enemy attacks, waves, the raider-assault logic — that is **`fsm-ai-guardian`**. This Guardian rigs/animates the enemy and maps `EnemyState` → clip; it does not decide the behavior. (If the ask is "the enemy won't chase," that's behavior → fsm-ai; "the enemy's run animation is wrong" is this Guardian.)
- The user wants impact / **hitstop** / screenshake / telegraph **feel**, or "does the attack feel good" — that is **`game-feel-juice-guardian`** (and the human owns final feel, `CLAUDE.md` §7). This Guardian places the animation event at the right frame; that Guardian spends the feel off it.
- The user wants animation/skinning **runtime PERF** hard calls — frame budget, GC, draw calls, pooling many animated agents, the hard skin-weight/bone ceiling — that is **`mobile-game-perf-guardian`**. The animation budget is **co-owned**: this Guardian designs within it; that Guardian ratifies the numbers on device.
- The user wants model/rig **IMPORT** settings — FBX rig import, avatar-on-import, mesh compression, read/write, LODs, atlasing — that is **`unity-art-pipeline-guardian`**. **Co-owned**: this Guardian owns what the avatar/rig *is*; that Guardian owns how the asset imports.
- The user wants character **stats / leveling / equipment stat modifiers** — that is **`character-progression-guardian`**. This Guardian owns the cosmetic *look* of equipment; that Guardian owns the numbers.
- The user wants **touch input / joystick / aim input** — that is `touch-input-guardian`. Animation reads movement/aim intent, not raw input.
- The user wants generic **C# component shape**, asmdef, namespaces, serialization — that is `unity-csharp-guardian`. The swap/attach components are written in that shape.
- The user wants prefabs **placed in a scene via the editor / MCP** — that is `unity-mcp-guardian`. This Guardian authors the rig/prefab spec + recommended values.
- The user wants to **edit the GDD** to allow customization (or change identity) — that is the **human's** call. This Guardian **flags** the needed one-line GDD §2 note; it never edits `space-survival-design-doc.md`, and it **refuses** any identity change (name/role/backstory/second hero, GDD §2 / Hard Rule #7).

If a request straddles boundaries (e.g. "the enemy looks wrong and won't chase"), split it: the look/animation is this Guardian's; "won't chase" is `fsm-ai-guardian`'s. Diagnose look-vs-behavior first, then route each half.

## Inputs the Guardian needs

Before invoking, ensure the user has provided (or you can infer):

- The character script(s) the rig hangs off — `Assets/Scripts/Drift/Gameplay/Player/TopDownPlayerController.cs` for the protagonist, `Assets/Scripts/Drift/Gameplay/AI/MutatedCrewEnemy.cs` for enemies; `Assets/Scripts/Drift/Gameplay/Visual/GrayBoxVisuals.cs` for the current gray-box look.
- A clear statement of the desired *visual/animation* outcome (a blend tree, an outfit swap, an archetype look) — distinct from a desired *behavior* (fsm-ai), *feel* (game-feel), or *stat* (progression).
- For customization: confirmation it is **cosmetic** (looks/outfits), not identity. (If it touches name/role/second hero, the Guardian will refuse and route to the human + GDD.)
- Optional: the chosen animation source (Asset Store pack / Mixamo / custom — open question Q1) and the facing model (movement-relative vs strafe — open question Q2).

If the request is actually about behavior, feel, a perf number, an import setting, or a stat, do not invoke — route to the sibling that owns it.

## Outputs the Guardian produces

- **Rig / animation / wardrobe notes and reviews** → `library/qa/character-art-rig/<date>-<topic>.md` (e.g. `2026-06-22-locomotion-blend-tree-design.md`).
- **Architecture decisions** (Mecanim vs Playables, the modular-character approach) → `library/architecture/ADR-<n>-<topic>.md`.
- **A spec + knob table + EditMode-safe template** for the rig/Animator/wardrobe, ending with the human-handoff sign-off.
- **The GDD-flag** (the exact one-line cosmetic-customization note, handed to the human) on any customization request — never an edit to the GDD.

Every finding cites (a) a real repo `file:line` (or a named Unity doc) and (b) the relevant `character-art-rig-weapon/guides/` section (or a GDD/ARCHITECTURE/CLAUDE section). No fabricated URLs (forged headless, `AGENTS.md`).

## Multi-Guardian sequences this Guardian participates in

- **New enemy archetype** — `character-art-rig-guardian` designs the rig/Animator deltas (mesh/material/attachment/states off the one base) and the `EnemyState → clip` map; `fsm-ai-guardian` owns the behavior (transitions, perception); `game-balance-guardian` sets the difficulty numbers; `mobile-game-perf-guardian` confirms the per-agent skinning/pooling cost; `unity-art-pipeline-guardian` owns the mesh import. Sequence: fsm-ai (behavior exists) → character-art-rig (look) → mobile-game-perf (cost).
- **Cosmetic customization feature** — `character-art-rig-guardian` designs the SO-driven cosmetic catalog + swapper and **flags the GDD §2 note**; the **human** decides the GDD edit; `mobile-game-perf-guardian` + `unity-art-pipeline-guardian` co-own the skinned-mesh/atlas cost; future store/ownership gating is `payments-guardian`/post-Tier-0 (flag, don't build, GDD §16).
- **Attack feel** — `character-art-rig-guardian` places the animation event at the connect frame; `game-feel-juice-guardian` builds the hitstop/shake/VFX off it; the human judges the feel (§7).
- **Player locomotion** — `character-art-rig-guardian` builds the blend tree mapped to `TopDownPlayerController`; `touch-input-guardian` supplies the move/aim intent; `game-feel-juice-guardian` owns the camera feel; the human picks the facing model (Q2).

## Critical directives the orchestrator should respect

- **Design + pipeline is yours; the look/feel call is the human's (`CLAUDE.md` §7).** The Guardian exposes knobs with recommended values and refuses to declare the animation good or fun.
- **Cosmetic-only customization; the protagonist identity is LOCKED (GDD §2 / Hard Rule #7).** The Guardian scopes customization to cosmetics, **flags** the needed one-line GDD §2 note (Hard Rule #10) without editing the GDD, and **refuses** any identity change (name/role/backstory/second playable hero).
- **Reuse ONE humanoid base.** Protagonist + mutation + raider share one avatar + Animator; a parallel rig is a must-fix.
- **Data over code (Hard Rule #3).** Outfits/skins/archetype variants are ScriptableObjects.
- **Map onto the existing seam + stay EditMode-safe (Hard Rule #11).** Animator params read from the real code; swap/attach components use lazy-init + `Configure` + a deterministic method.
- **In-place locomotion, root-motion OFF.** Animation follows the code-driven `CharacterController.Move`; root motion fighting it is a must-fix.
- **Tier discipline holds (Hard Rule #1).** Tier 0 characters are gray-box capsules; real rig/animation is art-phase DESIGN, marked as such — not built into the gray-box ahead of the "is it fun?" call.
- **Co-own, don't claim.** Behavior → fsm-ai; feel → game-feel-juice; runtime perf → mobile-game-perf; import → unity-art-pipeline; stats → character-progression. The Guardian names the overlap and hands off at the boundary (Hard Rule #10).

(Full list lives in the Guardian file's `## Critical directives` section.)

---

*Part of Dungeon Master's roster. See [`.claude/skills/dungeon-master/SKILL.md`](../SKILL.md) for the full Guild.*
