# Homeowner AVM activation

## Current state

PRD-007 implements address-only valuations, saved report snapshots, optional homeowner association, mortgage calculations, reports, PDF export and refreshes. A property valuation does not require HighLevel.

The AVM source is implemented and qualified with synthetic provider responses and real PostgreSQL persistence. A dedicated free Nano Supabase project, `vonesqpyfsrhasuxfiiz` (`operation-automated-lo`, US East), was created in Jonathan Ferrell's personal organization on September 24, 2026. All ten tracked migrations are applied. The separate `oalo_web` runtime login was verified over the transaction pooler with TLS certificate and hostname verification; it cannot assume `migration_owner`, and no tenant rows are visible without a tenant context.

The inspected Vercel project and local workspace still have no RentCast credential. No real valuation call or customer message was made during qualification. Hosted activation and final deployment evidence are recorded in the release follow-up report. Do not treat a configured adapter, successful synthetic lookup, or saved report template as live valuation evidence.

The database qualification above describes September 24. A [read-only October14 inventory](../../library/requirements/reports/2026-10-14-hosted-migration-inventory.md) confirms17 applied migrations through October6; the completion branch has26. Recheck the inventory and provider configuration before activation. The historical ten-migration snapshot does not establish that later migrations are applied.

## Connect the authenticated workspace

Use an explicitly designated database for AutomatedLO. Apply the repository migrations in timestamp order using the existing migration role procedure, including `supabase/migrations/20260924010000_homeowner_reports.sql`. Existing installations require only unapplied migrations. Never reset a hosted database to install this feature.

The new migration is additive: seven new tables and scoped functions in the `homeowner` schema. Existing data is not transformed. New-table/index creation takes locks on the new relations. It does not require rewriting an existing application table. Roll forward after release; disabling the feature flags preserves report history.

Configure the established first-party authentication runtime using [review-session-seeding.md](review-session-seeding.md) and [../production-environments.md](../production-environments.md). Required server-only values for this path:

| Setting | Value or purpose |
| --- | --- |
| `OALO_DATABASE_URL` | Tenant-runtime database connection, with the established role memberships. Do not expose it to the browser. |
| `OALO_DATABASE_SSL_MODE` | `verify-full` for this hosted connection. |
| `OALO_DATABASE_CA_CERT_PEM` | Current public database root CA in PEM format. The driver validates the CA and verifies the peer. A certificate rotation changes the pool fingerprint. This is public trust material, not a private key. |
| `OALO_APP_URL` | Exact HTTPS origin that will serve the authenticated app and shared reports. |
| `OALO_ALLOWED_ORIGINS` | Approved browser origins, including that exact origin. |
| `OALO_CSRF_SERVER_SECRET` | Cryptographically random secret, at least 32 bytes encoded as base64url. |
| `OALO_REVIEW_SURFACE` | `authorized`, selects the existing authenticated runtime. |
| `OALO_DASHBOARD_PREVIEW` | Unset on the authenticated deployment. The demo must not masquerade as a signed-in account. |

For this increment, keep the parent campaign runtime settings `OALO_PROVIDER_MODE=stub`, `OALO_SYNTHETIC_DATA_ONLY=true`, and `OALO_PRODUCTION_TRAFFIC=disabled`. These govern the pre-existing campaign runtime. The explicitly scoped homeowner flags below authorize the new report adapter separately; they do not authorize live ads, billing or campaign publication. Use the correct deployment environment value for the host.

Provision the authorized user's location, role and sign-in through the existing seeding or signup procedure. Confirm a real session can read its own workspace and cannot read another location before enabling valuation lookups. Configure the existing transactional email adapter separately for password recovery; a report workflow is not an account-recovery service.

## Enable the valuation adapter

Set these through the hosting provider's secret/environment interface. Never commit a key, paste it into a report, or use a `NEXT_PUBLIC_` variable.

