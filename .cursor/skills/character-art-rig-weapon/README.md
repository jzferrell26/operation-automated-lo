# character-art-rig-weapon

The procedural arsenal for `character-art-rig-guardian`, PROJECT-DRIFT's 3D character-visuals specialist — the humanoid rig, Animator + locomotion blend trees, modular cosmetic wardrobe, enemy archetype setup, and the mobile animation budget.

**ART DIRECTION (confirmed):** low-poly 3D humanoid characters, a fixed angled top-down camera, portrait mobile — skinned 3D humanoids, not 2D sprites.

## What this weapon covers

- **Humanoid rig & Mecanim avatar** — Humanoid avatar config, retargeting, avatar masks for layered animation
- **Animator controller + locomotion blend trees** — 1D/2D blend trees mapped onto the existing `TopDownPlayerController` seam
- **Top-down locomotion** — facing under a fixed angled camera, twin-stick-lite, root-motion OFF (code-driven movement)
- **Modular equipment swapping** — skinned-mesh via shared skeleton, attachment sockets/attach points
- **Cosmetic customization** — SO-driven outfit/skin catalog on a FIXED-identity protagonist (GDD §2 cosmetic-only + the GDD-note flag)
- **Enemy character setup** — mutation/raider archetypes as deltas off one base
- **Animation events + feel handoff** — the attack-fires-here seam handed to `game-feel-juice-guardian`
- **Mobile animation budget** — bone counts, skin weights, Animator culling/update modes (co-own with `mobile-game-perf-guardian`)
- **Tier + human handoff** — what's art-phase DESIGN vs what the human authors

## Reading order

1. Read `SKILL.md` — master index, routing table, hard rules, severity rubric, cross-Guardian handoffs, output paths, the two non-negotiable protocols (human-handoff + cosmetic-only/GDD-flag)
2. Read `guides/00-principles.md` — the non-negotiables
3. Open the guide matching your task (see the routing table in `SKILL.md`)
4. Reference `research/research-plan.md` for the named sources behind a claim; `research/research-summary.md` carries the **DEGRADED** banner (forged headless, no editor, no live fetch)

## Three load-bearing rules

1. **Design + pipeline is yours; the look/feel call is the human's** (`CLAUDE.md` §7). Expose knobs; never declare the animation good.
2. **Cosmetic-only customization; the identity is LOCKED** (GDD §2 / Hard Rule #7). Flag the needed GDD note (Hard Rule #10); refuse any identity change. Never edit the GDD.
3. **Tier line holds** (Hard Rule #1). Tier 0 characters are gray-box capsules; real rig/animation is art-phase DESIGN, marked as such.

## Status

Forged 2026-06-22 in **DEGRADED** mode (headless VM, no Unity editor per `AGENTS.md`, degraded live web). Repo claims are cited by `file:line`; external sources are named by title/owner with **no fabricated URLs**. Editor-dependent and on-device claims are flagged for the human's confirmation pass.
