---
source_url: https://opensource.org/license/mit
retrieved_on: 2026-07-02
source_type: official-docs
authority: official
relevance: high
topic: license-scope
weapon: competitor-recon-weapon
---

# MIT license scope, bundled assets, fonts, and branding (2026)

## Summary
The legal framing behind the weapon's most sensitive directive (Critical Directive 6). Confirms that MIT permits commercial use/modification/distribution subject to preserving the copyright notice, but that permission is bounded: it does not cover trademarks/branding, and bundled third-party assets (fonts especially) are a separate licensing category. This is the current-practice generalization of the internal chatwidget-fork finding (LICENSE copyrighted to Rowy, README branded BuildShip, package named @assistable/chat-widget).

## Key quotations / statistics
- "The MIT License is a permissive open-source license ... subject to preserving the copyright notice and disclaimer. The primary requirement is to include the original copyright notice and the license text in all copies or substantial portions of the software."
- Bundled deps caveat: "Some dependencies may have licenses with copyleft terms; ensure all included components collectively comply with your distribution model." Compliance for bundled/minified output needs scanning "where notices might otherwise be obscured."
- Branding: "ensure you do not imply endorsement by original authors or misrepresent affiliations. Separate branding guidelines should be followed for any trademarks owned by the project maintainers."
- Fonts are a separate category: "embedding a typeface into a software product, a SaaS platform, or an OEM interface is an entirely different licensing category from just using a font in a design."
- 2026 practice: OSI clarifications support "machine-readable notices ... through integration with the SPDX standard."

## Annotations for weapon-forge
- `guides/legal-boundaries.md` code-liftability checklist: (1) read the actual LICENSE copyright line, not just the SPDX tag; (2) preserve notices on any reused code; (3) do not assume MIT extends to trademarks/branding; (4) treat bundled fonts/icons/assets as separately licensed; (5) when the analysis becomes a legal/forensic judgment, route to code-forensics-guardian rather than ruling.
- Pairs directly with the internal chatwidget-mit-fork note as the generalization: the internal note is the worked failure mode, this note is the rule it violates.
- Reinforces read-facts-never-copy-prose: MIT covers code reuse with notices, never the branded expression.

## Sources
- https://opensource.org/license/mit
- https://en.wikipedia.org/wiki/MIT_License
- https://www.fontfabric.com/blog/enterprise-font-licensing-compliance-and-risk/
- https://tlo.mit.edu/industry-entrepreneurs/license/license-mits-trademark
