---
name: guild-lore
description: The Grand Library of the Guild. A distilled reference corpus that absorbs the entirety of the package's Weapon arsenal (114 Weapons plus the factory pipeline and orchestrator skills) into ten pillar guides, each cross-referencing the specific Weapons relevant to its domain. Trigger on "load the guild lore", "arm me for <domain>", "what does the Guild know about X", "grand library", "consult the grand library", or when an orchestrating or sub-agent needs a fast, pre-distilled map of which Weapons cover a domain before diving into individual SKILL.md files.
license: MIT
---

# Guild Lore: The Grand Library

`guild-lore` is not a Weapon that does work. It is a reference index over every other Weapon in this package, distilled one guide per corpus pillar. Its purpose is to get an orchestrator or sub-agent oriented fast: which Weapons exist for a domain, who owns what when two Weapons look similar, what sequences chain them together, and what hard rules and gotchas are load-bearing enough to know before touching that domain at all.

## The double-reinforcement contract

Every pillar guide below is loaded through two independent reinforcement points, by design:

1. **The index line below** names the guide's Weapons in a `MANDATORY LOAD:` list, right next to the link. An orchestrator reading only this SKILL.md already knows what to load before opening the guide.
2. **The guide itself** repeats the same Weapon list at the very top, under a `CRITICAL DIRECTIVES` header, with a one-line why-each.

This is deliberate redundancy, not an oversight. An agent that skims only the index still gets the load list. An agent that jumps straight to a guide (via a direct file reference, a search hit, or a sub-agent hand-off that skipped SKILL.md) still gets the load list from the guide's own header. Two independent surfaces stating the same mandatory loads means the instruction survives being encountered from either direction, and the act of loading each named Weapon is itself how the orchestrator's context absorbs the Guild's arsenal rather than just pointing at it.

Load `guild-lore` itself first to get the map. Then load the specific pillar guide for the domain in play. Then load every Weapon that guide's `CRITICAL DIRECTIVES` block names, via the Skill tool, before acting.

## How to use this skill

1. Identify which pillar the task belongs to from the index below (a task can span more than one pillar; load every relevant guide).
2. Open the guide file. Its `CRITICAL DIRECTIVES` block is your load checklist.
3. Load every named Weapon via the Skill tool before doing domain work in that pillar.
4. Use the guide's disambiguation table when two Weapons look like they could both apply, its canonical sequences when the task is a known multi-Weapon chain, and its hard-rules section for gotchas that are easy to miss from a Weapon's SKILL.md alone.
5. Follow the guide's cross-reference section to sibling pillars when the task spans domains.

If no pillar matches, fall back to `dungeon-master` (Pillar 10) to route the request directly, or consult a Weapon's own SKILL.md if you already know its name.

## Guide index

