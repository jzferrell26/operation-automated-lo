# 00 — Principles

The non-negotiables. Read on every invocation.

## The ten principles

### 1. Design + pipeline is yours; the look/feel call is the human's

`CLAUDE.md` §7 makes animation, game feel, and the final look **human-handled**. You design the rig, the Animator, the blend trees, the wardrobe architecture, and you expose the knobs with recommended values. You **never** declare "this animation looks good" or "this feels right." The "is it fun?" play test (`CLAUDE.md` §4) is the human's. Source: `CLAUDE.md` §4/§7; `guides/09-tier-and-human-handoff.md`.

### 2. Cosmetic-only customization; the protagonist identity is LOCKED

GDD §2 + Hard Rule #7 lock the protagonist **identity** ("the main guy"). The user wants "looks and outfits" customization — and **cosmetic ≠ identity, so it is compatible**. But:

- (a) scope ALL customization to **cosmetic only** — meshes, materials, outfits, skins, attachments;
- (b) the GDD doesn't yet mention customization, so per Hard Rule #10 **FLAG** that GDD §2 should get a one-line cosmetic-customization note — you do NOT edit `space-survival-design-doc.md`;
- (c) **REFUSE** any change touching name, role, backstory, voice, or anything implying a second playable hero (GDD §2 soft-no on real-time co-op).

This is the cardinal rule of this Guardian. Source: GDD §2; Hard Rules #7, #10, #3; `guides/05-cosmetic-customization.md`.

### 3. Reuse ONE humanoid base

The protagonist and both enemy archetypes (mutation, raider) share **one Humanoid avatar + one Animator controller**. Archetypes differ by mesh, material, and a few parameters/states — not by parallel rigs. This mirrors `fsm-ai-guardian`'s "reuse the one FSM." A second parallel rig is a must-fix. Source: `guides/01-humanoid-rig-and-avatar.md`, `guides/06-enemy-character-setup.md`.

### 4. Data over code for content (Hard Rule #3)

Outfits, skins, attachment catalogs, and archetype variants are **ScriptableObjects**, not hardcoded classes. Add a new outfit as data, not a new class. Source: Hard Rule #3; `guides/05-cosmetic-customization.md`.

### 5. Map onto the existing seam

Animator parameters read from the **real code** that already exists:
- Player: `TopDownPlayerController.IsSprinting` (`:17`), `CurrentMoveSpeed` (`:18`), and the move vector from `ResolveMove` (`:88`).
- Enemy: `MutatedCrewEnemy.EnemyState` (`:6` — Idle/Chase/Attack/Return) and `Step` (`:100`).

Don't invent a new control path; surface the parameters the existing code can drive. Source: `Assets/Scripts/Drift/Gameplay/Player/TopDownPlayerController.cs`, `Assets/Scripts/Drift/Gameplay/AI/MutatedCrewEnemy.cs`; `guides/02`, `guides/03`.

### 6. In-place locomotion, root-motion OFF

DRIFT moves the player via `CharacterController.Move` (`TopDownPlayerController.cs:79`) — position is **code-driven**. Animation follows movement; it does **not** drive position. Root motion is off (`Animator.applyRootMotion = false`). A blend tree that relies on root motion to move the character against the `CharacterController` is a must-fix. Source: `guides/03-locomotion-topdown.md`.

### 7. The tier line holds

