import { createHash, randomBytes } from "node:crypto";

import { createPostgresCredentialPort } from "../../../../apps/web/src/server/postgres-credential-ports.js";
import { GATE_SEEDED_CREDENTIALS } from "../../../../tooling/scripts/database/run-real-database-tests.mjs";
import { reviewDatabaseUrl } from "./review-database.js";

/**
 * PRD-008d 008D-AC-007, S-1. A fresh `email_verification` token for the verify-email page's
 * confirmed state, issued in the gate's disposable database.
 *
 * **Why the test issues it.** The product issues this token only when it can send the message that
 * carries it: `scheduleVerificationEmail` returns before issuing anything when no sending domain is
 * configured (`apps/web/src/server/password-authentication-handler.ts`, 006A-AC-021), and the
 * review composition leaves `OALO_RESEND_API_KEY` and `OALO_EMAIL_FROM` absent on purpose
 * (`tooling/scripts/database/review-browser-run.mjs`, `reviewServerEnvironment`). So no token
 * exists in the review run for a browser to spend, which is why the sign-off listed the confirmed
 * state as "not photographed (S-1)".
 *
 * **What is replaced, and what is not.** Only the email is. The token is issued by the product's
 * own credential port, `createPostgresCredentialPort`, with the same call
 * `issueAndSendVerificationEmail` makes: the person's credential is read by address, and
 * `issueToken` runs `platform.issue_credential_token` as `app_runtime` through the allowlisted
 * runtime-function path, with only the SHA-256 hash of the URL token crossing into the database.
 * Everything after that is the product's own path as well: the verify-email page, its Confirm
 * control, `POST /api/auth/verify-email` with its rate limit and its mutation gate, and
 * `consume_credential_token`. The picture is therefore of a state the product reaches on every
 * deployment with a sending domain, reached the way a person reaches it, minus the inbox.
 *
 * **Who it is for.** The seeded outsider admin, the one seeded person no browser spec signs in as.
 * Confirming an address changes nothing visible in this composition anyway: with no sending domain
 * every session's verification state is `not_applicable` before the credential is even read
 * (`apps/web/src/server/runtime-authentication.ts`), so the person whose address this confirms
 * looks the same to every other spec in the run before and after.
 *
 * **Where it connects.** To the gate's own disposable database, by the gate's own constants:
 * `TEST_DATABASE_NAME`, the local stack's port from `supabase/config.toml`, and the stack's
 * well-known local credential that the seeding step already uses. The name guard the gate applies
 * to every destructive step is applied here too, and the helper refuses to run outside the review
 * browser run, which is the only place that database exists.
 *
 * The database package is loaded from its build, the way `seed-review-location.mjs` loads it, which
 * is also the build the credential port above resolves `@oalo/db` to: the review run builds
 * `@oalo/web` and everything under it before the browser starts.
 */

type DatabasePackage = typeof import("@oalo/db");

/** An hour: longer than the test that spends it, and well inside the product's own day. */
const TOKEN_LIFETIME_SECONDS = 3_600;

/** The same shape the product's URL tokens have: 32 random bytes, base64url. */
function freshUrlToken(): string {
  return randomBytes(32).toString("base64url");
}

function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/**
 * Issues one live `email_verification` token for the seeded outsider admin and returns the URL
 * token a confirmation email would have carried. Issuing supersedes that person's earlier
 * verification tokens, exactly as a second email would, so the newest token is the one that works.
 */
export async function issueVerificationTokenForTheSeededOutsider(): Promise<string> {
  const connectionString = await reviewDatabaseUrl();
  const databasePackageUrl = new URL("../../../../packages/db/dist/index.js", import.meta.url);
  const { createPostgresPool } = (await import(databasePackageUrl.href)) as DatabasePackage;
  const pool = createPostgresPool({
    applicationName: "oalo-review-verification-token",
    connectionString,
    deploymentEnvironment: "local",
    maxConnections: 1,
    poolingMode: "transaction",
    preparedStatements: false,
    sslMode: "disable",
  });
  const token = freshUrlToken();
  try {
    const credentials = createPostgresCredentialPort(pool);
    const credential = await credentials.lookupCredential(GATE_SEEDED_CREDENTIALS.outsiderEmail);
    if (credential === undefined) {
      throw new Error("The seeded outsider has no active credential to confirm in this run");
    }
    await credentials.issueToken({
      userId: credential.userId,
      purpose: "email_verification",
      tokenHash: sha256Hex(token),
      lifetimeSeconds: TOKEN_LIFETIME_SECONDS,
      correlationRef: `correlation_review_verify_${randomBytes(8).toString("hex")}`,
    });
  } finally {
    await pool.close();
  }
  return token;
}
