# Homeowner pgTAP inventory Quality self-review

Executed after the scoped Security receipt, by the same author working sequentially. This is not independent review. Source plan: 2026-10-14-homeowner-shared-budget-plan.md, steps1,3 and5, plus the stated CI repair scope in RESUME_COMPLETION_LEDGER.md.

| Obligation | Evidence | Result |
| --- | --- | --- |
| Retain exact schema inventory | supabase/tests/homeowner_reports.pgtap.sql:603 compares all eight exact names | Source verified, native catalog passes |
| Cover new private table without changing tenant semantics | Eight RLS checks at583, exact migration_owner policy at615, original seven tenant policy sets at627 | Native catalog passes |
| Preserve direct access refusal | app_runtime matrix at746 and six other runtime/API role checks at760 include the private budget | Native catalog passes |
| Keep pgTAP test plan honest | Plan247 at42 equals244 original plus one RLS, one policy and one app-runtime assertion | Source verified, pgTAP CI pending |
| Preserve scope | Only this SQL test and receipts/ledger change; no application, dependency, migration or deployment edits | Verified in diff |
| Run Security first | 2026-10-15-homeowner-pgtap-security-self-review.md pins unchanged SQL SHA256 | Verified |
| Canonical gate and mergeability | Earlier run38678749544 fails the stale inventory assertion; native and browser cases in that run pass. Updated-head rerun required | Pending, blocks merge |

Native PostgreSQL17.11 verification is not a full pgTAP run. It checks the changed catalog expressions in an isolated database with all27 migrations; the actual247-test file needs CI's pgTAP extension. Secret and boundary audits pass. No reduced assertion or changed timeout is used. Full product completion and production application remain open.

SQL SHA256 remains1aa3d7d381331e08a36283bab56d0f54fe42e9000a2ce7d00b3f5c26c37f05f6. No unresolved scoped correctness finding; merge remains blocked on the final canonical gate. PR review confirms this small repair is isolated inside the larger preserved-work adoption, identifies the exact failed test, and keeps the PR draft pending qualification.
