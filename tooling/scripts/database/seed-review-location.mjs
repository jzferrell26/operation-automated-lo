/**
 * PRD-005b D5: seed the review location, the outsider location, their users,
 * role bindings, and pending marketplace installations into an isolated review
 * database.
 *
 * This script writes to owner-only tables in the `platform` schema, so it runs
 * with the migration login (a member of `migration_owner`) and assumes that
 * role inside a transaction exactly as packages/db/test/campaign-integration-support.mjs
 * does. It must never run with the application login: docs/operations/database-runtime-role.md
 * requires the application login to stay outside `migration_owner`.
 *
 * PRD-006a D8 extends it with the credential half: the operator sets an initial
 * password and a real email address for each of the three seeded users, so they
 * can sign in and so a reset email reaches them.
 *
 * It prints only UUIDs, row counts, the database name, and the words "credential
 * set". It never prints, logs, or returns a password, a password hash, or an
 * email address, and it never writes one to a file. Passwords are typed at a
 * prompt with the terminal's echo turned off, or read one line at a time from
 * standard input for the non-interactive gate.
 *
 * Usage:
 *   node tooling/scripts/database/seed-review-location.mjs \
 *     --review-database-url postgresql://USER@HOST:PORT/DBNAME \
 *     --confirm-database DBNAME
 *
 * Add --expect-unchanged to assert idempotency of the non-credential rows: the
 * run then fails if it inserts any of them. The `pnpm test:db` gate uses that on
 * a second run.
 *
 * Add --set-password together with --creator-email, --approver-email, and
 * --outsider-email to set the three credentials. Add --password-stdin to read
 * the three passwords from standard input instead of prompting, which is what
 * the gate does.
 */

import { resolve } from "node:path";
import { URL, pathToFileURL } from "node:url";

export const SEED_IDS = Object.freeze({
  reviewLocationId: "4f6a1c2e-0000-4000-8000-000000000001",
  outsiderLocationId: "4f6a1c2e-0000-4000-8000-000000000002",
  creatorUserId: "4f6a1c2e-0000-4000-8000-000000000011",
  approverUserId: "4f6a1c2e-0000-4000-8000-000000000012",
  outsiderAdminUserId: "4f6a1c2e-0000-4000-8000-000000000013",
  reviewInstallationId: "4f6a1c2e-0000-4000-8000-000000000021",
  outsiderInstallationId: "4f6a1c2e-0000-4000-8000-000000000022",
  creatorBindingId: "4f6a1c2e-0000-4000-8000-000000000031",
  approverBindingId: "4f6a1c2e-0000-4000-8000-000000000032",
  outsiderAdminBindingId: "4f6a1c2e-0000-4000-8000-000000000033",
});

export const SEEDED_LOCATION_IDS = Object.freeze([
  SEED_IDS.reviewLocationId,
  SEED_IDS.outsiderLocationId,
]);

export const MARKETPLACE_APP_ID = "oalo-review-surface";

const LOOPBACK_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1"]);

const ALLOWED_FLAGS = new Set([
  "--review-database-url",
  "--confirm-database",
  "--expect-unchanged",
  "--set-password",
  "--password-stdin",
  "--creator-email",
  "--approver-email",
  "--outsider-email",
]);

const BOOLEAN_FLAGS = new Set(["--expect-unchanged", "--set-password", "--password-stdin"]);

/** The same shape platform.user_credentials enforces, checked before a connection is taken. */
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/u;

/**
 * The three seeded people, in the order their passwords are prompted for and in
 * the order --password-stdin reads them. That order is part of the contract: a
 * non-interactive run has no other way to tell the three apart.
 */
export const CREDENTIAL_TARGETS = Object.freeze([
  Object.freeze({
    flag: "--creator-email",
    key: "creatorEmail",
    idKey: "creatorUserId",
    label: "review creator",
    displayName: "Review creator",
  }),
  Object.freeze({
    flag: "--approver-email",
    key: "approverEmail",
    idKey: "approverUserId",
    label: "review approver",
    displayName: "Review approver",
  }),
  Object.freeze({
    flag: "--outsider-email",
    key: "outsiderEmail",
    idKey: "outsiderAdminUserId",
    label: "review outsider admin",
    displayName: "Review outsider admin",
  }),
]);

export class SeedReviewLocationError extends Error {
  constructor(message) {
    super(message);
    this.name = "SeedReviewLocationError";
  }
}

