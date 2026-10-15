# Combined temporary inquiry retention consumer

Root handled this small consumer inline as cron-scheduling-guardian. The existing main-based property release branch, accepted CTR-004 revision1 and reviewed finite SQL purge govern this source work.

The existing authenticated `/api/jobs/funnel-inquiries` daily schedule remains12:15 UTC. Its handler now calls `campaign.purge_expired_marketing_inquiries()` once, inside the existing scheduler-role transaction. The SQL function alternates three funnel batches and two financing batches, each at most5,000 records, for the same25,000 total invocation bound. The old five-batch funnel loop is removed rather than run alongside it.

The HTTP response retains `{ removed: total }`. Strict finite result parsing requires nonnegative integer counts, funnel at most15,000, financing at most10,000, total at most25,000 and exact family sum. Invalid or unavailable results roll back and return the existing sanitized503. Existing constant-time Cron bearer verification, missing-configuration refusal, connection cleanup and operation while publication flags are disabled remain. The consumer does not require or read inquiry decryption keys and makes no provider call.

Meaningful test-first verification: three valid aggregate cases failed against the unchanged funnel-only implementation, with seven negative cases passing. After the repair, all ten new cases and eight existing delivery/retention cases pass,18 total. The cases assert exactly one combined purge in the transaction, disabled collection, zero/max25,000 results, family limits, sum integrity, malformed result rejection, rollback/no commit and sanitized database failure. Formatting, lint and diff checks pass.

| File | SHA-256 |
| --- | --- |
| apps/web/src/server/funnel-retention.ts | 71790fdb06176666c6d299aeaa591cb6c638a7ac533ed01d358d90014e59cd4d |
| apps/web/src/server/funnel-delivery.unit.test.ts | 70b140ea5da3de6e30468e428783a772a33089b8ddbe80c0ae80327ac5992337 |
| apps/web/src/server/financing-release-retention.unit.test.ts | 149ffe4f52444a09f71a14b1571e1bc0504b9d4a5f3983f3de73473a4df4eca5 |
| Unchanged apps/web/vercel.json | b8671087f50f0b5206d3c11ff625d311500f134ecec0fae47ed7b9d98ea8cbb1 |

No numbered identifier, SQL, role, grant, schedule, dependency or deployment configuration changes. No production deletion, purchase, message, provider request or Git write occurs in this consumer pass. The source joins the frozen output/scheduler schema repair packet for fresh Security then Quality and canonical CI. Actual daily activation and monitoring require deployed qualification; a local unit pass is not evidence a production cleanup ran.
