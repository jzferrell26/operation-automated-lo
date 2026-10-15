# Homeowner pgTAP inventory Security self-review

Scope: the test-only follow-up to the shared provider budget plan. Executed inline by the implementation author under the project's sequential recovery instruction. This is not independent review.

Canonical CI38678749544 failed only the old exact seven-table assertion in supabase/tests/homeowner_reports.pgtap.sql. Its actual inventory includes provider_account_budgets. The same run passed174 native database cases,323 route cases and the browser journeys, including163 review and4 empty-catalog cases. These observations do not turn the overall failed run into a pass.

The repair retains the seven tenant-table policy and isolation assertions. Lines583 onward now require forced RLS on all eight tables and the exact eight-name inventory. The new policy assertion at615 requires the budget's only policy to target migration_owner. The app_runtime privilege matrix at746 and the six other role assertions at760 include the budget table and expect no direct access. The pgTAP plan increases244 to247 for the additional RLS, policy and app-runtime checks. No policy, grant, migration, production configuration or application code changes.

Native PostgreSQL17.11 catalog verification applied all27 migrations to a disposable database, reproduced the old inventory mismatch, and passed the exact new policy expression, eight-table forced RLS, seven runtime/API privilege refusals and unchanged seven tenant policy sets. Evidence: tmp/native-pgtap-inventory.log. The first probe used the wrong local port; the second lacked the local authenticated role. Those harness failures were corrected, not represented as passes. The final helper removes its disposable database and newly created roles; its owned PostgreSQL instance was stopped.

Security categories reviewed for this diff: access control and RLS assertions, SQL construction, fixture/secret exposure, data writes and retention, dependency/configuration changes. Only literal catalog predicates and synthetic names are added. Secret and boundary audits pass. No unresolved Security finding in this scoped test repair. Full pgTAP remains pending canonical CI because the Windows native installation has no pgTAP extension.

Reviewed SQL SHA256: 1aa3d7d381331e08a36283bab56d0f54fe42e9000a2ce7d00b3f5c26c37f05f6. Quality must run after this receipt. Existing whole-product, hosted/provider and browser access limitations remain unchanged.
