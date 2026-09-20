# Review account seeding

> **TEST STATUS: UNTESTED.** Exercise before relying on this document in production. The seeding script itself runs non-interactively inside `pnpm test:db` on every change and then signs in through the real route with what it created (see "Testing this runbook" below), so the script is exercised. This page's own interactive prompts, Vercel steps, and browser sign-in have not been walked by an operator start to finish. Do not treat a green `pnpm test:db` as proof this page is accurate; run the quarterly exercise in "Testing this runbook" and update this header with the date, the environment, and the outcome once you have.

**Type:** scheduled operation. An operator runs this by hand; it is not triggered by an alert.

**Status:** procedure only. Running it requires an isolated review database that does not yet exist.

**Owner:** the operator. No agent runs this, and no agent ever receives a password. If an agent asks you for one, refuse.

**Escalation:** if any step below fails and this page does not say what to do, stop and post in the engineering channel with the exact command you ran and the exact error text, redacting nothing except passwords. Expect a reply within one business day. Do not improvise a database change.

This page tells you how to put the rows the sign-in page needs into an isolated review database, how to set the first password for each of the three seeded people, and which environment variables to set afterwards. It assumes no knowledge of this repository. Every command below is meant to be copied exactly.

## What this is, and what it is not

The product needs a real person to hold a real session. This procedure seeds two workspaces, three people, their role bindings, one pending marketplace installation per workspace, and one credential per person, so that signing in at `/sign-in` with an email address and a password produces a real session bound to real rows.

It is **not** HighLevel single sign-on, and it satisfies no acceptance criterion marked `DEFERRED: LIVE HIGHLEVEL AUTH`. It creates no provider connection, no OAuth token, and no live integration. Both seeded workspaces are named "not connected" for exactly that reason.

## Before you start

You need five things.

1. **An isolated review database.** A PostgreSQL 17 instance whose only workspaces are the ones this script creates. Never production. Never a database that holds a customer's rows. The script refuses to run if it finds an active workspace it does not own, but do not rely on that: choose a fresh database.
2. **The migration login.** The database login that applied the migrations. It is a member of the `migration_owner` role. It is **not** the login the application uses. `docs/operations/database-runtime-role.md` explains why those two must stay separate: the application login must never be able to assume that role.
3. **The migrations already applied** to that database, in filename order, from `supabase/migrations/`.
4. **Node 24.18.0 and pnpm 11.15.1**, and this repository checked out, with `pnpm install --frozen-lockfile` already run.
5. **Three email addresses**, one per seeded person, that you can actually receive mail at. They are stored so that a password reset can reach the person. Use addresses you control.
6. **Access to the review deployment's Vercel project**, `operation-automated-lo-web` (team `jonathan-ferrell`, documented in `docs/operations/review-surface.md`), with permission to add and change environment variables. Step 5 needs this.

You also need somewhere to put three passwords. Your password manager. Not a note, not a chat message, not this repository.

The review deployment's URL, used in Step 6 and below, is `https://operation-automated-lo-web.vercel.app` as of this writing (see "Existing Vercel project" in `docs/operations/review-surface.md`). If your review deployment is instead a per-branch preview URL, PRD-005e's open question on that point is not yet resolved, so confirm the current host in that page before you rely on it; every path below stays the same on either host.

## Step 1: build the packages the script uses

The script talks to PostgreSQL through the compiled `@oalo/db` package and derives password hashes through the compiled `@oalo/auth` package. Build both once.

```
pnpm exec turbo run build --filter=@oalo/db... --filter=@oalo/auth...
```

Expected: the command exits 0. If it does not, stop; the rest of this page will not work.

## Step 2: find your database name

Look at the connection URL for the review database. The database name is the part after the last slash, before any `?`.

```
postgresql://USER:PASSWORD@HOST:5432/THIS_PART_IS_THE_DATABASE_NAME
```

A managed instance may legitimately call it `postgres`. That is fine. Write the name down exactly; step 3 needs it twice.

## Step 3: seed the rows and set the three passwords

Run this from the repository root, on your own machine, in a terminal. Replace the five placeholders. Keep the database name identical in both places.

