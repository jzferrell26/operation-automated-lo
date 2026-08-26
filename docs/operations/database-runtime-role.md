# Database runtime role activation

**Status:** enforced in application transaction helpers (H3 reverse-review remediation)

## Model

Platform migrations create NOLOGIN roles `app_runtime` and `support_runtime` with `INHERIT false`. RLS policies and grants target those roles. The pooled login role (Supavisor / `DATABASE_URL`) receives `GRANT ... TO <login> WITH SET true, INHERIT false`, so the connection does **not** inherit privileges until the session activates the runtime role.

## Application path

`packages/db` issues transaction-local role activation inside every scoped transaction:

| Helper | Statement |
| --- | --- |
| `withTenantTransaction` | `SET LOCAL ROLE app_runtime` |
| `withSupportTransaction` | `SET LOCAL ROLE support_runtime` |

Order after `BEGIN`: assume runtime role → `platform.set_app_context` / `platform.begin_support_access` → work → `COMMIT` (role resets with the transaction).

Unit proof: `tooling/tests/unit/production-foundation/database-production-paths.test.ts` asserts the assume-role statement precedes context setup.

## Opt-out (admin only)

Set `OALO_DB_ASSUME_RUNTIME_ROLE=false` (or `0` / `off`) only for migration or owner tooling that must connect outside the app runtime path. Default is on. Do not disable this for web or task workers.

## Production checklist

- Login role used by web/tasks must be granted `app_runtime` and `support_runtime` with `SET` privilege.
- Do not connect application pools as `migration_owner` or a superuser bypass role.
- pgTAP suites already use `SET LOCAL ROLE app_runtime`; keep application and test models aligned.
