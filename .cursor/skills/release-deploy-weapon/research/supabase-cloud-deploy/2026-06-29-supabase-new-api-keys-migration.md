---
source_url: https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys
retrieved_on: 2026-06-29
source_type: official-docs
authority: official
relevance: critical
topic: supabase-deploy
weapon: release-deploy-weapon
---

# Supabase: Migrating to publishable and secret API keys (official docs)

## Summary
A 2026-current breaking change that directly reshapes the env matrix and the cutover. Supabase is retiring the legacy `anon` and `service_role` JWT keys in favor of `sb_publishable_...` (low privilege, client-safe) and `sb_secret_...` (elevated, server-only, bypasses RLS). Legacy keys are deprecated by end of 2026; new and restored projects (since Nov 1, 2025) no longer ship with the legacy keys at all. Both key types work simultaneously during migration, enabling a one-client-at-a-time swap. This maps cleanly onto the Guardian's NEXT_PUBLIC (publishable) vs server-only (secret) hard line.

## Key quotations / statistics
- Publishable keys: format `sb_publishable_...`, carry "the same low privileges as the `anon` key" (RLS still applies). Use in frontend, mobile, public code, and any CLI/script that ships to users.
- Secret keys: format `sb_secret_...`, "bypass Row Level Security and have full access to your data." Use in servers, Edge Functions, cron jobs.
- "Both key types work simultaneously, so you can swap clients one at a time and deactivate the legacy keys only after nothing depends on them."
- Timeline (from corroborating Supabase changelog/discussion #40300): legacy anon and service_role keys "will be deprecated by the end of 2026"; "as of November 1, 2025, projects restored from that date will no longer be restored with the legacy API keys, and new projects no longer have anon and service_role available for use."
- Edge Functions get new env vars: `SUPABASE_PUBLISHABLE_KEYS` and `SUPABASE_SECRET_KEYS` (JSON objects keyed by name), alongside the legacy `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY`.

## Annotations for weapon-forge
- This is a HIGH-PRIORITY 2026 update the weapon must encode. The env matrix in DEPLOY.md should default to the new keys: `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or the makerkit naming `NEXT_PUBLIC_SUPABASE_PUBLIC_KEY`) client-side, `SUPABASE_SECRET_KEY` server-only. The makerkit runbook (cutover-runbook/) already uses exactly this naming, confirming the new convention is live in production templates.
- Maps onto directive #1: publishable = NEXT_PUBLIC-safe; secret = server-only, never in a NEXT_PUBLIC var. The privilege boundary is identical to the old anon/service_role split, so the hard-line rule carries over unchanged.
- Cutover relevance: the "both keys work simultaneously, swap one client at a time" guidance is a textbook staged-reversible cutover (directive #4). The weapon's key-rotation section should follow this exact pattern.
- CONTRADICTION to resolve: one practitioner source (kuberns, cutover-runbook/) claims NO mention of the key deprecation; that source is simply stale/incomplete, not a real conflict. The official migration doc + changelog #40300 are authoritative. Flag for weapon-forge to cite the official doc, not the practitioner blog, on key migration.
