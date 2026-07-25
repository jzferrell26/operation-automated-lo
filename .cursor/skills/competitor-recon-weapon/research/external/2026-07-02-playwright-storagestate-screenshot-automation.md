---
source_url: https://playwright.dev/docs/auth
retrieved_on: 2026-07-02
source_type: official-docs
authority: official
relevance: high
topic: authenticated-capture
weapon: competitor-recon-weapon
---

# Playwright authenticated storageState screenshot automation

## Summary
Playwright's official auth pattern for capturing authenticated SaaS walkthroughs programmatically: log in once, persist the session (cookies + localStorage + sessionStorage) to a `storageState.json` file, then reuse that state across screenshot runs so every capture starts already logged in. This is the concrete tooling path for competitor-recon-guardian's browser-automation capture step when a reusable scripted approach is preferred over interactive computer-use.

## Key quotations / statistics
- "Playwright stores all cookies, localStorage, and sessionStorage data from your logged-in browser context into a file (like storageState.json). During test execution, Playwright reads that file and restores the browser state exactly as it was after login."
- Three-step workflow: (1) global-setup performs login once and saves state; (2) config points `storageState` at the file; (3) tests/captures reuse it via a browser context.
- Best practice for multi-state capture: "Capture and store different session states for various user roles (admin, user, guest) to test different workflows." (Directly supports the verify-across-account-states directive: keep one storageState per account condition.)
- Security best practice: "Always add storageState files to .gitignore to prevent sensitive data from being exposed in version control." (storageState holds live session tokens = credentials + PII.)

## Annotations for weapon-forge
- Feeds `guides/authenticated-capture.md`: storageState-per-role is the mechanical enabler for the multi-account-state verification directive. One storageState for the rebilled account, one for the non-rebilled, etc. -> reproducible captures of each conditional state.
- The .gitignore rule is a concrete instance of the PII/credential-handling directive: session-state files never enter git, same class of rule as the screenshot corpus staying private.
- Position this as the scripted alternative to interactive computer-use / Claude-in-Chrome (see the browser-automation-tooling note); the weapon should offer both and fall back to owner-assisted capture when neither is available.

## Sources
- https://playwright.dev/docs/auth
- https://www.browserstack.com/guide/playwright-storage-state
- https://www.checklyhq.com/docs/learn/playwright/authentication/