| # | Pillar | Guide | MANDATORY LOAD |
|---|---|---|---|
| 1 | Frontend & Design Systems | [`guides/01-frontend-design-systems.md`](guides/01-frontend-design-systems.md) | MANDATORY LOAD: react-weapon, preact-weapon, design-system-weapon, ux-ui-weapon, dark-mode-theming-weapon, typography-font-weapon, font-loading-weapon, icon-system-weapon, image-optimization-weapon, modal-toast-dialog-weapon, csv-xlsx-import-export-weapon, product-tour-onboarding-ui-weapon, markdown-mdx-content-pipeline-weapon, lighthouse-pagespeed-weapon, seo-aeo-weapon, website-weapon, expo-react-native-weapon |
| 2 | Backend, Data & APIs | [`guides/02-backend-data-apis.md`](guides/02-backend-data-apis.md) | MANDATORY LOAD: db-weapon, supabase-platform-weapon, python-weapon, http-rest-fundamentals-weapon, api-docs-weapon, auth-weapon, payments-weapon, crm-integration-weapon, cron-scheduling-weapon, discord-bot-weapon, telegram-bot-weapon, slack-app-weapon, asset-weapon |
| 3 | Security, Quality & Code Review | [`guides/03-security-quality-code-review.md`](guides/03-security-quality-code-review.md) | MANDATORY LOAD: security-weapon, quality-weapon, dependency-audit-weapon, code-review-pr-weapon, branching-strategy-weapon, git-weapon, github-repo-health-weapon |
| 4 | Deploy & Live Operations | [`guides/04-deploy-live-operations.md`](guides/04-deploy-live-operations.md) | MANDATORY LOAD: devops-weapon, release-deploy-weapon, live-latency-weapon, terminal-bash-weapon, status-page-weapon, runbook-writing-weapon, changelog-release-notes-weapon, cursor-ide-weapon, ai-coding-tools-weapon |
| 5 | AI & Cognitive Systems | [`guides/05-ai-cognitive-systems.md`](guides/05-ai-cognitive-systems.md) | MANDATORY LOAD: mind-weapon, ai-tools-platform-weapon, hivemind-weapon |
| 6 | Business, Growth & GTM | [`guides/06-business-growth-gtm.md`](guides/06-business-growth-gtm.md) | MANDATORY LOAD: affiliate-referral-program-weapon, alt-ads-platforms-weapon, blogging-content-strategy-weapon, cold-outreach-weapon, customer-support-tooling-weapon, hiring-ats-weapon, hr-payroll-weapon, incorporation-startup-stack-weapon, investor-cap-table-weapon, knowledge-base-help-center-weapon, legal-docs-weapon, live-chat-support-weapon, newsletter-platform-weapon, product-feedback-roadmap-weapon, review-funnels-g2-weapon, social-media-marketing-organic-weapon, app-store-submission-weapon, code-forensics-weapon |
| 7 | Product Process & Documentation | [`guides/07-product-process-documentation.md`](guides/07-product-process-documentation.md) | MANDATORY LOAD: adr-writing-weapon, agile-scrum-weapon, discovery-research-weapon, estimation-weapon, kanban-flow-weapon, okr-goal-setting-weapon, retrospective-weapon, readme-writing-weapon, technical-writing-craft-weapon, docs-site-weapon, knowledge-weapon, library-weapon, wiki-weapon |
| 8 | Cuantico Operator (GHL / n8n / live events / recon) | [`guides/08-cuantico-operator.md`](guides/08-cuantico-operator.md) | MANDATORY LOAD: gohighlevel-weapon, n8n-workflow-weapon, live-event-ops-weapon, contact-enrichment-weapon, assistable-sms-weapon, email-marketing-weapon, social-publishing-weapon, social-creative-weapon, competitor-recon-weapon |
| 9 | Unity Game Dev cohort (PROJECT-DRIFT) | [`guides/09-unity-game-dev.md`](guides/09-unity-game-dev.md) | MANDATORY LOAD: unity-csharp-weapon, unity-mcp-weapon, unity-test-ci-weapon, unity-build-weapon, unity-rendering-weapon, unity-art-pipeline-weapon, unity-audio-weapon, unity-level-design-weapon, mobile-game-perf-weapon, game-feel-juice-weapon, game-balance-weapon, fsm-ai-weapon, character-art-rig-weapon, character-progression-weapon, procedural-generation-weapon, save-load-weapon, touch-input-weapon |
| 10 | Factory & Orchestration (router, commands, pipeline, model matrix) | [`guides/10-factory-orchestration.md`](guides/10-factory-orchestration.md) | MANDATORY LOAD: dungeon-master, command-center, weapon-forge, guardian-creator, dm-registrar, dms-hand-weapon, session-zero-weapon, the-gauntlet-glove |

## Coverage notes

- This index covers every Weapon folder under `.claude/skills/` that has a populated `SKILL.md` as of authoring: 114 Weapons across ten pillars, plus the routing skill and the factory pipeline skills counted in Pillar 10.
- One folder, `ai-docs-weapon`, exists on disk but contains only an unpopulated `research/` subfolder with no `SKILL.md`; it is not a forged Weapon and is not mandated anywhere in this corpus. The forged API-documentation Weapon is `api-docs-weapon` (Pillar 2).
- Many Pillar 8 weapons (and Pillar 4's `release-deploy-weapon`) mutate LIVE client or production state and are on-demand only: load them per the pillar guide, but invoke them deliberately or via a peer hand-off, never as a silent default.
- `loremaster`, the factory pipeline's research phase, is an agent (`.claude/agents/loremaster.md`) rather than a Weapon folder, so it appears in Pillar 10's sequences but not in any MANDATORY LOAD list.