/**
 * Only the three documented flags are accepted. An unknown flag is a refusal
 * rather than a silent no-op, because a mistyped `--confirm-database` would
 * otherwise disable the guard it exists to enforce.
 */
export function parseSeedArguments(argv) {
  const parsed = { expectUnchanged: false, setPassword: false, passwordStdin: false };
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (!ALLOWED_FLAGS.has(flag)) {
      throw new SeedReviewLocationError(
        `Unknown argument ${String(flag)}. Expected one of ${[...ALLOWED_FLAGS].join(", ")}.`,
      );
    }
    if (BOOLEAN_FLAGS.has(flag)) {
      if (flag === "--expect-unchanged") parsed.expectUnchanged = true;
      if (flag === "--set-password") parsed.setPassword = true;
      if (flag === "--password-stdin") parsed.passwordStdin = true;
      continue;
    }
    const value = argv[index + 1];
    if (value === undefined || value.startsWith("--")) {
      throw new SeedReviewLocationError(`${flag} requires a value.`);
    }
    index += 1;
    if (flag === "--review-database-url") parsed.reviewDatabaseUrl = value;
    else if (flag === "--confirm-database") parsed.confirmDatabase = value;
    else {
      const target = CREDENTIAL_TARGETS.find((candidate) => candidate.flag === flag);
      parsed[target.key] = value.trim().toLowerCase();
    }
  }
  if (parsed.reviewDatabaseUrl === undefined) {
    throw new SeedReviewLocationError("--review-database-url is required.");
  }
  if (parsed.confirmDatabase === undefined) {
    throw new SeedReviewLocationError(
      "--confirm-database is required. Pass the database name exactly as it appears in the connection URL.",
    );
  }

  const suppliedEmails = CREDENTIAL_TARGETS.filter((target) => parsed[target.key] !== undefined);
  if (parsed.setPassword && suppliedEmails.length !== CREDENTIAL_TARGETS.length) {
    throw new SeedReviewLocationError(
      `--set-password requires ${CREDENTIAL_TARGETS.map((target) => target.flag).join(", ")}.`,
    );
  }
  if (!parsed.setPassword && suppliedEmails.length > 0) {
    throw new SeedReviewLocationError(
      `${suppliedEmails[0].flag} is only accepted together with --set-password.`,
    );
  }
  if (parsed.passwordStdin && !parsed.setPassword) {
    throw new SeedReviewLocationError(
      "--password-stdin is only accepted together with --set-password.",
    );
  }
  for (const target of suppliedEmails) {
    // The address is validated before a connection is taken, and the failure names the flag
    // rather than the value, so a mistyped address is never echoed back into a terminal or a log.
    if (!EMAIL_PATTERN.test(parsed[target.key]) || parsed[target.key].length > 254) {
      throw new SeedReviewLocationError(`${target.flag} is not a well-formed email address.`);
    }
  }
  if (new Set(suppliedEmails.map((target) => parsed[target.key])).size !== suppliedEmails.length) {
    throw new SeedReviewLocationError("Each seeded user needs its own email address.");
  }
  return Object.freeze(parsed);
}

