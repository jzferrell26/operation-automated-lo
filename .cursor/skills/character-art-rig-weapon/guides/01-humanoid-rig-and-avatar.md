# 01 — Humanoid Rig & Mecanim Avatar

How a low-poly 3D humanoid becomes a riggable, animatable character that **all** DRIFT characters share. Grounded in Unity's "Creating/Configuring the Avatar", "Avatar Mask", and "Mecanim" docs (named; no fabricated URLs — `AGENTS.md` headless forge).

## The one-base rule (Principle #3)

DRIFT has a protagonist, mutations, and raiders. They are all bipedal humanoids. **They share ONE Unity Humanoid avatar and ONE Animator controller.** Archetypes diverge by mesh/material/parameter, not by a second rig (`guides/06`). This is the single biggest pipeline decision and it is load-bearing — a parallel rig is a must-fix.

## Humanoid vs Generic

Use **Humanoid**. Reasons:

1. **Retargeting** — one set of locomotion/attack clips animates the protagonist *and* every enemy, even if their proportions differ. This is the entire reason the one-base rule is affordable.
2. **Pack-agnostic** — Asset Store packs (Synty-style), Mixamo, and custom rigs all map onto Unity's Humanoid bone definition, so the chosen art source (open question Q1) doesn't change the Animator design.
3. **Masks** — Humanoid avatars support **avatar masks**, which let you layer (e.g.) an upper-body attack over a lower-body run (`guides/02`).

Generic is only justified for a non-bipedal creature (a drone, a quadruped boss). DRIFT's Tier 0/early archetypes are all bipedal — keep Humanoid. A non-humanoid boss is a Tier-later escalation; flag it, don't fork the pipeline pre-emptively.

## Avatar configuration checklist (human authors in-editor; you design)

This is an **in-editor** pass (the human runs it — `AGENTS.md`: no editor here). You provide the spec:

1. On the model's **Rig** import tab, set Animation Type = **Humanoid**, Avatar Definition = **Create From This Model** (or **Copy From Other Avatar** for additional characters sharing the skeleton).
2. **Configure** the avatar → verify the bone mapping is green (all required bones found), check the T-pose, and confirm no extra bones are mis-assigned.
3. Define **muscle limits** only if a pack imports with bad ranges; defaults are usually fine.
4. For each additional character that should reuse the base clips, **Copy From Other Avatar** so retargeting works.

> **Flagged for in-editor confirmation:** bone-mapping correctness and T-pose validity cannot be verified headless. State the spec; the human confirms green.

## Avatar masks (for layered animation)

An **Avatar Mask** selects which body parts a layer animates. DRIFT's core use: an **upper-body mask** so an attack/aim animation plays on the torso+arms while the legs keep running (twin-stick-lite, GDD §8). Design:

- **Base layer** — full-body locomotion blend tree (`guides/02`/`03`).
- **Upper-body layer** — attack/aim clips, weight driven by an `IsAttacking`/aim parameter, masked to spine+arms+head.

Author the mask against the **chosen pack's bone naming** (open question Q1) — that's the one place pack choice leaks into the rig.

## Skeleton & bone budget (mobile)

Keep the bone count lean for low-poly mobile (`guides/08`). A typical mobile humanoid is well under ~40 bones; extra accessory bones (for cloth, long hair) add skinning cost. Attachment sockets (`guides/04`) are usually **empty child transforms** on existing bones, not new skinned bones — cheaper. The hard bone-count ceiling is a measurement co-owned with `mobile-game-perf-guardian`.

## What you deliver

- The avatar config spec (Humanoid, definition source, copy-from-other for shared characters).
- The avatar-mask plan (which layers, which body parts).
- The bone/socket note (which sockets ride which bones — feeds `guides/04`).
- The **handoff**: "Author this in the editor against your chosen pack; confirm the avatar maps green and the T-pose is valid. The look is yours to judge (§7)."

## Cross-Guardian

- **FBX rig import settings** (scale, mesh compression, avatar-on-import, normals) → `unity-art-pipeline-guardian` (co-own — they own the import tab; you own what the avatar *is*).
- **Bone-count / skin-weight ceiling** → `mobile-game-perf-guardian`.
