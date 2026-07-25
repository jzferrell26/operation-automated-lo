# 05 — Cosmetic Customization (GDD §2 cosmetic-only + the FLAG)

**This is the most important guide in the Weapon.** It governs everything in `guides/04`. Read it before designing any "looks and outfits" feature.

## The rule, stated plainly

GDD §2 + `CLAUDE.md` Hard Rule #7 **LOCK the protagonist identity** — "you are the main guy," a named, fixed protagonist, not a faceless or interchangeable survivor. GDD §2 even frames the soft commitment *against real-time playable co-op* ("you can't both be the hero").

The user has confirmed they want cosmetic **"looks and outfits"** customization. The resolution:

> **Cosmetic ≠ identity. Cosmetic customization is COMPATIBLE with the locked identity.**

Changing what the protagonist *wears or looks like* does not change *who he is*. So the feature is allowed — but the GDD doesn't yet say so, which triggers Hard Rule #10 (flag, don't freelance).

## The three obligations (do all three, every time)

### (a) Scope to COSMETIC ONLY

Customization may touch **only**:
- meshes (body variant, outfit pieces) — via `guides/04`'s skinned/rigid swap,
- materials / colors / skins,
- attachments (helmet, backpack, held-prop look),
- and the SO catalog that lists these.

It may **never** touch:
- name, role, backstory, voice, dialogue identity,
- the protagonist's fixed position as the single hero,
- anything implying a **second playable hero** or real-time co-op (GDD §2),
- gameplay stats (those are `character-progression-guardian`'s — and they're not "cosmetic" anyway).

### (b) FLAG the GDD note (do NOT edit the GDD)

The GDD is silent on customization. Per Hard Rule #10, **raise the flag** on every cosmetic-customization request, using language like:

> "GDD §2 locks the protagonist identity and does not currently mention customization. Cosmetic customization is compatible (cosmetic ≠ identity), but to keep the docs honest the GDD should get a **one-line note** allowing **cosmetic-only** customization on the fixed-identity protagonist — for example: *'The protagonist's identity is fixed; cosmetic customization (outfits, skins, attachments) is allowed and does not alter that identity.'* That edit is the human's to make — I will not touch `space-survival-design-doc.md` (the GDD wins on vision, `CLAUDE.md` §2)."

You **never** edit `space-survival-design-doc.md` yourself. You surface the exact one-liner; the human decides and commits it.

### (c) REFUSE identity changes

If a request crosses from cosmetic into identity — "let me rename the hero," "add a second playable character," "pick your backstory," "swap which character you control" — **refuse and route back**:

> "That changes the protagonist *identity*, which GDD §2 / Hard Rule #7 lock. I can do cosmetic looks/outfits, but an identity change needs the human to revisit the GDD first. Flagging, not building (Hard Rule #10)."

## Data-driven cosmetic catalog (Hard Rule #3)

Customization content is **ScriptableObjects**, not hardcoded:

- An `OutfitDefinition` SO: id, displayName, the skinned mesh / material / attachment-prefab references, the socket name(s) it uses.
- An `OutfitCatalog` SO: the list of available cosmetics (mirrors how `ItemDatabase`/`RecipeDatabase` work in `ARCHITECTURE.md` §3).
- A runtime swapper (`templates/outfit-swap-system.cs`) that applies an `OutfitDefinition` by swapping mesh/material/attachments **only** — with a contract comment: `// COSMETIC ONLY — identity is locked (GDD §2 / Hard Rule #7). Never modify name/role/stats here.`

Adding a new outfit = authoring a new SO, never editing code (Hard Rule #3).

## The monetization tie-in (design-aware, not building it)

GDD §16 lists "cosmetic station & ship skins" as a *future* monetization lever and says to think about it but **not build it yet**. Character cosmetics are the same shape. So: design the cosmetic system to be **catalog-driven and ownership-agnostic** (an outfit is just an SO that may later be gated), but do **not** build store/IAP/ownership logic — that's `payments-guardian`/future scope, and it's past Tier 0. Flag the seam; don't wire it.

## EditMode-safe (Principle #9)

The swapper follows `ARCHITECTURE.md` §7: lazy-init, `Configure(catalog, renderers, socketRegistry)`, and a deterministic `ApplyOutfit(outfitId)` so a test can apply an outfit and assert the swapped mesh/material without Play mode (Hard Rule #11).

## What you deliver

- The cosmetic-only scoping (explicit allow/deny list above).
- **The GDD flag** (the exact one-liner, handed to the human — never the edit).
- The SO catalog design + the EditMode-safe swapper (`templates/outfit-swap-system.cs`).
- A refusal, if the request crossed into identity.

## Cross-Guardian

- **Stats/modifiers on equipment** → `character-progression-guardian` (you do the *look*, never the numbers).
- **Store/IAP/ownership of cosmetics** → future scope (`payments-guardian`); flag, don't build (GDD §16, Tier line).
- **The GDD edit itself** → the human (you only flag).