| Setting | Purpose |
| --- | --- |
| `OALO_HOMEOWNER_REPORTS=enabled` | Makes the authenticated report module available. |
| `OALO_HOMEOWNER_LIVE_DATA=enabled` | Permits the server to construct the live valuation adapter. |
| `OALO_HOMEOWNER_ALLOWED_LOCATION_IDS` | Comma-separated internal workspace UUIDs explicitly approved for live lookups. Empty by default; new signups never inherit paid lookup access. No wildcard is accepted. |
| `OALO_RENTCAST_API_KEY` | RentCast API credential with the required valuation/report-display rights. |
| `OALO_HOMEOWNER_MONTHLY_LOOKUP_LIMIT` | Explicit per-workspace lookup-attempt allowance. Default `0` blocks fresh lookups. Choose the allowance deliberately; this is not a subscription price. |

Apply `20261014170000_homeowner_provider_budget.sql` and configure the shared account budget below before authorizing fresh lookups. A key and workspace allowance alone do not enable paid calls.

Redeploy after configuration. In Homeowner reports, choose Create report, then **Property valuation (no contact required)**. Enter and confirm an address, leave mortgage data unknown or supply verified inputs, review the company details, and create the report.

The first report makes one request to `https://api.rentcast.io/v1/avm/value` with `lookupSubjectAttributes=true` and `compCount=5`. The adapter checks the returned street/unit, state and ZIP against the requested property. Address mismatch, missing estimates or invalid data produce an error; they never substitute the fictional sample.

For the first controlled live qualification, check the source is RentCast, verify the address and comparable listings, reload the report, download the PDF, and retry the same request. Reopening, PDF creation and exact retries must not add a valuation request. A fresh valuation for the same address can be reused for 30 days within its workspace. Explicit Refresh value authorizes a new lookup.

Provider attempts are reserved durably before network access, including attempts whose outcome is uncertain. An interrupted request can require human review. The allowance is a cost-control mechanism, not a claim that every provider attempt was billed or that a customer was charged. No Stripe charge or new subscription is implemented here.

## Configure the shared provider budget

Only the operator who manages the platform's RentCast account configures this budget, using the existing migration-owner procedure against the confirmed AutomatedLO database. Record the approved account, actual billing-period boundaries in UTC, and attempt cap in the release evidence. Keep the credential in the secret store. No budget is seeded by the migration and no paid plan or recommended allowance has been approved by this increment.

Within a migration-owner transaction, bind the approved period and cap as SQL parameters. This statement creates the first period or starts a subsequent period only after the previous period has ended. It cannot reset a counter during its current period:

```sql
insert into homeowner.provider_account_budgets
  (provider_key, billing_period_start, billing_period_end, lookup_limit, enabled)
values ('rentcast', $1::timestamptz, $2::timestamptz, $3::integer, true)
on conflict (provider_key) do update set
  billing_period_start = excluded.billing_period_start,
  billing_period_end = excluded.billing_period_end,
  lookup_limit = excluded.lookup_limit,
  reserved_attempts = 0,
  enabled = true,
  updated_at = clock_timestamp()
where homeowner.provider_account_budgets.billing_period_end <= clock_timestamp()
  and excluded.billing_period_start >= homeowner.provider_account_budgets.billing_period_end
returning provider_key, billing_period_start, billing_period_end,
  lookup_limit, reserved_attempts, enabled;
```

The statement must return one row with the approved values. Zero rows means the existing period has not ended or the new period overlaps it; investigate before proceeding. Save the previous period's final count in the operator evidence before rollover. The application never rolls periods forward automatically. Calls outside AutomatedLO, including manual account tests or other integrations, are not counted here; reserve headroom for them and compare this counter with the provider's actual usage.

A new valuation atomically reserves one shared slot in the same transaction as the workspace attempt. Concurrent workspaces cannot spend the same slot. Exact request retries, recent cached values, saved report reads and PDF creation do not reserve another slot. A committed attempt keeps its slot after a provider failure or property removal. A local transaction rollback restores it. The per-workspace UTC monthly allowance remains an additional limit and does not define the provider's billing cycle.

To stop fresh lookups, set `enabled=false` on the RentCast budget through the same operator procedure. Do not reduce the counter or delete the row to resume a current period. Saved reports and PDFs remain available. Runtime accounts cannot read or reset the table; authenticated availability exposes only a boolean, and each attempt rechecks the cap atomically.

## Optional monthly updates and HighLevel handoff

