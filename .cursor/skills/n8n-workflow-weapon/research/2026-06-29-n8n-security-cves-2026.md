---
source_url: https://www.upwind.io/feed/six-n8n-cves-one-day-workflow-security + https://thehackernews.com/2026/02/critical-n8n-flaw-cve-2026-25049.html + https://www.aikido.dev/blog/n8n-rce-vulnerability-cve-2026-21858
retrieved_on: 2026-06-29
source_type: blog
authority: practitioner
relevance: medium
topic: security
weapon: n8n-workflow-weapon
---

# n8n 2026 security CVEs (production-safety context, not in-scope to fix)

## Summary
Context source: in Q1 2026 six critical n8n CVEs were disclosed, including unauthenticated RCE chains. Relevant to this Guardian only as production-safety AWARENESS (it edits live client workflows on self-hosted instances), NOT as something it remediates — security audits route to security-guardian. Included because credential exposure and webhook/expression injection touch the exact surfaces this Guardian manipulates (webhooks, expressions, credentials).

## Key quotations / statistics (verbatim)

> "Between January and March 2026, security researchers disclosed six critical vulnerabilities in n8n — including multiple unauthenticated remote code execution (RCE) chains."

CVE-2026-21858 "Ni8mare" (verbatim): "CVSS score 10.0 ... allowing attackers to remotely execute code and fully take over vulnerable instances without any authentication." Root cause: "a Content-Type confusion flaw in n8n's webhook and file-handling logic."

CVE-2026-27577 (verbatim): "a sandbox escape in the expression compiler: a missing case in the AST rewriter lets `process` slip through untransformed, giving any authenticated expression full RCE."

CVE-2026-27493 (verbatim): "a 'double-evaluation bug' in n8n's Form nodes ... leverage a public 'Contact Us' form to execute arbitrary shell commands by simply providing a payload as input into the Name field."

Credential exposure (verbatim): "access sensitive credentials such as API keys, OAuth tokens, and database passwords stored within the platform."

## Annotations for weapon-forge
- Use this as a single "production-safety note" in the guides, NOT a remediation guide. The Guardian's relevant takeaways: (1) keep target instances patched (the operator's job); (2) be disciplined with expressions in webhook/Form nodes, since expression injection is a live attack surface; (3) never paste real secrets into workflow JSON or research artifacts — consistent with the no-secrets rules in CLAUDE.md and the `newCredential()` reference pattern.
- Explicit boundary for weapon-forge: do NOT author a security catalog here. Cross-reference security-guardian and stop. Relevance is medium and the content is awareness-only.
