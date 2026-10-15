# Domain connection funnel choice

Continue sequentially in the existing main-based completion branch. The accepted five-funnel roster and implemented root resolver already consume defaultKind, but the connection UI sends only its compatibility default. Complete new/reconnected claim selection using the existing strict API and Select wrapper, without adding a connected-default update operation or any migration/provider action.

1. UX/UI governance: amend domain-setup.md before implementation, use existing labels/wrappers/tokens and the exact five kinds. Initial new default remains Live webinar; reconnect initially retains the saved kind.
2. Implementation: keep the pending choice as draft state, name it in the existing confirmation, send only on confirmed connect and display the server-recorded default on the saved card. Preserve guards, CSRF, uncertainty/reload, modal cancellation, ownership and current-revision checks. No customer roles.
3. Verify all five exact connect payloads, reconnect defaults and explicit change, cancellation, disabled state and existing regressions. Run types and the existing source/security gates. Browser/visual qualification remains required; do not regenerate canonical baselines or retry the blocked fixture-server startup.
4. Close out UX/UI source review, Security self-review then Quality self-review and PR review. Reviews are inline author self-reviews, not independent. Keep this in PR100, separate from the main-based Home hotfix PR101.
