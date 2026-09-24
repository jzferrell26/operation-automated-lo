# Homeowner AVM activation

## Current state

PRD-007 implements address-only valuations, saved report snapshots, optional homeowner association, mortgage calculations, reports, PDF export and refreshes. A property valuation does not require HighLevel.

The current `operation-automated-lo-web` Vercel project was inspected during this implementation. It has the five demo environment settings but no database URL, authentication configuration or RentCast credential. The local project also has no RentCast credential. No real valuation call or customer message was made during qualification. The available Supabase account did not list an Operation Automated LO project. Do not attach this app to an unrelated project's database by guessing its purpose.

## Connect the authenticated workspace

Use an explicitly designated database for AutomatedLO. Apply the repository migrations in timestamp order using the existing migration role procedure, including `supabase/migrations/20260924010000_homeowner_reports.sql`. Existing installations require only unapplied migrations. Never reset a hosted database to install this feature.

The new migration is additive: seven new tables and scoped functions in the `homeowner` schema. Existing data is not transformed. New-table/index creation takes locks on the new relations. It does not require rewriting an existing application table. Roll forward after release; disabling the feature flags preserves report history.

Configure the established first-party authentication runtime using [review-session-seeding.md](review-session-seeding.md) and [../production-environments.md](../production-environments.md). Required server-only values for this path:

| Setting | Value or purpose |
| --- | --- |
| `OALO_DATABASE_URL` | Tenant-runtime database connection, with the established role memberships. Do not expose it to the browser. |
| `OALO_DATABASE_SSL_MODE` | `require` or `verify-full` for hosted connections. |
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
| `OALO_RENTCAST_API_KEY` | RentCast API credential with the required valuation/report-display rights. |
| `OALO_HOMEOWNER_MONTHLY_LOOKUP_LIMIT` | Explicit per-workspace lookup-attempt allowance. Default `0` blocks fresh lookups. Choose the allowance deliberately; this is not a subscription price. |

Redeploy after configuration. In Homeowner reports, choose Create report, then **Property valuation (no contact required)**. Enter and confirm an address, leave mortgage data unknown or supply verified inputs, review the company details, and create the report.

The first report makes one request to `https://api.rentcast.io/v1/avm/value` with `lookupSubjectAttributes=true` and `compCount=5`. The adapter checks the returned street/unit, state and ZIP against the requested property. Address mismatch, missing estimates or invalid data produce an error; they never substitute the fictional sample.

For the first controlled live qualification, check the source is RentCast, verify the address and comparable listings, reload the report, download the PDF, and retry the same request. Reopening, PDF creation and exact retries must not add a valuation request. A fresh valuation for the same address can be reused for 30 days within its workspace. Explicit Refresh value authorizes a new lookup.

Provider attempts are reserved durably before network access, including attempts whose outcome is uncertain. An interrupted request can require human review. The allowance is a cost-control mechanism, not a claim that every provider attempt was billed or that a customer was charged. No Stripe charge or new subscription is implemented here.

## Optional monthly updates and HighLevel handoff

Monthly refreshes use the configured Vercel daily cron at 12:00 UTC, with a bounded batch drain and leases. Configure `CRON_SECRET` to a random secret of at least 32 characters; Vercel sends it as a bearer token. An external authorized scheduler may use `OALO_HOMEOWNER_CRON_SECRET` instead. If both exist, the homeowner-specific secret takes precedence and must match the scheduler. Preview deployments do not prove that the production cron is running.

Enrollment starts off and can be paused. Monthly requests have a stable property/due-date identity. Failed or uncertain work is paused for review, not blindly retried. Loan details older than 35 days are omitted from new monthly reports until current balances are confirmed; older snapshots remain available with their original dates. A property-only enrollment does not send a homeowner message.

For linked homeowner reports, configure `OALO_HOMEOWNER_GHL_CONNECTIONS_JSON` as a server-only map from the **internal workspace location UUID** to a validated connection containing `ghlLocationId`, `accessToken`, `reportUrlFieldId`, and `workflowId`. The mapped HighLevel location must match the location stored in AutomatedLO. Use the installed contact API scopes and verify the designated custom field and workflow in that location. Secrets belong in the environment secret store, not the database or browser.

Set `OALO_HOMEOWNER_DELIVERY_ENABLED=enabled` only after the workflow has been reviewed. Delivery verifies contact ownership and global/channel DND, saves only the designated report-link field, reads it back, and then activates the designated workflow. A successful handoff means HighLevel accepted the workflow request, not that a message was delivered. Confirm actual delivery inside HighLevel. Property-only reports cannot invoke this workflow.

## Sharing, recovery and retention

Share links require an explicit confirmation, use random secrets stored as hashes, expire within 30 days and sooner when source freshness requires it, and can be revoked. Anyone possessing a valid link can view that report's supplied financial details. Do not put share links in public analytics, support screenshots or logs. Creating another link for the same snapshot revokes its previous links.

An explicit review request is recorded for the loan officer. A visit alone is not treated as homeowner intent. Requests are deduplicated. Review controls can close an unfinished lookup after five minutes or acknowledge a delivery hold after checking HighLevel. Neither control sends a message or repeats a valuation. A later lookup requires a new explicit request.

Removing a property deletes its snapshots and share links, but not the HighLevel contact. Minimal usage evidence, consisting of location, opaque request ID and timestamp, remains so deletion cannot reset the lookup allowance. This first release supports 200 tracked properties per workspace and returns the latest 120 snapshots per property. Data rights, retention periods and account deletion procedures must be selected for the actual deployment before collecting customer data.

## Rollback

Unset `OALO_HOMEOWNER_LIVE_DATA` to stop new provider operations; unset `OALO_HOMEOWNER_REPORTS` to close the report surfaces and public share reads. Disable the cron before maintenance. Keep the additive schema and stored reports intact. The parent application remains independently gated. Do not roll back to an older strict browser demo reader without checking compatibility with its newer saved fields.

## References

- RentCast valuation endpoint: https://developers.rentcast.io/reference/value-estimate
- RentCast valuation schema: https://developers.rentcast.io/reference/property-valuation-schema
- HighLevel contacts: https://marketplace.gohighlevel.com/docs/ghl/contacts/get-contact/
- HighLevel update contact: https://marketplace.gohighlevel.com/docs/ghl/contacts/update-contact/
- HighLevel workflow handoff: https://marketplace.gohighlevel.com/docs/ghl/contacts/add-contact-to-workflow/
