# 00 - Principles: the eight hard rules

Read this guide on every teardown. These rules are non-negotiable; the rest of the weapon assumes you have internalized them. Each rule has a one-line justification and a research citation.

## 1. Never mutate live competitor data

Authenticated capture uses throwaway, disposable test records only. Never create, edit, or delete real or shared data in a competitor product, even a trial account. Mutating a real account risks corrupting the target's data, breaching terms of service, and tipping off the competitor.

Basis: `research/external/2026-07-02-reverse-engineering-saas-legal-boundaries.md` (the "do not cause server harm" and "improper means" boundaries).

## 2. Read facts, never copy prose

Describe observed behavior, layout, and structure in your own words. Never transcribe competitor marketing copy, UI strings, error messages, or branded text verbatim into a report. Structural and behavioral facts are not copyright-protected; verbatim expression is.

Basis: `research/external/2026-07-02-mit-license-scope-fonts-branding.md`; applied throughout `research/internal/2026-07-02-assistable-parity-gap-analysis.md` ("read for facts and behavior, never copy prose").

## 3. Owner-assisted capture fallback

When capture tooling cannot export screenshots (no browser automation available, no admin/test account, a surface behind a paywall you cannot lawfully reach), do NOT fabricate or silently skip the surface. Ask the human operator to capture and hand over the screenshots. An explicitly-flagged coverage gap beats an unverifiable claim.

Basis: `research/external/2026-07-02-browser-automation-mcp-computer-use.md` (the capture tier list ends in owner-assisted fallback).

## 4. Verify findings across multiple account states before recording

A feature that looks absent in one account state may be conditionally rendered by another (trial vs paid, empty vs populated, single-tenant vs multi-tenant, re-billed vs not). Check the relevant states before recording a gap as confirmed.

The canonical cautionary tale: the Assistable billing tab looked absent, then appeared on a re-billed test account, and was ultimately found to be gated by sub-account membership (resolved by reading the competitor's own public docs). See `guides/05-verify-across-account-states.md`.

Basis: `research/internal/2026-07-02-assistable-parity-gap-analysis.md` (sections 2.10 through 2.12).

## 5. PII handling discipline

Redact or exclude real personal data (names, emails, phone numbers, balances) from any captured corpus. Every reference-screenshot corpus ships a README that states repo privacy, the PII it contains, and the no-paste-to-external-tools rule.

Note the disclosed tension: the precedent corpus README says "keep private" but does not define a redaction step, while this rule requires redaction. Treat redaction as the normative standard; see the open question in `guides/08-reference-corpus-organization.md`.

Basis: `research/internal/2026-07-02-assistable-reference-corpus-readme.md`.

## 6. License scope is per-artifact, not per-repo-label

An MIT repo label is necessary but not sufficient permission. MIT covers the code under that copyright holder and requires notice preservation; it does not grant trademark/branding rights, and bundled third-party assets (fonts, icons, vendored deps) keep their own licenses. Read the actual LICENSE copyright line and each asset's license, not just the repo's top-level SPDX tag.

Worked failure mode: the Assistable chat-widget fork's LICENSE is copyrighted to Rowy, its README is branded BuildShip, and its package is named `@assistable/chat-widget`. Three different origins in one "MIT" repo. See `guides/06-legal-boundaries.md`.

Basis: `research/internal/2026-07-02-assistable-chatwidget-mit-fork.md`, `research/external/2026-07-02-mit-license-scope-fonts-branding.md`.

## 7. Route, do not render

This weapon gathers evidence, verifies it, and ranks gaps with a phased build-order suggestion. It never renders the ship/iterate/watch/kill strategy verdict (white-council-guardian), never authors the PRD that closes a gap (library-guardian), and never draws a forensic/legal conclusion (code-forensics-guardian). When a finding crosses into any of those, package the evidence and route.

Basis: `research/internal/2026-07-02-assistable-parity-gap-analysis.md` (its Part 3 ends by routing to other Guardians); `research/external/2026-07-02-reverse-engineering-saas-legal-boundaries.md` (legal questions escalate).

## 8. No em dashes

No em dashes or en dashes in any report, corpus README, or prose output, ever. Use a comma, colon, parentheses, period, or semicolon. Regular hyphens are fine.

## Examples that put these into practice

- `examples/happy-path-saas-portal-teardown.md` (all rules, end to end)
- `examples/edge-case-owner-assisted-and-corrected-finding.md` (rules 3 and 4)
