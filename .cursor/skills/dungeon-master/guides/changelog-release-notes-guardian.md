# changelog-release-notes-guardian — Dungeon Master's Guide

The Dungeon Master routing skill's record of when to invoke `changelog-release-notes-guardian`. Use this guide to decide whether a user request belongs to this Guardian.

**Guardian:** [`ai-tools/agents/changelog-release-notes-guardian.md`](../../agents/changelog-release-notes-guardian.md)  
**Weapon:** [`ai-tools/skills/changelog-release-notes-weapon/`](../../skills/changelog-release-notes-weapon/)  
**Command Brief:** [`ai-tools/command-briefs/changelog-release-notes-guardian-command-brief.md`](../../../command-briefs/changelog-release-notes-guardian-command-brief.md)  
**Trigger policy:** proactive

---

## Domain

`changelog-release-notes-guardian` owns the full lifecycle of public-facing product changelogs and release notes. This includes tool selection (Headway, FeatureBase, Productlane, Beamer, or self-hosted markdown), copy craft (turning shipped commits into user-centric announcements), distribution strategy (in-app widget, email digest, community posts, blog), and changelog quality audits. It is the only Guild Guardian that specializes in the communication artifact that bridges the engineering deploy and the user understanding of what changed.

## Trigger phrases

Route to `changelog-release-notes-guardian` when the user says any of:

- "Write my changelog entry"
- "We just shipped X, write the release notes"
- "Set up a changelog tool"
- "Which changelog tool should we use?"
- "Compare Headway vs FeatureBase"
- "Review our release notes"
- "Our changelog is terrible, help"
- "Plan our announcement for this release"
- "How should we distribute this release?"
- "Add an honest scope note"
- "What's the right format for a breaking change entry?"

Or when the request implicitly involves communicating a shipped product change to end users.

## Do NOT route when

- The user wants to manage the deploy or CI/CD pipeline — route to `devops-guardian`.
- The user wants a full marketing campaign, landing page, or launch website — route to `website-guardian`.
- The user wants internal sprint retrospectives or team-facing release notes — not in scope for any current Guardian; handle inline.
- The user is asking about internal project documentation (`library/`) — route to `library-guardian`.

If a request straddles `changelog-release-notes-guardian` and `website-guardian` (e.g., "publish our changelog as a blog post"), prefer `changelog-release-notes-guardian` for the content and `website-guardian` for the page infrastructure.

## Inputs the Guardian needs

Before invoking, ensure the user has provided (or you can infer):

- **What shipped:** PR titles, commit log, Linear/Jira ticket list, or a freeform description.
- (Optional) **Existing changelog tool** — name of platform if one exists.
- (Optional) **Target audience** — paying customers, developer API consumers, public community.
- (Optional) **Distribution channels in place** — email list, in-app widget, Slack community.

If "what shipped" is missing, ask before invoking — the Guardian cannot write a changelog entry without knowing what changed.

## Outputs the Guardian produces

- **Primary:** A ready-to-publish changelog entry (markdown or platform-native format).
- **Distribution checklist:** Attached to every entry — channels to fire and in what order.
- **Tool setup instructions:** When a new tool is being configured.
- **Audit report:** When auditing an existing changelog; uses `templates/audit-report.md`.

## Multi-Guardian sequences this Guardian participates in

- **Post-deploy announcement sequence:** `devops-guardian` (runs the deploy) → `changelog-release-notes-guardian` (writes and distributes the entry). The natural handoff is after `devops-guardian` confirms a successful production deploy.

## Critical directives the orchestrator should respect

- Never paste raw git logs into an entry — the Guardian will always reframe for user impact.
- Always produce a distribution checklist alongside every entry.
- Surface the honest scope note whenever a publicly-discussed feature is absent from the release.

(Full list in the Guardian file's `## Critical directives` section.)

---

*Part of Dungeon Master's roster. See [`ai-tools/skills/dungeon-master/SKILL.md`](../SKILL.md) for the full Guild.*
