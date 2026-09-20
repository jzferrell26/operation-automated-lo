## Summary

<!-- What changed and why. Link related issue/PRD/ledger row if any. -->

## Type of change

- [ ] Bug fix
- [ ] Feature / product work
- [ ] Docs / ledger / map only
- [ ] Repo hygiene / tooling
- [ ] Security remediation
- [ ] Breaking change (call out migration)

## Checklist

- [ ] Tests added or updated where behavior changed
- [ ] Docs / ledgers / maps updated when status or ops guidance changed
- [ ] No secrets, tokens, PII, or live spend evidence in the diff
- [ ] Did not flip deferred HighLevel / Meta / Stripe / KMS ACs without sanitized fixtures
- [ ] Squash-merge only (no merge commits onto `main`)
- [ ] For implementation PRs: `security-guardian` then `quality-guardian` completed

## User-visible screens (PRD-006d D10)

Complete this section only when the change adds or alters a screen a person sees. A pull request
that changes a screen and leaves this section empty does not merge; that is a rule, not a
preference (PRD-006d 006D-AC-016).

- [ ] `ux-ui-guardian`'s scored review is recorded and cites the design brief or the component or
      screen specification section it enforces, per brief section 20.
- [ ] axe reports zero violations and the screenshot suite is green at 1440, 1180, 768, and 390 in
      Light and Dark.
- [ ] The token contrast test is green.
- [ ] For the final tree of a feature: the D9 sign-off table in
      `docs/operations/evidence-packs/design-quality-signoff.md` is filled in and passes on every
      axis.

### Baseline note

If any file under `tests/visual/screens/` changed in this pull request, say what the intended
visual change is, on the line below, after the marker. `ux-ui-guardian` reviews that change in
this same pull request (006D-AC-013). Leave the marker in place when no baseline moved.

Baseline change:

## Test plan

<!-- Commands or checks reviewers should run. -->

-

## Related

Closes #