```
node tooling/scripts/database/seed-review-location.mjs \
  --review-database-url postgresql://USER:PASSWORD@HOST:5432/DBNAME \
  --confirm-database DBNAME \
  --set-password \
  --creator-email YOUR_CREATOR_ADDRESS \
  --approver-email YOUR_APPROVER_ADDRESS \
  --outsider-email YOUR_OUTSIDER_ADDRESS
```

The script prompts you three times, in this order:

```
Password for review creator:
Password for review approver:
Password for review outsider admin:
```

Type each password and press Enter. **Nothing appears on screen while you type.** That is the echo being suppressed on purpose, not a hung terminal. Press Ctrl+C to cancel; nothing is written if you do.

Each password must be at least 12 characters and at most 128, must not contain the person's name or the local part of their address, and must not be one of the common passwords the policy refuses. A short phrase of three or four ordinary words works well and is easy to type at a review.

**Save each password in your password manager as you type it.** Nothing in this system can show it to you again.

Expected output, with your own ids and counts:

```
[seed-review] database: DBNAME
[seed-review] rows inserted this run: 4
[seed-review] review location id: 4f6a1c2e-0000-4000-8000-000000000001
[seed-review] outsider location id: 4f6a1c2e-0000-4000-8000-000000000002
[seed-review] review creator user id: 4f6a1c2e-0000-4000-8000-000000000011
[seed-review] review approver user id: 4f6a1c2e-0000-4000-8000-000000000012
[seed-review] review outsider admin user id: 4f6a1c2e-0000-4000-8000-000000000013
[seed-review] credential set: review creator
[seed-review] credential set: review approver
[seed-review] credential set: review outsider admin
[seed-review] nothing secret is printed here, and nothing secret is written to this repository.
```

No password, no password hash, and no email address is ever printed, logged, or written to a file by this script.

### If the script refuses

| What it said | What it means | What to do |
|---|---|---|
| `--confirm-database X does not match the database named in the connection URL.` | The two values disagree. | Re-read the URL. The name is the part after the last slash. |
| `Refusing to seed review rows while OALO_ENVIRONMENT=production is set in this shell.` | Your shell says production. | Open a new terminal. Do not unset the variable to get past this. |
| `Refusing to seed: the target database already holds N active location(s) that this script does not own.` | The database is not empty. | Use a fresh database. Do not delete rows to make room. |
| `--set-password requires --creator-email, --approver-email, --outsider-email.` | One of the three addresses is missing. | Supply all three. |
| `The password for the review creator was refused: PASSWORD_TOO_SHORT.` | The policy refused it. The reason code names which rule. | Run the command again and choose a password that satisfies the rule. Nothing was written. |
| `Standard input is not a terminal, so a password cannot be typed without being echoed.` | You are not on a terminal. | Run it on a terminal. `--password-stdin` exists for the automated gate, not for you. |

Each refusal happens before any row is written, so a refused run leaves the database exactly as it was.

## Step 4: run it again to confirm it changed nothing

Run the same command **without** the credential flags. It must report zero rows inserted.

```
node tooling/scripts/database/seed-review-location.mjs \
  --review-database-url postgresql://USER:PASSWORD@HOST:5432/DBNAME \
  --confirm-database DBNAME \
  --expect-unchanged
```

Expected: `rows inserted this run: 0` and exit code 0. If it reports anything else, stop and escalate: the database is not in the state this procedure assumes.

## Step 5: set the environment variables in Vercel

Set these on the review deployment, all server-side, never with a `NEXT_PUBLIC_` prefix. The repository gate rejects every `NEXT_PUBLIC_` spelling of them, so a mistake here cannot reach a browser bundle, but set them correctly anyway.

| Name | Value | Secret? |
|---|---|---|
| `OALO_SELF_SERVE_SIGNUP` | `enabled` to let people create their own accounts at `https://operation-automated-lo-web.vercel.app/sign-up`; leave unset to turn that page off | not secret |
| `OALO_RESEND_API_KEY` | the API key from your Resend account | **secret** |
| `OALO_EMAIL_FROM` | an address on a domain you have verified in Resend | not secret |