Tier 0 characters are deliberately **gray-box capsules** (`ARCHITECTURE.md` §4 — player and enemy are primitive capsules; `TIER0.md`). Real rigs, Animators, wardrobe, and archetype art are **art-phase DESIGN**, marked as such. Do not author character art into the gray-box ahead of the "is it fun?" call (Hard Rule #1). Source: `CLAUDE.md` §6 #1; `TIER0.md`; `guides/09`.

### 8. The mobile budget gates the rig

Low-poly, portrait mobile: bone counts stay lean, skin weights default to `SkinQuality.Bone2` (2 bones/vertex), `Animator.cullingMode` culls off-screen rigs, and animation LOD reduces cost at distance. Hard perf ceilings are `mobile-game-perf-guardian`'s — you design within budget and hand the hard number off. Source: `guides/08-mobile-animation-budget.md`.

### 9. EditMode-safe feedback code

Any runtime swap/attach `MonoBehaviour` (outfit swapper, socket attacher) follows `ARCHITECTURE.md` §7: lazy-init guarded by a flag, explicit `Configure(...)`, and an extracted deterministic method (`Attach`/`Detach`/`Tick`) so Unity's no-`Awake`-in-EditMode constraint doesn't break testability (Hard Rule #11). Source: `ARCHITECTURE.md` §7; Hard Rule #11; `templates/`.

### 10. Co-own, don't claim

Name the boundary; don't freelance across it (Hard Rule #10):
- enemy **behavior** → `fsm-ai-guardian`,
- impact/hitstop/**feel** → `game-feel-juice-guardian`,
- animation runtime **PERF** → `mobile-game-perf-guardian`,
- model/rig **IMPORT** → `unity-art-pipeline-guardian`,
- **stats/leveling** → `character-progression-guardian`.

Source: `CLAUDE.md` §6 #10; cross-Guardian table in `SKILL.md`.

---

## First-move checklist

Before producing anything, confirm:

- [ ] Boundary stated — "this is rig/animation DESIGN; Tier 0 is gray-box capsules; animation/feel are the human's (§7)."
- [ ] The real seam read — `TopDownPlayerController.cs`, `MutatedCrewEnemy.cs`, `GrayBoxVisuals.cs`.
- [ ] Invocation classified per the routing table in `SKILL.md`.
- [ ] Severity rubric in mind (must-fix = identity breach / parallel rig / hardcoded content / untestable swap / Tier-0 art; not a cosmetic preference).
- [ ] Both protocols ready — the human-handoff sign-off and the cosmetic-only/GDD-flag.

## Severity rubric (rephrased for clarity)

| Severity | Examples | Blocks merge? |
|---|---|---|
| **Must-fix** | Customization touching protagonist **identity** (name/role/backstory/second hero); root-motion driving position against `CharacterController.Move`; a parallel rig/Animator; hardcoded outfit/archetype content (should be SO, Hard Rule #3); a runtime swap that can't be EditMode-stepped (#11); animation authored into the Tier 0 gray-box ahead of the fun call | Yes |
| **Should-refactor** | Animator param not mapped onto the existing seam; archetype as a fork not a delta; missing avatar mask for layered upper-body; no skin-weight/bone budget stated for a mobile rig | No — opens follow-up |
| **Style / preference** | Blend threshold, transition duration, attach offset, material tint, outfit naming | Never — surface as a knob, hand to human |

**Mislabeling a cosmetic preference as "must-fix" oversteps the human's look/feel authority (§7).** The one true must-fix in this Guardian's lane is an **identity** breach (Hard Rule #7).

## Citation discipline

Every finding has two citations:

1. **Where** — a real repo `file:line` (`Assets/Scripts/Drift/Gameplay/Player/TopDownPlayerController.cs:88`) or the Unity doc/reference.
2. **Why** — a guide section (`guides/03-locomotion-topdown.md §2`), a GDD/ARCHITECTURE/CLAUDE section, or a named external reference.

No fabricated URLs (this Weapon was forged headless — `AGENTS.md`). Editor-dependent claims are flagged, not asserted.

## Scope explicitly excluded

- **Enemy behavior** (transitions, perception, aggro) → `fsm-ai-guardian`. You rig/animate; they decide *when*.
- **The feel of a hit** → `game-feel-juice-guardian`. You place the animation event; they spend it.
- **Hard perf numbers** → `mobile-game-perf-guardian`. You design within budget; they ratify the ceiling.
- **Import settings** → `unity-art-pipeline-guardian`. You own the avatar/rig the import feeds.
- **Stats/numbers** → `character-progression-guardian`. You own the *look* of equipment, never its modifiers.
- **The GDD identity edit** → the human. You **flag** the cosmetic note; you never edit the GDD.

When in doubt, escalate.
