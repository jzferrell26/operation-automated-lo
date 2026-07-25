# Pillar 3: Security, Quality & Code Review

## CRITICAL DIRECTIVES

Before acting in this domain you MUST load these skills via the Skill tool:

- `security-weapon`: owns the security audit and remediation pass; runs second-to-last in every implementation plan, immediately before quality.
- `quality-weapon`: owns verifying a completed implementation against its source plan; runs last, after security, never before.
- `dependency-audit-weapon`: owns supply-chain hygiene (scanner selection, vulnerability triage, SBOM generation, lockfile discipline).
- `code-review-pr-weapon`: owns PR description quality, review checklists, the blocker/suggestion/nit taxonomy, and rubber-stamp detection.
- `branching-strategy-weapon`: owns the model decision (trunk-based, GitHub Flow, GitFlow) and the merge-vs-rebase argument.
- `git-weapon`: owns Git mechanics itself: interactive rebase, conflict resolution, history rewriting, reflog recovery.
- `github-repo-health-weapon`: owns repository hygiene auditing: branch protection rulesets, CODEOWNERS, CI density, Conventional Commits adherence.

---

## What this pillar collectively knows

This pillar is the close-out and hygiene layer that sits over every other pillar's work. It has two halves: **the mandatory two-step verification loop** (security then quality) that ends every implementation plan regardless of domain, and **the Git/PR discipline layer** that governs how change gets from a branch to `main` safely.

### Disambiguation table

| Situation | Weapon that owns it | Not this one |
|---|---|---|
| Auditing a branch for OWASP/PII/financial-data exposure, fixing Critical/High findings | `security-weapon` | `quality-weapon` (verifies against plan, not vulnerability scanning) |
| Verifying an implementation matches its PRD/IRD, is it actually done | `quality-weapon` | `security-weapon` (must run first) |
| npm/pip audit noise, Renovate vs Dependabot, SBOM generation | `dependency-audit-weapon` | `security-weapon` (application-code vulnerabilities, not supply chain) |
| Is this PR too large, coaching a review comment, rubber-stamp pattern | `code-review-pr-weapon` | `github-repo-health-weapon` (repo-level settings, not individual PR culture) |
| GitFlow vs trunk-based, merge vs rebase, feature-flag vs feature-branch | `branching-strategy-weapon` | `git-weapon` (mechanics of executing the chosen model) |
| Squashing commits, recovering a deleted branch, `git filter-repo` | `git-weapon` | `branching-strategy-weapon` (the model decision, not the mechanics) |
| Branch protection rulesets, CODEOWNERS coverage, CI workflow density | `github-repo-health-weapon` | `code-review-pr-weapon` (culture, not repo settings) |

### Canonical multi-weapon sequences

1. **Plan execution loop (canonical close-out for every implementation, from any pillar):**
   `security-weapon` audits for OWASP/PII/financial-data exposure and remediates Critical and High findings in place → `quality-weapon` verifies the final implementation against the source plan (completeness, correctness, alignment, regressions) and writes the QA report.
   **This order is load-bearing and non-negotiable.** Running quality before security is a documented anti-pattern because security fixes can invalidate a QA snapshot that was taken before the fixes landed. `quality-weapon` explicitly checks for this: if a QA report already exists with a newer mtime than the last commit and security hasn't run since, it stops and flags the ordering violation rather than silently re-running.
2. **PR hygiene close-out:** `branching-strategy-weapon` confirms the right model is in play → `code-review-pr-weapon` checks the PR description and size → `github-repo-health-weapon` periodically audits the repo-level guardrails (branch protection, CODEOWNERS) that make the above enforceable, not just aspirational.
3. **Supply-chain gate:** `dependency-audit-weapon` runs the scanner and triages findings by CVSS + exploitability → anything that is an application-code-level exploitation path (not just an outdated package) escalates to `security-weapon`.
4. **Dispute/forensic escalation (rare, one-way only):** if a security or quality audit surfaces evidence of vendor fraud or gross negligence rather than an ordinary bug, that becomes a matter for `code-forensics-weapon` (Pillar 6), not a continuation of this pillar's normal loop.

### Load-bearing hard rules and gotchas

- **Security always runs before quality, never after.** This is the single most repeated hard rule across the whole corpus (`security-weapon`, `quality-weapon`, and `dungeon-master`'s own orchestration section all state it independently). Treat any plan that lists quality before security as malformed and correct the order before executing.
- **`quality-weapon` does not write code or fix issues.** It produces a structured findings report only; remediation is the implementation weapon's job, re-audited by `security-weapon` if the fix touches a security-relevant surface.
- **A stale QA report (older mtime than the last commit, or predating a security fix) is not valid evidence of "done."** Re-run `quality-weapon` rather than trusting an old report.
- **`code-review-pr-weapon`'s 400-line threshold is a discipline signal, not a hard cap** — it flags PRs for likely-inadequate review depth, it does not block merges by itself; that enforcement is `github-repo-health-weapon`'s branch-protection domain.
- **`dependency-audit-weapon` triages by CVSS plus actual exploitability**, not CVSS alone — a high CVSS score on an unreachable code path is not automatically a Critical finding.
- **Never use `git filter-branch`** for history rewriting per `git-weapon`; use `git filter-repo` or BFG instead.

---

## Cross-references to sibling pillars

- Every other pillar's implementation work terminates in this pillar's security-then-quality loop; treat this as the universal final step, not an optional add-on.
- Deploy-time secret handling and CI security (OIDC, secret scanning in Actions) lives in **Pillar 4: Deploy & Live Operations** (`devops-weapon`).
- Forensic/legal-grade investigation of vendor fraud (as opposed to routine security audit) escalates to **Pillar 6: Business, Growth & GTM** (`code-forensics-weapon`).
- Factory-pipeline governance (how a brand-new Guardian/Weapon pair itself gets built and registered) is **Pillar 10: Factory & Orchestration** and follows its own separate five-phase discipline, not this pillar's loop.
