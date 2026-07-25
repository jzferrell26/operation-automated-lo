# 07 — Addressables (Forward / Tier-1)

**Addressables is NOT in `Packages/manifest.json` today** (verified against the live manifest —
there is no `com.unity.addressables` entry). So this guide is **forward guidance for Tier 1+**, not
a Tier-0 instruction. Adopting Addressables is a deliberate Tier-1 decision that warrants an ADR.

> **Tier note:** `CLAUDE.md §6` Rule #1 — build top-down, one tier at a time. Do not add the
> Addressables package mid-Tier-0 to "prepare for content." Design it; adopt it when Tier 1 has
> content to address.

## 1. Why Addressables (when content arrives)

DRIFT's content is data-driven via ScriptableObjects (`CLAUDE.md §6` Rule #3). As real content
lands (sprites, audio, prefabs, larger SO databases), Addressables gives:

- **Content/player build separation** — ship content updates without a full player rebuild.
- **Memory control** — load/unload assets by address, with reference counting.
- **Remote delivery** — host content off-device (subject to store policy).

## 2. Content build vs player build

The defining Addressables concept: a **content build** is separate from the **player build**.

- The content build produces the catalog + bundles and writes
  `addressables_content_state.bin` (the record of what shipped).
- A later **content update** diffs against that state file to produce only the changed bundles —
  so you can patch content without re-submitting a player binary (where store policy allows).

This is why versioning the content state (`guides/09`) matters once Addressables is adopted.

## 3. Local vs remote groups

- **Local groups** — packed into the player build; always available offline.
- **Remote groups** — hosted on a CDN, fetched at runtime via a **remote catalog**.

For a mobile survival game, start **local** (offline-first); move large/seasonal content remote
only with a deliberate ADR (it adds a network dependency and CDN ops).

## 4. Android: Addressables + Play Asset Delivery

On Android, Addressables content can be delivered through **Play Asset Delivery** asset packs
(`guides/03 §4`) — install-time / fast-follow / on-demand. This is the integrated path to ship more
content than the base AAB size limit allows. **Forward / Tier-1.**

## 5. CI implications (forward)

Once adopted, the CI build (`guides/10`) gains a **content build step** before the player build,
and the `addressables_content_state.bin` must be **committed/cached** so content updates diff
correctly across runs. Note this in the workflow design when the ADR lands.

## Adoption checklist (Tier 1, gated on an ADR)

- [ ] ADR written (`library/architecture/ADR-<n>-addressables.md`) — why now, local vs remote, PAD or not.
- [ ] `com.unity.addressables` added to `Packages/manifest.json`.
- [ ] Content groups defined; `addressables_content_state.bin` committed/tracked.
- [ ] Content build wired into `BuildScript.cs` + the CI workflow before the player build.
- [ ] Size impact measured against the budget (`guides/08`, co-owned with `mobile-game-perf-guardian`).

## Severity

- **Must-fix:** adding the Addressables package mid-Tier-0 without an ADR / ahead of content
  (violates tier discipline, `CLAUDE.md §6` Rule #1).
- **Should-refactor:** remote groups with no offline fallback for a survival game; content build not
  wired before the player build once adopted.

## Handoffs

- PAD asset-pack delivery → `guides/03`.
- Size budget of bundles → `guides/08` (co-owned with `mobile-game-perf-guardian`).
- The ADR itself → produce it here; PRD authoring (if a feature) → `library-guardian`.
