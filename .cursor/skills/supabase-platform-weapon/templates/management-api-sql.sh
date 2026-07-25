#!/usr/bin/env bash
# Management API helpers for supabase-platform-guardian.
# Token-only: needs SUPABASE_ACCESS_TOKEN and the project ref. See guides/01-deploy-workflow.md.
# No DB password or service-role key required for these.
set -euo pipefail

: "${SUPABASE_ACCESS_TOKEN:?set SUPABASE_ACCESS_TOKEN}"
: "${REF:?set REF to the project ref}"
API="https://api.supabase.com/v1/projects/$REF"

# run_sql FILE  -- run arbitrary SQL from a file. Build the JSON body with jq -Rs so
# multi-line SQL is escaped correctly. NEVER hand-escape SQL into JSON.
run_sql() {
  local file="$1"
  jq -Rs '{query:.}' < "$file" \
    | curl -s -X POST "$API/database/query" \
        -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
        -H "Content-Type: application/json" \
        --data @-
}

# run_sql_inline 'SELECT 1;'  -- same, for a one-liner.
run_sql_inline() {
  printf '%s' "$1" | jq -Rs '{query:.}' \
    | curl -s -X POST "$API/database/query" \
        -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
        -H "Content-Type: application/json" \
        --data @-
}

# enable_access_token_hook  -- ENABLE the custom access-token hook (not just define it).
# Confirm the field names against the live Management API for your CLI version.
enable_access_token_hook() {
  curl -s -X PATCH "$API/config/auth" \
    -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "hook_custom_access_token_enabled": true,
      "hook_custom_access_token_uri": "pg-functions://postgres/public/custom_access_token_hook"
    }'
}

# Usage:
#   REF=xxxx ./management-api-sql.sh run_sql ./ops.sql
#   REF=xxxx ./management-api-sql.sh run_sql_inline 'select count(*) from auth.users;'
#   REF=xxxx ./management-api-sql.sh enable_access_token_hook
"$@"