Monthly refreshes use the configured Vercel daily cron at 12:00 UTC, with a bounded batch drain and leases. Configure `CRON_SECRET` to a random secret of at least 32 characters; Vercel sends it as a bearer token. An external authorized scheduler may use `OALO_HOMEOWNER_CRON_SECRET` instead. If both exist, the homeowner-specific secret takes precedence and must match the scheduler. Preview deployments do not prove that the production cron is running.

Enrollment starts off and can be paused. Monthly requests have a stable property/due-date identity. Failed or uncertain work is paused for review, not blindly retried. Loan details older than 35 days are omitted from new monthly reports until current balances are confirmed; older snapshots remain available with their original dates. A property-only enrollment does not send a homeowner message.

For linked homeowner reports, configure `OALO_HOMEOWNER_GHL_CONNECTIONS_JSON` as a server-only map from the **internal workspace location UUID** to a validated connection containing `ghlLocationId`, `accessToken`, `reportUrlFieldId`, and `workflowId`. The mapped HighLevel location must match the location stored in AutomatedLO. Use the installed contact API scopes and verify the designated custom field and workflow in that location. Secrets belong in the environment secret store, not the database or browser.

Set `OALO_HOMEOWNER_DELIVERY_ENABLED=enabled` only after the workflow has been reviewed. Delivery verifies contact ownership and global/channel DND, saves only the designated report-link field, reads it back, and then activates the designated workflow. A successful handoff means HighLevel accepted the workflow request, not that a message was delivered. Confirm actual delivery inside HighLevel. Property-only reports cannot invoke this workflow.

## Sharing, recovery and retention

Share links require an explicit confirmation, use random secrets stored as hashes, expire within 30 days and sooner when source freshness requires it, and can be revoked. Anyone possessing a valid link can view that report's supplied financial details. Do not put share links in public analytics, support screenshots or logs. Creating another link for the same snapshot revokes its previous links.

The report page and its JSON endpoint answer anyone, so each server instance also counts requests per client address (60 reads and 10 review requests a minute) and answers a caller past that with a refusal before any database lookup. That count lives in the instance's memory and resets on restart, so it is a backstop rather than a fleet-wide limit. Add a Vercel Firewall rate-limit rule for `/home-report/*` and `/api/homeowner-reports/shared/*` before sharing live reports. A request that names no client address is not counted.

An explicit review request is recorded for the loan officer. A visit alone is not treated as homeowner intent. A request is deduplicated while one is open; after the loan officer marks it reviewed, a new request is recorded. The report keeps one request event for good, so what returns is the loan officer's pending-request flag, stamped with the time of the latest open request (migration `20261001090000_homeowner_review_rerequest.sql`). Review controls can close an unfinished lookup after five minutes or acknowledge a delivery hold after checking HighLevel. Neither control sends a message or repeats a valuation. A later lookup requires a new explicit request.

Removing a property deletes its snapshots and share links, but not the HighLevel contact. Minimal usage evidence, consisting of location, opaque request ID and timestamp, remains so deletion cannot reset the lookup allowance. This first release supports 200 tracked properties per workspace and returns the latest 120 snapshots per property. Data rights, retention periods and account deletion procedures must be selected for the actual deployment before collecting customer data.

## Rollback

Unset `OALO_HOMEOWNER_LIVE_DATA` to stop new provider operations; unset `OALO_HOMEOWNER_REPORTS` to close the report surfaces and public share reads. Disable the cron before maintenance. Keep the additive schema and stored reports intact. The parent application remains independently gated. Do not roll back to an older strict browser demo reader without checking compatibility with its newer saved fields.

## References

- RentCast valuation endpoint: https://developers.rentcast.io/reference/value-estimate
- RentCast valuation schema: https://developers.rentcast.io/reference/property-valuation-schema
- HighLevel contacts: https://marketplace.gohighlevel.com/docs/ghl/contacts/get-contact/
- HighLevel update contact: https://marketplace.gohighlevel.com/docs/ghl/contacts/update-contact/
- HighLevel workflow handoff: https://marketplace.gohighlevel.com/docs/ghl/contacts/add-contact-to-workflow/
