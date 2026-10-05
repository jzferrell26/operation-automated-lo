# Campaign package deployment notes

Batch B adds a private draft-package table and two authenticated endpoints. It does not change live-provider flags or turn draft outputs into public campaigns.

## Required order

1. Verify the destination database and current migration history through the established migration-role procedure in [Homeowner AVM activation](../../../../docs/operations/homeowner-avm-activation.md). Do not link this local Supabase scaffold to production or assume the previously unverified PRD-008 migrations are present.
2. Apply `supabase/migrations/20261005160000_property_campaign_packages.sql` through that release process. It creates one empty table, indexes, forced row-level policies, and an append-only trigger. It rewrites no existing campaign records. Table creation locks the new table; foreign-key creation briefly locks its referenced tables as documented in the migration. Use the normal migration window.
3. Verify that the table, policies, trigger, and restricted grants exist before deploying the Batch B code. The application runtime receives SELECT and INSERT only. Do not grant it UPDATE, DELETE, migration ownership, or a bypass-RLS role.
4. Confirm that the existing `OALO_APP_URL` is the intended HTTPS application origin, with no credentials, path, query, or fragment. New packages seal that origin into their private preview QR. Do not infer it from an incoming request. No new environment variable or provider credential is required.
5. Deploy the reviewed commit, sign in as an authorized workspace creator with saved branding and a saved Realtor partner, prepare a fictional campaign, and generate its draft materials. Verify all four files, a subsequent reload, and an identical retry. Confirm a viewer can read existing materials but cannot generate, and another workspace cannot read or generate the package.

This session applied the migration only to a dedicated disposable local PostgreSQL database. Hosted migration, deployment and owner visual sign-off are separate release actions, not claimed as completed by local tests.

## Failure and rollback

If the table is missing or unavailable, the campaign page remains readable and says its materials could not be checked. Generation returns an explicit failure and never exposes a partial package. Fix the migration/configuration problem, reload, and retry; a previously saved complete package is reused.

The application can roll back to the previous code without dropping the new table. After real usage, retain stored immutable packages; do not drop the table to undo an application deploy. A template upgrade requires an explicit compatible schema/read strategy, not editing old sealed output records in place.

## Boundaries that remain

These are private drafts. The PDF, HTML, SVG and copy say internal review only. The QR requires an authorized session on the scanning device and does not capture leads. There is no public page, shared review token, approval action, live Meta campaign, automatic messaging, or measured loan outcome in Batch B. Exact-output approval and the verified public/HighLevel lead path remain subsequent recovery batches. The existing broader data-lifecycle and distributed quota release concerns are not waived.
