---
name: competitor-recon-weapon
description: Evidence-first competitor and product teardown arsenal for competitor-recon-guardian. Use when capturing what a competitor product actually does (authenticated logged-in UI walkthroughs via browser automation, public-artifact archaeology across docs repos / openapi.json / llms.txt / .well-known discovery endpoints / MIT-licensed forks, and client JS-bundle vendor-constant mining), verifying findings across multiple account states, organizing a reference-screenshot corpus with PII discipline, and synthesizing a per-surface gap analysis with a phased build-order recommendation. Trigger on "tear down competitor X", "capture their UI", "gap analysis vs our product", "what does competitor Y actually ship", "reference-screenshot corpus", or "find their API surface". Do NOT use for ship/iterate/watch/kill strategy verdicts (white-council-guardian), PRD authorship (library-guardian), or forensic/legal investigation (code-forensics-guardian).
---

# competitor-recon-weapon

The arsenal for `competitor-recon-guardian`. It turns a competitor or reference product into auditable evidence: authenticated UI captures, public-artifact facts, and client-bundle constants, synthesized into a per-surface gap table and a phased build-order recommendation that feeds PRDs and strategy verdicts owned by other Guardians.

This weapon is generalized from a real hand-run teardown: Assistable versus the cuantico-sms portal, 2026-07-02. Throughout the guides, "Assistable" is the worked instance, never a template to copy. The schemas, checklists, and directives are domain-agnostic.

## First action when this weapon is loaded

Read these in order:

