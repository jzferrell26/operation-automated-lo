import type { DatabaseConnection, DatabasePool, SqlContract, SqlScalar } from "./sql-contract.js";
import { DatabaseContextError, shouldAssumeRuntimeRole } from "./transaction-context.js";

/**
 * PRD-005a D6. The one database path in the application that runs without a tenant or support
 * context.
 *
 * Authentication is the bootstrap problem row level security cannot solve on its own: before a
 * principal exists there is no `app.location_id` to set, so every `app_runtime` policy that keys on
 * `platform.tenant_matches(location_id)` would deny, and `app_runtime` holds no `select` grant on
 * `platform.app_users` at all. The foundation's own answer to that class of problem is a
 * `security definer` function owned by the schema owner role with `set search_path = ''`, which is what
 * `platform.set_app_context` and `platform.begin_support_access` already are.
 *
 * This helper therefore runs `begin; set local role app_runtime; <one allowlisted contract>;
 * commit` on a pooled connection and nothing else. The allowlist below is the complete set of
 * PRD-005b and PRD-006a `security definer` contracts, keyed by statement name. Any other contract
 * is refused with `DB_CONTRACT_ACCESS_MISMATCH` before a connection is taken.
 *
 * `access` classifies the statement, not the function. Every entry below is a `select`, so none of
 * them can carry a caller-composed write, and the `access !== "read"` refusal keeps it that way.
 * Most of the functions do change state inside their own definer body. That is the point of the
 * trust boundary: the mutation is written by the definer function under the schema-owning role,
 * from arguments it validates itself, and it is audited; the caller supplies parameters and never
 * SQL.
 *
 * PRD-006a widened this list by fourteen names and removed one. The inventory of what each new
 * caller is, so a reviewer does not have to search for them:
 *
 * - `lookup-password-credential`, `record-password-sign-in-failure`,
 *   `record-password-sign-in-success`, `list-sign-in-bindings`: the sign-in exchange in
 *   `apps/web/src/server/password-authentication-handler.ts`. Reading a credential and counting a
 *   failed attempt both happen before any principal exists, which is why they are here at all.
 * - `issue-credential-token`, `consume-credential-token`: the forgot-password, reset, and
 *   verify-email flows, and the workspace-choice step, in the same handler. Also pre-principal.
 * - `set-password`, `revoke-all-first-party-sessions-for-user`: reset and change-password. The
 *   change path runs with a principal in hand but on the same pool and the same boundary.
 * - `register-password-account`: sign-up, which by definition has no principal.
 * - `lookup-password-credential-for-user`: change-password, which has a verified session and no
 *   email address in hand. Looking a credential up by an address the browser supplied would be a
 *   credential oracle even with the result checked against the session.
 * - `mark-email-verified`: the verify-email confirmation.
 * - `record-email-delivery`: the audit row an email send leaves behind, written after the
 *   provider answers. 006A-AC-017 counts those rows; nothing else can write them.
 * - `consume-auth-rate-limit`: every pre-session route, before it does anything else, and the
 *   shell's resend control, which is counted per person rather than per client address.
 * - `unverified-email-display-for-user`: the shell's resend control, which holds a verified
 *   session and needs the address the confirmation message goes to. It is the narrowest read that
 *   pays for itself: it answers null for a person with no credential, a person who is not active,
 *   and a person whose email is already confirmed, so it can state nothing at all about a
 *   confirmed account and the only address it can ever return belongs to the session's own person.
 * - `resolve-review-persona` is gone: PRD-006a D9 drops the function with the persona selector
 *   that was its only caller.
 *
 * Adding a name to `RUNTIME_FUNCTION_CONTRACT_NAMES` widens the only unscoped database path in the
 * product, so it is a security change and needs `security-guardian` review, not a routine edit.
 */

