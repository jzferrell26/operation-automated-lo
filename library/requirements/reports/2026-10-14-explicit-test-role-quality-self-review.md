# Explicit test role Quality self-review

Performed after the explicit-test-role Security self-review, for the same helper-only delta after106a639. Author self-review, not independent review.

The integration ledger requires the real authentication suite to run with exact original permissions restored. The helper retains both obligations while avoiding special role specifications in GRANT/REVOKE. There are no changes to test assertions, skips, thresholds, application authority, migration history or visual baselines.

Evidence: tmp/native-restricted-auth-explicit-member.log contains16 passes, zero failures/skips and exact original ADMIN/INHERIT/SET memberships restored. Formatting, lint, the database privilege-escalation contract and diff whitespace checks pass. An initial invocation selected the unit project incorrectly and found no tests; it is not counted as a pass. The corrected contracts invocation ran the boundary test.

Result: local delta PASS, canonical Supabase CI pending. The previous CI CONNECTION_CLOSED failure is retained as failure evidence, not declared fixed on vanilla PostgreSQL evidence alone. Whole-product completion remains HOLD under RESUME_COMPLETION_LEDGER.md.
