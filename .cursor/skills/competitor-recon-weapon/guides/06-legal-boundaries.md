# 06 - Legal boundaries

The lines that keep recon defensible, and the signal for when to stop gathering and route to code-forensics-guardian. Hard Rules 1, 2, 6, and 7 all touch this.

## The four lines

Recon is defensible when it stays inside all four boundaries:

1. **Authentication.** Do not bypass logins. Use your own or the operator's authorized account, or a throwaway account you are entitled to create. The logged-out posture is the most defensible for public-page inspection.
2. **Personal data.** GDPR and CCPA apply the moment you capture PII. Redact/exclude it (Hard Rule 5).
3. **Copyright.** Extract facts, not creative expression (Hard Rule 2).
4. **Rate limiting.** Do not cause server harm; do not hammer live systems; never mutate live data (Hard Rule 1).

Basis: `research/external/2026-07-02-reverse-engineering-saas-legal-boundaries.md`.

## The ToS reality

SaaS acceptable-use policies frequently prohibit: automated mass-download/scraping, extracting data to build a competing product, and reverse-engineering functionality or algorithms. Even technically-accessible data can be "improper means" if acquired by automation at scale. AI has made reverse-engineering fast, which raises scrutiny, not lowers the bar.

Practical posture:
- Default to owner-authorized accounts and throwaway records.
- Frame output as internal parity/gap evidence, never as lifted competing-product data.
- Flag when a capture would require conduct the operator has not authorized, and stop.

> TODO: open question -- authenticated-capture ToS posture. Even own-account walkthroughs sit under the target's ToS. The acceptable posture (which accounts, when to stop, when to route) is a user decision to confirm at next refresh. (`research/research-summary.md`)

Basis: `research/external/2026-07-02-reverse-engineering-saas-legal-boundaries.md`.

## MIT-fork license audit (Hard Rule 6)

An "MIT-licensed" fork is not blanket permission to lift code. Checklist:

1. Read the actual `LICENSE` file's copyright line, not just the SPDX tag. (The Assistable chat-widget fork's LICENSE is copyrighted to Rowy, not Assistable.)
2. Check whether the README/branding matches the fork's stated product or is stale upstream content. (That fork's README is branded BuildShip, an unrelated project.)
3. Locate the true upstream origin (`git remote -v`, GitHub "forked from" banner, textual clues) before concluding what may be reused; a downstream fork inherits the upstream's actual grant and notice.
4. Preserve copyright/license notices on any reused code.
5. Do not assume MIT extends to trademarks, branding, or bundled third-party assets (fonts are a separate licensing category entirely).

The Guardian's job here is to READ and FLAG the mismatch as a fact ("LICENSE names Rowy; README describes BuildShip; confirm reuse terms against the true upstream"), not to resolve it, not to accuse.

Basis: `research/internal/2026-07-02-assistable-chatwidget-mit-fork.md`; `research/external/2026-07-02-mit-license-scope-fonts-branding.md`.

## When to route to code-forensics-guardian

Stop gathering and route the evidence when a finding crosses from UX/feature observation into a legal/forensic judgment: a suspected ToS breach with damages, a trade-secret question, code-lifting/plagiarism, or anything that would become evidence in a dispute. This weapon packages the facts; code-forensics-guardian does the forensic investigation. Do not render the legal conclusion yourself (Hard Rule 7).

## Example

- `examples/edge-case-owner-assisted-and-corrected-finding.md` (includes an MIT-fork flag-and-route moment)