export const RUNTIME_FUNCTION_CONTRACT_NAMES = Object.freeze([
  "runtime.location-is-active.v1",
  "runtime.actor-is-active.v1",
  "runtime.current-role-version.v1",
  "runtime.lookup-first-party-session.v1",
  "runtime.touch-first-party-session.v1",
  "runtime.first-party-session-is-active.v1",
  "runtime.resolve-session-display.v1",
  "runtime.issue-first-party-session.v1",
  "runtime.revoke-first-party-session.v1",
  "runtime.record-denied-session-issuance.v1",
  "runtime.lookup-password-credential.v1",
  "runtime.lookup-password-credential-for-user.v1",
  "runtime.list-sign-in-bindings.v1",
  "runtime.record-password-sign-in-failure.v1",
  "runtime.record-password-sign-in-success.v1",
  "runtime.issue-credential-token.v1",
  "runtime.consume-credential-token.v1",
  "runtime.revoke-all-first-party-sessions-for-user.v1",
  "runtime.set-password.v1",
  "runtime.register-password-account.v1",
  "runtime.mark-email-verified.v1",
  "runtime.record-email-delivery.v1",
  "runtime.consume-auth-rate-limit.v1",
  "runtime.unverified-email-display-for-user.v1",
] as const);

export type RuntimeFunctionContractName = (typeof RUNTIME_FUNCTION_CONTRACT_NAMES)[number];

const runtimeFunctionContractNames: ReadonlySet<string> = new Set(RUNTIME_FUNCTION_CONTRACT_NAMES);

export function isRuntimeFunctionContractName(
  value: unknown,
): value is RuntimeFunctionContractName {
  return typeof value === "string" && runtimeFunctionContractNames.has(value);
}

const BEGIN_TEXT = "begin";
const COMMIT_TEXT = "commit";
const ROLLBACK_TEXT = "rollback";
const ASSUME_APP_RUNTIME_ROLE_TEXT = "set local role app_runtime";

function statement(statementName: string, text: string) {
  return Object.freeze({
    statementName,
    text,
    values: [] as readonly SqlScalar[],
    preparedStatementMode: "unnamed" as const,
  });
}

const BEGIN_REQUEST = statement("runtime-function.begin", BEGIN_TEXT);
const COMMIT_REQUEST = statement("runtime-function.commit", COMMIT_TEXT);
const ROLLBACK_REQUEST = statement("runtime-function.rollback", ROLLBACK_TEXT);
const ASSUME_ROLE_REQUEST = statement(
  "runtime-function.assume-app-runtime-role",
  ASSUME_APP_RUNTIME_ROLE_TEXT,
);

async function runAllowlistedContract<Row>(
  connection: DatabaseConnection,
  contract: SqlContract<Row>,
  values: readonly SqlScalar[],
): Promise<readonly Row[]> {
  const result = await connection.execute({
    statementName: contract.name,
    text: contract.text,
    values,
    preparedStatementMode: "unnamed",
  });
  return Object.freeze(result.rows.map((row) => contract.decode(row)));
}

/**
 * Runs exactly one allowlisted `security definer` contract with no tenant or support context.
 * The contract's `access` must be `read`: nothing on this path may write tenant data.
 */
export async function queryRuntimeFunction<Row>(
  pool: DatabasePool,
  contract: SqlContract<Row>,
  values: readonly SqlScalar[] = [],
): Promise<readonly Row[]> {
  if (!isRuntimeFunctionContractName(contract.name)) {
    throw new DatabaseContextError(
      "DB_CONTRACT_ACCESS_MISMATCH",
      `SQL contract ${contract.name} is not an allowlisted context-free runtime function`,
    );
  }
  if (contract.access !== "read") {
    throw new DatabaseContextError(
      "DB_CONTRACT_ACCESS_MISMATCH",
      `SQL contract ${contract.name} is not a read contract`,
    );
  }

  const connection = await pool.connect();
  let open = false;
  try {
    await connection.execute(BEGIN_REQUEST);
    open = true;
    if (shouldAssumeRuntimeRole()) {
      await connection.execute(ASSUME_ROLE_REQUEST);
    }
    const rows = await runAllowlistedContract(connection, contract, values);
    await connection.execute(COMMIT_REQUEST);
    open = false;
    return rows;
  } catch (error: unknown) {
    if (open) {
      open = false;
      await rollbackQuietly(connection);
    }
    throw error;
  } finally {
    await connection.release();
  }
}

/**
 * A rollback failure must not replace the error that caused it. This path runs one statement inside
 * one transaction with no tenant context, so there is nothing to reconcile: the transaction is
 * abandoned either way and the original failure is the one worth reporting.
 */
async function rollbackQuietly(connection: DatabaseConnection): Promise<void> {
  try {
    await connection.execute(ROLLBACK_REQUEST);
  } catch (rollbackFailure) {
    // Named and discarded on purpose, rather than left as an empty block: the caller receives the
    // failure that opened this path, and replacing it with a rollback failure would hide the cause.
    void rollbackFailure;
  }
}
