# 09 — Tier discipline: why save is deferred (read this first)

This is the gating guide. Before designing — and certainly before writing any save code — this Guardian decides whether building is even in scope. The answer, by default, is **no: design only.**

## The stance

Local save/load for DRIFT is **`[NOT STARTED]` and intentionally deferred** to Tier 1. Three sources say so, in their own words:

- **GDD §3 (the gray-box spec):** the Tier 0 gray-box deliberately ships with "**no save system even**." Save's absence is a feature of the scope, not an oversight.
- **CLAUDE.md §3 (Status Map):** "Local save/load — *intentionally deferred*; the GDD §3 gray-box has 'no save system even'." Tagged `[NOT STARTED]`.
- **CLAUDE.md §7 (Stack Quick Reference):** "Save (Tier 0–1): local JSON / Unity serialization (**not built yet**)."
- **ARCHITECTURE.md §3 / §8:** "There is **no save format yet.** Tier 0 deliberately ships without persistence … add the save layer when Tier 1 introduces state worth keeping."

And the governing rule above all of them — **CLAUDE.md Hard Rule #1**: *"Build top-down, one tier at a time. Do NOT build Tier 1+ systems while Tier 0 is incomplete."* Save is a Tier 1 system. The current objective (CLAUDE.md §4) is still Tier 0: get the gray-box loop playable and make the "is it fun?" call. **Building persistence now is exactly the scope jump Hard Rule #1 forbids.**

## Why it's *correct* that there's no save yet

It isn't laziness — it's sequencing:

- **Nothing worth saving exists yet.** Tier 0's loop runs in one sitting: descend → salvage → craft → fight → extract → survive one raid. There is no cross-session progression, no persistent base, no meta — so there is no state to persist (`guides/01-what-to-persist.md`). A save system over nothing is pure overhead.
- **The schema would be wrong.** Persisting Tier 0 state now means designing a schema against systems that durability, full crafting gates, and the real inventory will reshape in Tier 1 (CLAUDE.md "Known debt", ARCHITECTURE.md §8). You'd migrate your own throwaway format before shipping anything.
- **It competes with the only question that matters.** Tier 0's definition of done is "is the loop fun?" (TIER0.md, CLAUDE.md §4). Engineering persistence burns the time that question is owed.

## The default deliverable: design, not code

So this Guardian's default output is **Tier 1 PREP** — the clean design that makes the eventual build fast and correct:

- the save model and capture/apply seam (`guides/01`, `guides/03`),
- the format decision as an ADR (`guides/02` → `library/architecture/ADR-<n>-save-format.md`),
- the versioning + migration discipline (`guides/04`),
- the atomic-write / corruption / slot / path designs (`guides/05`–`07`),
- the EditMode test plan (`guides/08`).

All of that is *paper and plan*, not committed `SaveService.cs`. Designing it costs nothing against Tier 0 and means Tier 1 starts from a finished blueprint.

## How the user explicitly elevates scope

Building the save layer requires the user to **explicitly elevate scope past the Tier 0 gate.** Concretely, this Guardian proceeds to build only when:

1. The user states it plainly — e.g. *"We're moving to Tier 1, build the save system"* or *"Yes, implement save/load now, I'm accepting the scope change."* A vague "can you do saves?" is a design request, not elevation.
2. CLAUDE.md §4 (Current Objective) reflects a Tier 1 objective, **or** the user acknowledges they're deliberately departing from the documented objective.
3. Ideally, the Tier 0 "is it fun?" call has been made (TIER0.md) — because that's the gate the whole tier ordering hangs on.

When elevation happens, follow CLAUDE.md Hard Rule #8 and update the docs in the same change: flip the §3 Status Map entry off `[NOT STARTED]`, fill in ARCHITECTURE.md's save-format section (currently TBD), and record the format decision as an ADR.

## When asked to build mid-Tier-0: the response

Don't freelance (CLAUDE.md Hard Rule #10). Say, in substance:

> "Save/load is a Tier 1 system and the current objective is still Tier 0 (CLAUDE.md §3/§4, Hard Rule #1 — and the GDD §3 gray-box ships with no save on purpose). I can hand you the complete, ready-to-build design — model, format ADR, migration plan, atomic-write service shape, and the EditMode test plan — so Tier 1 starts from a blueprint. If you want me to actually build it now, confirm you're elevating scope past the Tier 0 gate and I'll proceed and update the Status Map + ARCHITECTURE.md."

That keeps the Guardian useful (it delivers the design) without breaking the one rule the whole project is organized around.

## Checklist

- [ ] CLAUDE.md §3 (Status: `[NOT STARTED]`, intentional) and §4 (objective: Tier 0) re-read this session.
- [ ] Default assumed = **design-only**; said so explicitly in the response.
- [ ] If asked to build: named the tier conflict (Hard Rule #1), required explicit elevation, did not freelance.
- [ ] On genuine elevation: update §3 Status Map + ARCHITECTURE.md save section + ADR in the same change (Hard Rule #8).
