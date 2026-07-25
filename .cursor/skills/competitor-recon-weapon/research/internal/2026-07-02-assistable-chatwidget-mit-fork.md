---
source_url: C:\Users\jzfer\assistable-chatwidget-reference (local clone of github.com/assistable-ai/chatwidget)
retrieved_on: 2026-07-02
source_type: github-readme
authority: community
relevance: critical
topic: license-scope-audit
weapon: competitor-recon-weapon
---

# assistable-chatwidget-reference local repo clone: MIT fork with foreign upstream origin [internal worked example]

## Summary
A local clone of Assistable's public chat-widget repo. `package.json` declares it as `@assistable/chat-widget`, MIT-licensed, with its own git remote (`github.com/assistable-ai/chatwidget.git`). But the repository's actual `README.md` content is verbatim (or near-verbatim) the README of a DIFFERENT, unrelated open-source project: the "BuildShip AI Chat Widget" by Rowy (`rowyio/buildship-chat-widget`), including BuildShip/Rowy branding, a BuildShip live demo link, and BuildShip-specific setup instructions (`window.buildShipChatWidget.config...`, `@buildshipapp/chat-widget` npm package references). The `LICENSE` file itself is a standard MIT license copyrighted to "Rowy" (2024), not to Assistable. This is a live, concrete example of Critical Directive 6's warning: "license scope is per-artifact, not per-repo-label."

## Key quotations / statistics
- `LICENSE` file, verbatim: "MIT License / Copyright (c) 2024 Rowy / Permission is hereby granted, free of charge, to any person obtaining a copy of this software..." -- the copyright holder is Rowy, not Assistable, despite the repo living under the `assistable-ai` GitHub org and `package.json` naming the package `@assistable/chat-widget`.
- `README.md`, verbatim: "# BuildShip AI Chat Widget / An open-source AI chat widget that can be easily embedded on your website or app. This plug-and-play widget is designed to work seamlessly with your custom [BuildShip](https://buildship.com/) workflow..." and "[TRY LIVE DEMO](https://buildship.com/chat-widget/city-advisor)" -- none of this describes Assistable's product; it is unedited upstream documentation from the forked/vendored project.
- `package.json`: `"name": "@assistable/chat-widget"`, `"description": "A chat widget that can be paired with Assistable workflows built using the Assistant API."`, `"license": "MIT"`, `"repository": {"url": "git+https://github.com/assistable-ai/chatwidget.git"}` -- the metadata that DOES reflect Assistable's actual usage (package name, description, repo pointer) is accurate; only the human-facing README/branding is stale/unedited from the upstream source.
- `src/` directory contains only `index.ts`, `widget.css`, `widget.html`, `widgetHtmlString.ts` -- a small, auditable surface area, consistent with a thin wrapper/rebrand of the upstream BuildShip widget rather than an original build from scratch.

## Annotations for weapon-forge
- This is the single best concrete teaching example for the Weapon's "MIT-fork legal audit" guide section, better than any generic web source is likely to produce, because it shows the FAILURE MODE directly: a repo's top-level license badge/package.json can say "MIT, ours" while its actual copyright holder (per the LICENSE file text) and its README/branding point to a completely different upstream project. The Guardian's job in this situation is to read BOTH the `package.json`/`LICENSE` file AND the actual prose content, and flag the mismatch as a fact (not resolve it, not accuse anyone of anything) -- e.g. "this repo's LICENSE names Rowy as copyright holder; the README describes an unrelated BuildShip product; treat as a vendored/forked third-party asset, confirm reuse terms against the ORIGINAL upstream repo (rowyio/buildship-chat-widget), not just the fork's own package.json."
- Generalizable checklist item for weapon-forge's guide: when auditing an "MIT-licensed fork" for liftable code, always (1) read the LICENSE file's actual copyright line, not just the license SPDX identifier, (2) check whether README/branding content matches the fork's stated product or is stale upstream content, (3) locate the true upstream origin (via `git remote -v`, GitHub's "forked from" banner if the fork was made via GitHub's UI, or textual clues like this README) before concluding what may legally be reused, because a downstream fork inherits the upstream's actual license grant and copyright notice, and a repo label ("assistable-ai/chatwidget") is not itself a legal fact.
- This also validates the Command Brief's exact wording for Critical Directive 6 nearly verbatim ("do not assume MIT blanket permission extends to bundled third-party assets or branded content within the fork") -- weapon-forge can cite this repo directly as the worked example rather than needing an external analog.
