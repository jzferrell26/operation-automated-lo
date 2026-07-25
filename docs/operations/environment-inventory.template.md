# Environment inventory template

Fill one section per environment with **non-secret** identifiers only. Store secrets in Vercel, Trigger.dev, and the approved secret manager. Do not commit completed inventory files that contain credentials, connection strings, or access keys.

Related runbook: [cloud-environment-setup.md](cloud-environment-setup.md)

Ledger target: `001J-AC-029`

## Shared decisions

| Field | Value |
| --- | --- |
| Operator | |
| Approver | |
| Correlation ID | `corr_` |
| Primary US region | |
| GitHub repository | `jzferrell26/operation-automated-lo` |
| Vercel Root Directory | `apps/web` |
| Date recorded | |

## Preview

| Resource | Identifier (no secrets) |
| --- | --- |
| Vercel project name / id | |
| Preview URL pattern | |
| `OALO_DATABASE_ID` | |
| `OALO_TASK_PROJECT_ID` | |
| `OALO_SECRET_SCOPE_ID` | |
| `OALO_PRIVATE_STORAGE_ID` | |
| `OALO_PUBLISHED_STORAGE_ID` | |
| `OALO_PROVIDER_APP_ID` | |
| Trigger.dev project ref (`proj_...`) | |
| Trigger preview environment name | |
| Supabase project ref or branching parent | |
| R2 account id | |
| R2 private bucket name | |
| R2 published bucket name | |
| KMS key ARN | |
| Trigger IAM principal name | |
| Stripe mode | `test` |
| Provider mode | `stub` |
| `OALO_PRODUCTION_TRAFFIC` | `disabled` |

## Staging

| Resource | Identifier (no secrets) |
| --- | --- |
| Vercel project or environment name / id | |
| Staging URL | |
| `OALO_DATABASE_ID` | |
| `OALO_TASK_PROJECT_ID` | |
| `OALO_SECRET_SCOPE_ID` | |
| `OALO_PRIVATE_STORAGE_ID` | |
| `OALO_PUBLISHED_STORAGE_ID` | |
| `OALO_PROVIDER_APP_ID` | |
| Trigger.dev project ref | |
| Trigger staging environment name | |
| Supabase project ref | |
| R2 account id | |
| R2 private bucket name | |
| R2 published bucket name | |
| KMS key ARN | |
| Trigger IAM principal name | |
| Stripe mode | `test` |
| Provider mode | `contract-test` |
| `OALO_PRODUCTION_TRAFFIC` | `disabled` |

## Production

| Resource | Identifier (no secrets) |
| --- | --- |
| Vercel project or environment name / id | |
| Production URL (dark shell only) | |
| `OALO_DATABASE_ID` | |
| `OALO_TASK_PROJECT_ID` | |
| `OALO_SECRET_SCOPE_ID` | |
| `OALO_PRIVATE_STORAGE_ID` | |
| `OALO_PUBLISHED_STORAGE_ID` | |
| `OALO_PROVIDER_APP_ID` | |
| Trigger.dev project ref | |
| Trigger production environment name | |
| Supabase project ref | |
| R2 account id | |
| R2 private bucket name | |
| R2 published bucket name | |
| KMS key ARN | |
| Trigger IAM principal name | |
| Stripe mode | |
| Provider mode | blocked until G1 through G7 unlock |
| `OALO_PRODUCTION_TRAFFIC` | `disabled` |

## Isolation proof checklist

- [ ] Every identity string above is unique across preview, staging, and production
- [ ] Preview credentials denied against staging database, buckets, and task env
- [ ] Staging credentials denied against production database, buckets, and task env
- [ ] No production customer traffic alias is live
- [ ] No production data was copied into preview or staging
