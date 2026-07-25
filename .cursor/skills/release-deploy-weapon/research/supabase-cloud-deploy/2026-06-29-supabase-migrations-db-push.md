---
source_url: https://supabase.com/docs/guides/local-development/overview
retrieved_on: 2026-06-29
source_type: official-docs
authority: official
relevance: high
topic: supabase-deploy
weapon: release-deploy-weapon
---

# Supabase: Local development with schema migrations (official docs)

## Summary
The authoritative migration workflow from local to a linked cloud project. Establishes the exact `db push` cutover sequence and, critically, the `db pull` safety step: before pushing local migrations, pull any drift from the remote so you do not clobber out-of-band changes. This is the migration half of the Supabase cutover (the functions half is in the deploy note).

## Key quotations / statistics
- New migration: `supabase migration new create_employees_table`. Test locally: `supabase db reset`.
- Link: `supabase link --project-ref <project-id>` ("You can get <project-id> from your project's dashboard URL").
- Safety pull before push: `supabase db pull` to "Capture any changes that you have made to your remote database before you went through the steps above." Linking populates `supabase/migrations/<timestamp>_remote_schema.sql`, "requiring review before local application."
- Deploy migrations to cloud: `supabase db push`.
- Documented ordered workflow: (1) write SQL in `supabase/migrations/`, (2) `supabase db reset` to test locally, (3) `supabase login`, (4) `supabase link`, (5) `supabase db pull` for remote drift, (6) `supabase db push`.

## Annotations for weapon-forge
- This is the citation of record for the migration-push step in DEPLOY.md. Sequence in the runbook: link -> `db pull` (drift check) -> review the generated remote-schema migration -> `db push`.
- The Cuantico prior art adds the proven non-interactive detail: with `SUPABASE_ACCESS_TOKEN` exported and the project linked, `db push` applies migrations WITHOUT prompting for the DB password, and `supabase migration list` shows Local vs Remote to confirm parity. Cite both.
- `db pull` drift-check is the reversibility discipline for the DB side (directive #4): never blind-push migrations onto a live project without checking for out-of-band schema changes first.
- Lane note: migration AUTHORING is db-guardian; this weapon owns the PUSH/cutover, not the schema design.
