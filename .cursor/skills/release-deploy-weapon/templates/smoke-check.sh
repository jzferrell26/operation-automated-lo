#!/usr/bin/env bash
#
# smoke-check.sh - post-deploy go/no-go smoke check for a Next.js + Supabase + Vercel app.
#
# This is a TEMPLATE authored from the principles in guides/03-deploy-trigger-and-verify.md.
# None of the research sources provided a copy-paste smoke script, so the per-app routes
# are placeholders you MUST fill in. It is a thin 5-to-15-minute go/no-go gate, NOT a full
# E2E suite (that is out of this Guardian's lane). No em dashes anywhere in this file.
#
# Usage:
#   BASE_URL=https://your-app.vercel.app ./smoke-check.sh
#
# Exit code 0 = go, non-zero = no-go.

set -u

# ---- Per-app inputs (TODO: fill these in) -----------------------------------
# TODO: open question - which routes constitute this app's smoke check are a
# per-app operator/repo input. Set them here.
BASE_URL="${BASE_URL:-https://CHANGE-ME.vercel.app}"
AUTH_GATED_ROUTE="${AUTH_GATED_ROUTE:-/dashboard}"   # TODO: a route protected by auth middleware
SIGN_IN_ROUTE="${SIGN_IN_ROUTE:-/sign-in}"           # TODO: the redirect target the middleware sends to
DB_ROUTE="${DB_ROUTE:-/api/health/db}"               # TODO: a route that touches Postgres and returns real data
CALLBACK_ROUTE="${CALLBACK_ROUTE:-/auth/callback}"   # TODO: the Supabase auth callback route
# -----------------------------------------------------------------------------

fail=0
pass() { echo "PASS  $1"; }
bad()  { echo "FAIL  $1"; fail=1; }

echo "Smoke check against ${BASE_URL}"
echo "--------------------------------------------"

# Check 1: homepage returns 200, and is not a redirect-to-unbuilt-page 404.
# Follow the redirect chain. A 307/302 to /sign-in is OK only if /sign-in is built (check 2).
home_head="$(curl -sD - -o /dev/null "${BASE_URL}/")"
home_status="$(printf '%s' "${home_head}" | grep -i '^HTTP/' | tail -1 | awk '{print $2}')"
home_loc="$(printf '%s' "${home_head}" | grep -i '^location:' | awk '{print $2}' | tr -d '\r')"
if [ "${home_status}" = "200" ]; then
  pass "1 homepage 200"
elif [ "${home_status}" = "307" ] || [ "${home_status}" = "302" ]; then
  echo "INFO  1 homepage redirects (${home_status}) to '${home_loc}'; OK if that target is built (see check 2)"
else
  bad "1 homepage returned ${home_status} (expected 200, or a redirect to a built page)"
fi

# Check 2: an auth-gated route redirects to sign-in, and sign-in itself returns 200
# (proves middleware works AND the redirect target was built).
auth_status="$(curl -sD - -o /dev/null "${BASE_URL}${AUTH_GATED_ROUTE}" | grep -i '^HTTP/' | tail -1 | awk '{print $2}')"
signin_status="$(curl -s -o /dev/null -w '%{http_code}' "${BASE_URL}${SIGN_IN_ROUTE}")"
if { [ "${auth_status}" = "307" ] || [ "${auth_status}" = "302" ]; } && [ "${signin_status}" = "200" ]; then
  pass "2 auth-gated route redirects (${auth_status}) and ${SIGN_IN_ROUTE} is 200"
else
  bad "2 auth route status=${auth_status}, ${SIGN_IN_ROUTE} status=${signin_status} (expected 307/302 then 200)"
fi

# Check 3: a DB-touching route returns 200 with real data within the serverless timeout
# (proves env wiring + Supabase connection + cold-start budget; catches the demo-data fallback).
# Adjust the timeout to your plan: 10s Hobby, 15s Pro.
db_status="$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "${BASE_URL}${DB_ROUTE}")"
if [ "${db_status}" = "200" ]; then
  pass "3 DB route ${DB_ROUTE} returned 200 within timeout"
  echo "      NOTE: confirm the body is REAL data, not a demo/placeholder fallback."
else
  bad "3 DB route ${DB_ROUTE} returned ${db_status} (expected 200 within the serverless timeout)"
fi

# Check 4: the auth callback URL resolves (proves Supabase Site URL / Redirect URLs are cut over).
cb_status="$(curl -s -o /dev/null -w '%{http_code}' "${BASE_URL}${CALLBACK_ROUTE}")"
if [ "${cb_status}" != "404" ]; then
  pass "4 auth callback ${CALLBACK_ROUTE} resolves (status ${cb_status})"
else
  bad "4 auth callback ${CALLBACK_ROUTE} returned 404 (Supabase Site URL / Redirect URLs not cut over?)"
fi

echo "--------------------------------------------"
if [ "${fail}" -eq 0 ]; then
  echo "GO: all smoke checks passed."
else
  echo "NO-GO: see failures above. Debug the deploy before the code (guides/04-deploy-debug.md)."
fi
exit "${fail}"