`OALO_RESEND_API_KEY` and `OALO_EMAIL_FROM` are a pair. Set both or neither. Setting exactly one is a configuration failure: the deployment logs the missing variable by name and refuses every request, which is deliberate, because a half-configured sending domain would otherwise look like working email that silently goes nowhere.

Redeploy after setting them. Vercel does not apply environment changes to a running deployment.

## Step 6: sign in

Open `https://operation-automated-lo-web.vercel.app/sign-in`. Enter the creator's email address and the password you set in step 3. You should land on `https://operation-automated-lo-web.vercel.app/overview`.

If you do not:

- **"That email and password don't match."** The address or the password is wrong. The page says the same thing either way, on purpose. Re-run step 3 for that person to set a known password.
- **The page is a 404.** The deployment is not in review mode. Set `OALO_REVIEW_SURFACE=authorized` and redeploy; see `docs/production-environments.md`.
- **"Too many attempts."** You have used the twenty sign-in attempts this deployment allows from one address in fifteen minutes. Wait and try again.
- **Ten wrong passwords in a row** lock that account for fifteen minutes. Wait, or re-run step 3 for that person, which clears the lock.

## Undoing this

- **The seeded rows (Step 3).** The script has no delete flag, on purpose: it only ever inserts a row once or resets a credential, never removes one. That is why "Before you start" tells you to run this against a fresh, disposable database rather than one you might need to preserve. To undo the whole run, discard that database. If you need the rows again, apply the migrations to a new one (see "Before you start," item 3) and run Step 3 again. Never delete a row by hand from a database another review or test also depends on.
- **A password you set in Step 3.** There is no way to restore "no password set" or an earlier password: the hash Step 3 replaces cannot be recovered, by design, the same way the password itself cannot be recovered (Step 3's note that "nothing in this system can show it to you again"). Re-run Step 3 for that person with a new password instead; see "Changing a password later" below.
- **The Vercel variables from Step 5.** Remove the variable, or set it back to whatever it held before, on the same Vercel project and environment you used to add it, then redeploy, exactly as Step 5 already has you do to apply it. `OALO_RESEND_API_KEY` and `OALO_EMAIL_FROM` must come out together, for the same reason Step 5 has you set them together: leaving one in place is the configuration failure Step 5 describes.

## What to do until email is configured

Until `OALO_RESEND_API_KEY` and `OALO_EMAIL_FROM` are both set, the "Forgot your password?" link still works and still says a link is on its way, but no message is sent. That is deliberate: the page must answer identically whether or not an address has an account, so it cannot tell the person that email is off.

A forgotten password is recovered by re-running step 3 for that person. It sets a new password, clears any lock, and changes nothing else.

Once both variables are set, the link works normally: the message arrives, and it is valid for thirty minutes.

## Changing a password later

Two ways, both fine:

- **The person changes it themselves.** Signed in, at `https://operation-automated-lo-web.vercel.app/settings/account`. This keeps them signed in on the device they are using and signs them out everywhere else.
- **You reset it.** Re-run step 3 for all three people. It overwrites all three passwords, so you will need to redistribute all three.

## What never goes in git

No password. No password hash. No `OALO_RESEND_API_KEY`. No database URL containing a password. None of these belongs in this repository, in a pull request, in a commit message, in an issue, or in a message to an agent. `pnpm audit:secrets` fails the build if one appears.

The seeded ids in step 3's output are not secret and may be pasted anywhere.

## Testing this runbook

Exercise it end to end whenever the seeding script changes and at least once a quarter, against a throwaway database: run step 3 with a password you deliberately choose badly (fewer than 12 characters) to confirm the refusal, then with a good one, then sign in at step 6. The automated gate (`pnpm test:db`) runs the same script non-interactively with `--password-stdin` and then signs in through the real route with the credentials it just created, so a regression in the script fails CI as well.

## Related

- `docs/production-environments.md`: the full environment variable contract.
- `docs/operations/database-runtime-role.md`: why the migration login and the application login stay separate.
- `docs/operations/review-surface.md`: what the review deployment is, and what it is not.
- `docs/operations/retention-and-deletion.md` and `docs/operations/export.md`: the tables this procedure writes hold email addresses, which are personal data.
