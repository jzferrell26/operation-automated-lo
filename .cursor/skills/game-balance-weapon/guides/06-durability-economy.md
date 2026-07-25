# 06 — The Durability Economy (Tier 1 grind driver)

> **This is the most protected design decision in DRIFT. Read CLAUDE.md Hard Rule #2 and GDD §8 before touching it.**
>
> **Durability stays — for tools AND weapons, guns included. Tiered scarce ammo is a SECOND sink ON TOP of durability, never a replacement. Do NOT "fix", soften, or remove durability. It is currently deferred to Tier 1 — spec it; do not direct mid-Tier-0 construction.**

## Why this guide exists and why the rule is sacred

The durability economy is the **load-bearing wall of the late game** (GDD §8). It was *debated and kept on purpose.* The reasoning, verbatim from the design intent:

> *Durability is the mechanic that keeps a maxed-out player still grinding, scavenging, and returning. Remove it and a player "solves" the economy and puts the game down. The immersion friction of a gun "breaking" is real, but it's outweighed by what the friction buys — a survival loop that never goes slack.*

So the standing temptation — "guns breaking feels bad, let's make weapons durable but tools degrade" or "let's replace durability with ammo scarcity" — is **explicitly rejected.** If a user asks you to do either, that is a **must-fix finding against the request**: cite Hard Rule #2 and GDD §8, explain the late-game-grind reasoning, and stop. Flag it; don't freelance (Hard Rule #10).

## The two-sink design (both, not either)

DRIFT runs **two independent compounding pressures** on every weapon:

| Sink | What it drains | What it costs to refill |
|---|---|---|
| **Durability** | The item's condition (use → degrade → break) | Repair materials or a full recraft |
| **Tiered ammo** | The item's ability to fire *this shot* | Ammo/energy cells — basic ones craftable, better ones scarce/looted |

A weapon must be kept **working** (durability) AND **fed** (ammo). These are orthogonal: a fully-repaired gun with no specialized ammo is dead weight; a loaded gun about to break is a panic. The two together give a deeper economy than either alone (GDD §8). **Ammo does not replace durability; it stacks on it.**

## Current state (why it's deferred, not absent)

ARCHITECTURE.md §8 and §2: the legacy spine that *had* item/tool durability degradation + workstation/blueprint crafting gates was removed during the two-spine consolidation. The data model already *carries the slot*: `ItemDefinition` has a `durabilityMax` field (ARCHITECTURE.md §3; TIER0.md authoring note suggests `durabilityMax` ~50 for starter tools). What's gone is the *degradation logic and the repair/recraft loop*. **That logic is a clean Tier 1 rebuild** on `ItemDefinition` / `SalvageInventory` / `SimpleCrafter` — not a Tier 0 task.

So your job today is to **spec the Tier 1 durability economy as data**, ready for when Tier 1 rebuilds inventory/crafting — not to build it now.

## The decay curve spec (data, for Tier 1)

Express durability as data, never as inline logic (`guides/01`). The tunables, per item, live on `ItemDefinition` (or a per-item balance SO):

| Tunable | Meaning | Example (starter tool) |
|---|---|---|
| `durabilityMax` | Full condition | 50 (per TIER0.md) |
| `durabilityPerUse` | Condition lost per action (swing / cut / fire) | 1 |
| `repairCost[]` | Materials to restore N condition | partial recipe cost |
| `recraftCost[]` | Falls back to the full `RecipeDefinition` cost | full recipe |
| `breakBehavior` | Unusable-until-repaired vs destroyed | unusable (tools), destroyed (cheap items) |

**Uses-per-item** is the headline number: `uses = durabilityMax / durabilityPerUse`. At 50/1 a tool lasts 50 actions before needing attention — tune this against how many actions a typical run demands so the player feels the grind without constant micro-repair. See `examples/03-durability-decay-curve-spec.md` for a full worked curve including the guns-included weapon case.

### The repair-vs-recraft economics

Repair must be **cheaper than recraft but not free** — otherwise repair trivializes the sink. A good ratio: a full repair costs ~30–50% of the recraft cost. This keeps materials flowing (the point of the sink) while rewarding the player for maintaining gear over letting it break. Compute it against the `guides/02` economy ledger so the durability sink integrates with the faucet rates.

## The ammo sink spec (data, for Tier 1 — ON TOP)

Layered over durability (GDD §8):

- **Basic ballistic ammo** — craftable, keeps you alive. Cheap faucet → low scarcity.
- **Specialized ammo / energy cells** — for better guns and lasers. Looted, or craftable only from *rare* salvage. High scarcity → the second compounding pressure.

Ammo scarcity is a **loot-table tuning** problem (drop rates) — CLAUDE.md §7 lists ammo-scarcity tuning as **human-handled**. So you spec the *structure* (which tiers, which costs, the scarcity intent) and the human tunes the exact drop rates against playtest feel.

## What to produce when asked about durability

1. State up front: **"Durability is a Tier 1 mechanic (ARCHITECTURE.md §8). This is a spec for when Tier 1 rebuilds crafting, not a build directive now."**
2. A per-item decay table (the tunables above) landed as `ItemDefinition` fields / a balance SO — never inline.
3. The repair-vs-recraft cost ratio, computed against the economy ledger.
4. The ammo second-sink structure (tiers + scarcity intent), with drop-rate tuning explicitly handed to the human.
5. The reminder that **both** sinks stay, guns included, by deliberate decision.

## Do NOT

- Do not remove, soften, or make optional weapon/gun durability. Hard Rule #2.
- Do not propose ammo scarcity *as a replacement* for durability. It's additive.
- Do not direct anyone to implement the degradation loop while Tier 0 is incomplete. Spec it; tier discipline (Hard Rule #1).