export function databaseNameFromUrl(connectionString) {
  let parsed;
  try {
    parsed = new URL(connectionString);
  } catch {
    throw new SeedReviewLocationError("--review-database-url is not a valid connection URL.");
  }
  const name = decodeURIComponent(parsed.pathname.replace(/^\//u, ""));
  if (name.length === 0) {
    throw new SeedReviewLocationError("--review-database-url must name a database.");
  }
  return name;
}

export function assertConfirmedDatabase(connectionString, confirmDatabase) {
  const actual = databaseNameFromUrl(connectionString);
  if (actual !== confirmDatabase) {
    throw new SeedReviewLocationError(
      `--confirm-database ${confirmDatabase} does not match the database named in the connection URL.`,
    );
  }
  return actual;
}

/**
 * A managed review instance may legitimately be named `postgres`, so a name
 * prefix cannot be the guard. Production is refused on the environment
 * variable, and a database that already holds tenants is refused on the
 * foreign-active-location check below.
 */
export function assertNotProductionEnvironment(environment) {
  if (environment.OALO_ENVIRONMENT === "production") {
    throw new SeedReviewLocationError(
      "Refusing to seed review rows while OALO_ENVIRONMENT=production is set in this shell.",
    );
  }
}

export function assertNoForeignActiveLocations(activeLocationIds) {
  const foreign = activeLocationIds.filter((id) => !SEEDED_LOCATION_IDS.includes(id));
  if (foreign.length > 0) {
    throw new SeedReviewLocationError(
      `Refusing to seed: the target database already holds ${String(foreign.length)} active location(s) that this script does not own.`,
    );
  }
}

/**
 * TLS is off only for loopback. Anything else is an operator-supplied remote
 * URL, and credentials must not travel in clear.
 */
export function resolveConnectionProfile(connectionString) {
  const { hostname } = new URL(connectionString);
  const loopback = LOOPBACK_HOSTNAMES.has(hostname.replace(/^\[|\]$/gu, ""));
  return Object.freeze({
    deploymentEnvironment: loopback ? "test" : "preview",
    sslMode: loopback ? "disable" : "require",
  });
}

export function summarizeSeedResult(insertedByTable) {
  const insertedRowCount = Object.values(insertedByTable).reduce(
    (total, count) => total + count,
    0,
  );
  return Object.freeze({
    insertedByTable: Object.freeze({ ...insertedByTable }),
    insertedRowCount,
  });
}

function request(statementName, text, values = []) {
  return Object.freeze({
    preparedStatementMode: "unnamed",
    statementName,
    text: text.trim(),
    values,
  });
}

const SEED_STATEMENTS = Object.freeze([
  Object.freeze({
    table: "platform.locations",
    request: request(
      "seed-review.locations",
      `insert into platform.locations (id, display_name, status)
       values ($1::uuid, $2::text, 'active'), ($3::uuid, $4::text, 'active')
       on conflict (id) do nothing`,
      [
        SEED_IDS.reviewLocationId,
        "Review location (not connected)",
        SEED_IDS.outsiderLocationId,
        "Review outsider location (not connected)",
      ],
    ),
  }),
  Object.freeze({
    table: "platform.app_users",
    request: request(
      "seed-review.app-users",
      `insert into platform.app_users (id, safe_display_name, status)
       values ($1::uuid, $2::text, 'active'), ($3::uuid, $4::text, 'active'), ($5::uuid, $6::text, 'active')
       on conflict (id) do nothing`,
      [
        SEED_IDS.creatorUserId,
        "Review creator",
        SEED_IDS.approverUserId,
        "Review approver",
        SEED_IDS.outsiderAdminUserId,
        "Review outsider admin",
      ],
    ),
  }),
  Object.freeze({
    table: "platform.marketplace_installations",
    request: request(
      "seed-review.installations",
      `insert into platform.marketplace_installations (
         id, location_id, marketplace_app_id, external_install_id, status
       )
       values ($1::uuid, $2::uuid, $5::text, null, 'pending'),
              ($3::uuid, $4::uuid, $5::text, null, 'pending')
       on conflict (id) do nothing`,
      [
        SEED_IDS.reviewInstallationId,
        SEED_IDS.reviewLocationId,
        SEED_IDS.outsiderInstallationId,
        SEED_IDS.outsiderLocationId,
        MARKETPLACE_APP_ID,
      ],
    ),
  }),
  Object.freeze({
    table: "platform.role_bindings",
    request: request(
      "seed-review.role-bindings",
      `insert into platform.role_bindings (id, location_id, user_id, role)
       values ($1::uuid, $2::uuid, $3::uuid, 'creator'),
              ($4::uuid, $2::uuid, $5::uuid, 'approver'),
              ($6::uuid, $7::uuid, $8::uuid, 'location_admin')
       on conflict (id) do nothing`,
      [
        SEED_IDS.creatorBindingId,
        SEED_IDS.reviewLocationId,
        SEED_IDS.creatorUserId,
        SEED_IDS.approverBindingId,
        SEED_IDS.approverUserId,
        SEED_IDS.outsiderAdminBindingId,
        SEED_IDS.outsiderLocationId,
        SEED_IDS.outsiderAdminUserId,
      ],
    ),
  }),
]);

/**
 * PRD-006a D8. One upsert per seeded person, run as `migration_owner` inside the
 * same transaction as the rest of the seeding.
 *
 * Re-running it is how an operator recovers a forgotten password before email is
 * configured, so the conflict branch resets the counter and the lock as well as
 * the hash. It touches no other row.
 */
function credentialRequest(userId, emailNormalized, passwordHash) {
  return request(
    "seed-review.credential",
    `insert into platform.user_credentials (user_id, email_normalized, email_display, password_hash)
     values ($1::uuid, $2::text, $2::text, $3::text)
     on conflict (user_id) do update
       set email_normalized = excluded.email_normalized,
           email_display = excluded.email_display,
           password_hash = excluded.password_hash,
           password_set_at = now(),
           failed_attempt_count = 0,
           locked_until = null,
           updated_at = now()`,
    [userId, emailNormalized, passwordHash],
  );
}

const ASSUME_MIGRATION_OWNER = request(
  "seed-review.assume-migration-owner",
  "set local role migration_owner",
);
const ACTIVE_LOCATION_IDS = request(
  "seed-review.active-locations",
  "select id::text as id from platform.locations where status = 'active'",
);

/**
 * PRD-006a D8. Reads one password without putting it on the screen.
 *
 * On a terminal the prompt turns echo off through raw mode and restores it in a
 * `finally`, so a mistyped run does not leave the operator's shell silent. Off a
 * terminal there is nothing to turn off, so the script refuses unless the caller
 * passed `--password-stdin` and therefore knows the input is not visible.
 *
 * The value is returned and never logged, never stored, and never included in an
 * error message.
 */
async function readPasswordFromTty(promptLabel, streams) {
  const input = streams.input;
  const output = streams.output;
  output.write(`Password for ${promptLabel}: `);
  input.setRawMode(true);
  input.resume();
  input.setEncoding("utf8");
  try {
    return await new Promise((resolveValue, rejectValue) => {
      let typed = "";
      const onData = (chunk) => {
        for (const character of chunk) {
          if (character === "\r" || character === "\n") {
            input.off("data", onData);
            output.write("\n");
            resolveValue(typed);
            return;
          }
          if (character === "") {
            input.off("data", onData);
            output.write("\n");
            rejectValue(new SeedReviewLocationError("Cancelled before any credential was set."));
            return;
          }
          if (character === "" || character === "\b") {
            typed = typed.slice(0, -1);
            continue;
          }
          typed += character;
        }
      };
      input.on("data", onData);
    });
  } finally {
    input.setRawMode(false);
    input.pause();
  }
}

/** Reads the three passwords, one line each, in CREDENTIAL_TARGETS order. */
async function readPasswordsFromStdin(count, input) {
  const chunks = [];
  input.setEncoding("utf8");
  for await (const chunk of input) chunks.push(chunk);
  const lines = chunks.join("").split("\n");
  const passwords = lines.slice(0, count).map((line) => line.replace(/\r$/u, ""));
  if (passwords.length < count || passwords.some((password) => password.length === 0)) {
    throw new SeedReviewLocationError(
      `--password-stdin needs ${String(count)} non-empty lines, one password per seeded user.`,
    );
  }
  return passwords;
}

/**
 * PRD-006a D8. Collects the three passwords, applies the D3 policy to each, and
 * derives the D2 hash. Nothing here returns or reports a password; the caller
 * receives hashes only.
 */
async function collectCredentialHashes(options, streams) {
  const { evaluatePassword, hashPassword } = await import("../../../packages/auth/dist/index.js");
  const passwords = options.passwordStdin
    ? await readPasswordsFromStdin(CREDENTIAL_TARGETS.length, streams.input)
    : await (async () => {
        if (streams.input.isTTY !== true) {
          throw new SeedReviewLocationError(
            "Standard input is not a terminal, so a password cannot be typed without being echoed. Pass --password-stdin and supply one password per line.",
          );
        }
        const typed = [];
        for (const target of CREDENTIAL_TARGETS) {
          typed.push(await readPasswordFromTty(target.label, streams));
        }
        return typed;
      })();

  return CREDENTIAL_TARGETS.map((target, index) => {
    const password = passwords[index];
    const verdict = evaluatePassword(password, {
      email: options[target.key],
      displayName: target.displayName,
    });
    if (!verdict.acceptable) {
      // The reason code, never the password and never the address.
      throw new SeedReviewLocationError(
        `The password for the ${target.label} was refused: ${verdict.reason}.`,
      );
    }
    return Object.freeze({
      target,
      userId: SEED_IDS[target.idKey],
      emailNormalized: options[target.key],
      passwordHash: hashPassword(password),
    });
  });
}

async function defaultConnect(connectionString) {
  // Imported lazily and by path so the pure guard helpers above stay importable
  // from a vitest file that never builds @oalo/db. The gate builds the package
  // before it reaches this script.
  const { createPostgresPool } = await import("../../../packages/db/dist/index.js");
  const profile = resolveConnectionProfile(connectionString);
  const pool = createPostgresPool({
    applicationName: "oalo-seed-review-location",
    connectionString,
    deploymentEnvironment: profile.deploymentEnvironment,
    maxConnections: 1,
    poolingMode: "transaction",
    preparedStatements: false,
    sslMode: profile.sslMode,
  });
  const connection = await pool.connect();
  return {
    connection,
    async dispose() {
      await connection.release();
      await pool.close();
    },
  };
}

export async function seedReviewLocation({
  argv,
  environment = process.env,
  connect = defaultConnect,
  log = (line) => process.stdout.write(`${line}\n`),
  streams = { input: process.stdin, output: process.stdout },
} = {}) {
  const options = parseSeedArguments(argv ?? []);
  assertNotProductionEnvironment(environment);
  const databaseName = assertConfirmedDatabase(options.reviewDatabaseUrl, options.confirmDatabase);

  // The passwords are collected before a connection is taken, so a refused
  // password or a cancelled prompt costs no transaction and leaves no partial
  // state. Nothing in `credentials` is a password; each entry carries a hash.
  const credentials = options.setPassword ? await collectCredentialHashes(options, streams) : [];

  const session = await connect(options.reviewDatabaseUrl);
  const insertedByTable = {};
  const credentialsSet = [];
  try {
    await session.connection.execute(request("seed-review.begin", "begin"));
    try {
      await session.connection.execute(ASSUME_MIGRATION_OWNER);
      const activeLocations = await session.connection.execute(ACTIVE_LOCATION_IDS);
      assertNoForeignActiveLocations(activeLocations.rows.map((row) => row.id));
      for (const statement of SEED_STATEMENTS) {
        const result = await session.connection.execute(statement.request);
        insertedByTable[statement.table] = result.rowCount;
      }
      for (const credential of credentials) {
        await session.connection.execute(
          credentialRequest(credential.userId, credential.emailNormalized, credential.passwordHash),
        );
        credentialsSet.push(credential.target.label);
      }
      await session.connection.execute(request("seed-review.commit", "commit"));
    } catch (error) {
      await session.connection.execute(request("seed-review.rollback", "rollback"));
      throw error;
    }
  } finally {
    await session.dispose();
  }

  // Credential upserts are deliberately outside the idempotency accounting:
  // re-running --set-password is how an operator recovers a forgotten password,
  // so it is expected to change a row. The row counts it asserts are the
  // location, user, installation, and binding rows only.
  const summary = summarizeSeedResult(insertedByTable);
  if (options.expectUnchanged && summary.insertedRowCount !== 0) {
    throw new SeedReviewLocationError(
      `Expected an idempotent run but ${String(summary.insertedRowCount)} row(s) were inserted.`,
    );
  }
  for (const line of reportLines(databaseName, summary, credentialsSet)) log(line);
  return summary;
}

/**
 * PRD-006a D9. The two location ids still print, because PRD-005e's deployed
 * proof reads them, but under neutral labels: no application environment
 * variable is named after them any more.
 *
 * Nothing on any of these lines is a password, a password hash, or an email
 * address. `credentialsSet` carries the label of each person whose credential
 * this run wrote, and nothing else about them.
 */
export function reportLines(databaseName, summary, credentialsSet = []) {
  return Object.freeze([
    `[seed-review] database: ${databaseName}`,
    `[seed-review] rows inserted this run: ${String(summary.insertedRowCount)}`,
    `[seed-review] review location id: ${SEED_IDS.reviewLocationId}`,
    `[seed-review] outsider location id: ${SEED_IDS.outsiderLocationId}`,
    `[seed-review] review creator user id: ${SEED_IDS.creatorUserId}`,
    `[seed-review] review approver user id: ${SEED_IDS.approverUserId}`,
    `[seed-review] review outsider admin user id: ${SEED_IDS.outsiderAdminUserId}`,
    ...credentialsSet.map((label) => `[seed-review] credential set: ${label}`),
    "[seed-review] nothing secret is printed here, and nothing secret is written to this repository.",
  ]);
}

const invokedPath =
  process.argv[1] === undefined ? undefined : pathToFileURL(resolve(process.argv[1])).href;
if (invokedPath === import.meta.url) {
  seedReviewLocation({ argv: process.argv.slice(2) }).catch((error) => {
    process.stderr.write(
      `[seed-review] ${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  });
}
