# Deploy Runbook: token-only Supabase cutover

Fill in `<ref>` and run top to bottom. Everything below the credential line is token-only except the admin-user seed (service-role key). See `guides/01-deploy-workflow.md`.

## 0. Credentials
```bash
export SUPABASE_ACCESS_TOKEN=sbp_________________________________
REF=____________   # project ref (xxxx in xxxx.supabase.co)
```

## 1. Rehearse locally (do NOT skip)
- [ ] `supabase db reset` applies all migrations + seed cleanly
- [ ] `supabase functions serve <name>` runs and returns expected status
- [ ] `supabase test db` RLS enforcement test passes

## 2. Link
```bash
supabase link --project-ref $REF
```
- [ ] Linked; reviewed config drift output

## 3. Push migrations (db-guardian's SQL)
```bash
supabase db push --dry-run
supabase db push
```
- [ ] Migrations applied to cloud

## 4. Deploy functions
```bash
supabase functions deploy
```
- [ ] Functions deployed

## 5. Set external secrets (NOT the auto-injected Supabase keys)
```bash
supabase secrets set --env-file ./supabase/.env
supabase secrets list
```
- [ ] Only external secrets set

## 6. Enable the custom access-token hook
```bash
curl -s -X PATCH "https://api.supabase.com/v1/projects/$REF/config/auth" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"hook_custom_access_token_enabled": true, "hook_custom_access_token_uri": "pg-functions://postgres/public/custom_access_token_hook"}'
```
- [ ] Hook enabled (NOT just defined)

## 7. Seed admin users (if needed; service-role key, server-side)
```bash
curl -s -X POST "$SUPABASE_URL/auth/v1/admin/users" \
  -H "apikey: $SERVICE_ROLE_KEY" -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"...","email_confirm":true,"app_metadata":{"app_role":"admin"}}'
```
- [ ] Admin user(s) seeded

## 8. Verify
- [ ] Fresh JWT decoded; `app_metadata.app_role` present
- [ ] Denied-RLS query with a real user token returns nothing for a non-owner
- [ ] Each deployed function returns expected status

## Notes / deviations
> Record anything that differed from this runbook, and any `> TODO: open question` items.