1. `guides/00-principles.md` -- the eight hard rules (never mutate live data, read facts not prose, owner-assisted fallback, verify across states, PII discipline, license-scope-per-artifact, route-don't-render, no em dashes) with their justifications.
2. `guides/01-teardown-methodology.md` -- the overall method and the four UX-analysis techniques the walkthrough is built on.
3. `guides/07-gap-analysis-synthesis.md` -- the output you are building toward (the gap-table schema + phased build order), so every capture step is aimed at it.

Then walk the capture and archaeology guides (`02` through `06`) as the specific task requires, and use the templates in `templates/`.

## The eight hard rules (full text in `guides/00-principles.md`)

1. **Never mutate live competitor data.** Authenticated capture uses throwaway/disposable test records only. Basis: `research/external/2026-07-02-reverse-engineering-saas-legal-boundaries.md`.
2. **Read facts, never copy prose.** Describe behavior and structure in your own words; never transcribe competitor copy, UI strings, or branded text. Basis: `research/external/2026-07-02-mit-license-scope-fonts-branding.md`.
3. **Owner-assisted capture fallback.** When tooling cannot export screenshots (no automation, no access), ask the human operator to capture and hand over. Basis: `research/external/2026-07-02-browser-automation-mcp-computer-use.md`.
4. **Verify across multiple account states before recording a gap.** The canonical cautionary tale is the Assistable billing tab: absent in one account, present on a re-billed account, ultimately gated by membership. Basis: `research/internal/2026-07-02-assistable-parity-gap-analysis.md`.
5. **PII handling discipline.** Redact or exclude real personal data; every reference corpus ships a README stating repo privacy, PII contents, and the no-paste-to-external-tools rule. Basis: `research/internal/2026-07-02-assistable-reference-corpus-readme.md`.
6. **License scope is per-artifact, not per-repo-label.** An MIT repo label does not grant trademark/branding rights or cover bundled third-party assets. Basis: `research/internal/2026-07-02-assistable-chatwidget-mit-fork.md` and `research/external/2026-07-02-mit-license-scope-fonts-branding.md`.
7. **Route, do not render.** Strategy verdicts go to white-council-guardian; PRD authorship to library-guardian; forensic/legal investigation to code-forensics-guardian. This weapon gathers evidence and ranks gaps only.
8. **No em dashes, in any report, corpus README, or prose output, ever.**

## The pipeline this weapon runs

```
scope target -> capture (authenticated UI + public artifacts + client bundle)
             -> verify each finding across account states
             -> organize the reference corpus (with PII README)
             -> synthesize per-surface gap table + phased build order
             -> route (white-council / library / code-forensics)
```

Each stage has a guide. The capture stage has three parallel evidence channels (guides 02, 03, 04) that are triangulated: live UI, public artifacts, and client bundle. When two channels disagree, the public docs usually explain the gate (see the billing-tab arc in `guides/05-verify-across-account-states.md`).

## Folder layout

```text
competitor-recon-weapon/
+- SKILL.md                              (this file)
+- README.md                             (one-page human overview)
+- guides/
|  +- 00-principles.md                   (the eight hard rules + justifications)
|  +- 01-teardown-methodology.md         (overall method; 4 UX-analysis techniques)
|  +- 02-authenticated-capture.md        (browser automation, storageState, tiers, owner-assisted fallback)
|  +- 03-public-artifact-archaeology.md  (docs repos, openapi.json, llms.txt, .well-known, agent packages)
|  +- 04-client-bundle-mining.md         (source maps, feature flags, vendor constants)
|  +- 05-verify-across-account-states.md (the billing-tab lesson; verification-state discipline)
|  +- 06-legal-boundaries.md             (the four lines; MIT-fork audit; when to route to code-forensics)
|  +- 07-gap-analysis-synthesis.md       (gap-table schema, severity scoring, phased build order)
|  +- 08-reference-corpus-organization.md (role-split layout, PII README, redaction)
+- examples/
|  +- happy-path-saas-portal-teardown.md (end-to-end worked run, generalized from Assistable)
|  +- edge-case-owner-assisted-and-corrected-finding.md (no-automation fallback + the billing-tab correction)
+- templates/
|  +- gap-analysis-template.md           (generic gap-table schema + Part1/Part2/Part3 skeleton)
|  +- reference-corpus-README-template.md (provenance header + role-split + PII/usage rules)
+- reports/
|  +- README.md                          (how past teardown reports accumulate)
+- research/                             (populated by loremaster; DO NOT MODIFY)
```

## Routing boundaries (hard rule 7, expanded)

| If the task is... | Route to |
|---|---|
| "Should we build this / is it worth it / ship-iterate-watch-kill" | white-council-guardian |
| "Write the PRD to close this gap" | library-guardian |
| "Is this a ToS breach / trade-secret / code-lifting legal question" | code-forensics-guardian |
| "Capture the evidence, rank the gaps, recommend build order" | THIS weapon |

## Open questions carried from research (needs human decision before next refresh)

> TODO: These survived the literature sweep and are flagged in `research/research-summary.md`. Do not invent resolutions.
> 1. Standardized capture tooling: the weapon documents a tier list but does not mandate one tool. (`guides/02-authenticated-capture.md`)
> 2. Corpus redaction protocol: precedent says "keep private," Hard Rule 5 requires redaction; the concrete standard is a user decision. (`guides/08-reference-corpus-organization.md`)
> 3. Authenticated-capture ToS posture: even own-account walkthroughs sit under the target's ToS. (`guides/06-legal-boundaries.md`)

## Pairing

| Role | Artifact |
|---|---|
| This weapon | `ai-tools/skills/competitor-recon-weapon/` |
| Paired Guardian | `ai-tools/agents/competitor-recon-guardian.md` |
| Command Brief | `ai-tools/command-briefs/competitor-recon-guardian-command-brief.md` |
| Strategy verdict (routed) | `white-council-guardian` |
| PRD authorship (routed) | `library-guardian` |
| Forensic/legal (routed) | `code-forensics-guardian` |

---

*Forged by `weapon-forge` from `competitor-recon-guardian-command-brief.md` and `research/`. Part of the Guild AI Tools Factory by [Mario Aldayuz a.k.a @thenotoriousllama](https://github.com/thenotoriousllama).*
