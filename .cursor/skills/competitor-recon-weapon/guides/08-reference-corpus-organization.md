# 08 - Reference-corpus organization

How to organize captured screenshots into a durable, governed reference corpus. Hard Rule 5.

## Why a corpus needs governance

Reference screenshots persist in the repo long after the recon session ends. They contain competitor UI and often real PII (names, emails, phone numbers, balances). An ungoverned screenshot dump is a privacy and copyright liability. Every corpus ships a README.

Basis: `research/internal/2026-07-02-assistable-reference-corpus-readme.md`.

## The role-split folder layout

Two-tier structure that generalizes to any multi-role product:

```
<target>-reference/
+- README.md                 (provenance + PII/usage rules; see template)
+- <Role A>/                 (top-level split = whatever role distinction the product has)
|  +- <Module 1>/            (second level = one folder per module/surface)
|  +- <Module 2>/
+- <Role B>/
   +- <Module 1>/
```

The top-level split mirrors the target's real role distinction: agency/sub-account, admin/member, buyer/seller, org-admin/user. The Assistable corpus used "Agency Side" / "Subaccount Side" with one folder per module underneath. Files are kept in visual walk order within each folder so the corpus reads like a walkthrough.

Basis: `research/internal/2026-07-02-assistable-reference-corpus-readme.md`.

## The corpus README (four usage-rule classes)

Every corpus README states, at minimum:

1. **Provenance**: who captured, when, from which account, what pre-task/PRD it satisfies, and which gap-analysis doc it pairs with.
2. **Intended use / distribution restriction**: internal parity work only; do not publish, embed in public docs, or ship any lifted asset.
3. **PII acknowledgment + handling**: what PII the captures contain, keep the repo private, do not paste into external tools.
4. **Behavioral source-of-truth pointer**: where to find behavioral (non-visual) facts, plus the read-facts-never-copy-prose rule.

Use `templates/reference-corpus-README-template.md`.

## Redaction (the precedent-vs-directive tension)

Hard Rule 5 requires redacting or excluding real PII. The precedent Assistable corpus README says "keep private" but does not define a redaction step, so if audited today it would need a redaction pass to fully comply. Treat redaction as the normative standard, not the precedent's weaker practice.

> TODO: open question -- corpus redaction protocol. The concrete standard (redact-before-commit vs private-repo-only, which fields, what tooling) is a user decision to encode at next refresh. (`research/research-summary.md`)

Basis: `research/internal/2026-07-02-assistable-reference-corpus-readme.md`.

## Corpus stays out of your Guardian's git history

The corpus is a competitor-asset store: keep it in the consuming project's private knowledge base, never vendor competitor screenshots or cloned repos into the Guardian's own repo (guide 03, Hard Rule 6).

## Example

- `examples/happy-path-saas-portal-teardown.md` (organizing captures into the corpus with a README)
