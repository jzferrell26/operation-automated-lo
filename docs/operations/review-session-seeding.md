# Review session seeding

**Status:** procedure only. Running it requires an isolated review database that does not yet exist.

**Owner:** the operator. No agent runs this, and no agent receives the sign-in secret.

This page tells you how to put the five rows the review sign-in path needs into an isolated review database, and which three environment variables to set afterwards. It assumes no knowledge of this repository. Every command below is meant to be copied exactly.

## What this is, and what it is not

The review surface needs a real person to hold a real session. This procedure seeds two tenants, three users, their role bindings, and one pending marketplace installation per tenant, so that the review sign-in route has real rows to bind a session to.

It is **not** HighLevel single sign-on, and it does not satisfy any acceptance criterion marked `DEFERRED: LIVE HIGHLEVEL AUTH`. It creates no provider connection, no OAuth token, and no live integration. Both seeded tenants are named "not connected" for exactly that reason.

## Before you start

You need four things.

1. **An isolated review database.** A PostgreSQL 17 instance whose only tenants are the ones this script creates. Never production. Never a database that holds a customer's rows. The script refuses to run if it finds an active tenant it does not own, but do not rely on that: choose a fresh database.
2. **The migration login.** The database login that applied the migrations. It is a member of the `migration_owner` role. It is **not** the login the application uses. `docs/operations/database-runtime-role.md` explains why those two must stay separate: the application login must never be able to assume `migration_owner`.
3. **The migrations already applied** to that database, in filename order, from `supabase/migrations/`.
4. **Node 24.18.0 and pnpm 11.15.1**, and this repository checked out, with `pnpm install --frozen-lockfile` already run.

## Step 1: build the database package

The seeding script talks to PostgreSQL through the compiled `@oalo/db` package. Build it once.

```
pnpm exec turbo run build --filter=@oalo/db...
```

## Step 2: find your database name

Look at the connection URL for the review database. The database name is the part after the last slash, before any `?`.

```
postgresql://USER:PASSWORD@HOST:5432/THIS_PART_IS_THE_DATABASE_NAME
```

A managed instance may legitimately call it `postgres`. That is fine. Write the name down exactly; step 3 needs it twice.

## Step 3: run the seeding script

Run it from the repository root. Replace the two placeholders with your values, and keep the database name identical in both places.

```
node tooling/scripts/database/seed-review-location.mjs \
  --review-database-url "postgresql://MIGRATION_LOGIN:PASSWORD@HOST:5432/DBNAME" \
  --confirm-database "DBNAME"
```

The script refuses, and changes nothing, when any of these is true.

| Refusal | What it means |
| --- | --- |
| `--review-database-url is required.` | You left out the connection URL. |
| `--confirm-database is required.` | You left out the confirmation. It exists so a mistyped URL cannot silently seed the wrong database. |
| `--confirm-database X does not match the database named in the connection URL.` | The two names differ. Fix the one that is wrong; do not change the other to match. |
| `Refusing to seed review rows while OALO_ENVIRONMENT=production is set in this shell.` | Your shell declares production. Open a different shell. |
| `Refusing to seed: the target database already holds N active location(s) that this script does not own.` | The database holds tenants that are not the seeded pair. Stop. You are pointed at the wrong database. |
| `Unknown argument ...` | A flag is misspelled. Only the three documented flags exist. |

On success it prints the database name, how many rows it inserted, and the identifiers you need. It prints no password, no token, and no secret.

Running it a second time inserts nothing. The rows carry fixed identifiers and are inserted with `on conflict do nothing`, so a repeat run is safe.

## Step 4: set the three environment variables

Copy two of the printed values into the Vercel project's environment, **server-side only**. Never add a `NEXT_PUBLIC_` prefix to any of them.

| Variable | Value | Kind |
| --- | --- | --- |
| `OALO_REVIEW_LOCATION_ID` | the `OALO_REVIEW_LOCATION_ID=` value the script printed | not secret, but server-only |
| `OALO_REVIEW_OUTSIDER_LOCATION_ID` | the `OALO_REVIEW_OUTSIDER_LOCATION_ID=` value the script printed | not secret, but server-only |
| `OALO_REVIEW_SIGNIN_SECRET` | you generate it in step 5 | secret |

## Step 5: generate the sign-in secret yourself

The script never generates, prints, or stores this. You do.

```
openssl rand -base64 32 | tr '+/' '-_' | tr -d '='
```

That gives at least 32 bytes of entropy in a URL-safe form. Put the result in two places and nowhere else.

1. The Vercel project's server-side environment, as `OALO_REVIEW_SIGNIN_SECRET`.
2. Your password manager.

Then redeploy so the running deployment picks it up.

## What never goes in git, a chat window, or a ticket

- The sign-in secret, in any form, including a partial one.
- The review database's connection URL, password, host, or port.
- Any session cookie value, session secret, or hash of one.
- A screenshot that shows any of the above.

Only these are safe to record in git or hand to an agent: the variable **names**, the seeded UUIDs the script prints, the database **name**, commit SHAs, CI run identifiers, and deployment URLs.

## Rotating the secret

Change `OALO_REVIEW_SIGNIN_SECRET` in the Vercel environment and redeploy. Sessions already issued stay valid until they expire or are revoked, because a session is bound to database rows rather than to the secret. To end them immediately, revoke each one in the database.

## Undoing the seed

Sessions cannot be deleted, so a seeded review database is not meant to be cleaned up in place. Drop the whole database and start again with a fresh one.

## Related

- `docs/operations/database-runtime-role.md`: why the migration login and the application login must stay separate.
- `docs/operations/review-surface.md`: what the labeled review surface is.
- `supabase/migrations/20260919120000_first_party_sessions.sql`: the session store and its functions.
- `tooling/scripts/database/seed-review-location.mjs`: the script this page runs.
