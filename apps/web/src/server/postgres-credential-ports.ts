import { applicationRoleForDatabaseRole, isDatabaseBindingRole } from "@oalo/auth";
import {
  defineSqlContract,
  queryRuntimeFunction,
  type DatabasePool,
  type SqlScalar,
} from "@oalo/db";

import type {
  ConsumedCredentialToken,
  CredentialPort,
  PasswordCredential,
  PasswordPolicyIdentity,
  RegisterAccountOutcome,
  SignInBinding,
} from "./credential-ports.js";

/**
 * PRD-006a D1. The Postgres half of the credential trust boundary: one `defineSqlContract` per
 * `security definer` function, run through the allowlisted context-free helper in `@oalo/db`,
 * because a credential read and a failed-attempt count both happen before any principal (and
 * therefore any tenant context) exists.
 *
 * This lives beside `postgres-authentication-ports.ts` rather than inside it because that module
 * is already the whole PRD-005b session surface, and eleven more contracts in one file would make
 * the session boundary harder to read, not easier. The two modules obey the same rules: no
 * reference arrives from a browser, no statement is composed from caller input, and the hash of a
 * secret is the only thing about a secret that ever becomes a statement parameter.
 */

function recordRow(row: unknown): Readonly<Record<string, unknown>> {
  if (typeof row !== "object" || row === null) {
    throw new Error("Runtime function returned a non-object row");
  }
  return row as Readonly<Record<string, unknown>>;
}

function requiredText(value: unknown, column: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Runtime function column ${column} must be text`);
  }
  return value;
}

function requiredInteger(value: unknown, column: string): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) {
    throw new Error(`Runtime function column ${column} must be an integer`);
  }
  return parsed;
}

function optionalEpochSeconds(value: unknown): number | undefined {
  if (value === null || value === undefined) return undefined;
  const milliseconds = value instanceof Date ? value.getTime() : Date.parse(String(value));
  if (!Number.isFinite(milliseconds)) return undefined;
  return Math.floor(milliseconds / 1000);
}

/**
 * The one refusal PRD-006a D5 lets a caller distinguish. `postgres` surfaces the server's
 * SQLSTATE on the thrown error, and 23505 is the unique violation
 * `platform.register_password_account` deliberately lets through; every other refusal it raises
 * is 42501 with one generic message.
 */
function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as Readonly<Record<string, unknown>>)["code"] === "23505"
  );
}

interface CountRow {
  readonly count: number;
}

interface FlagRow {
  readonly flag: boolean;
}

interface IdRow {
  readonly id: string;
}

interface AddressRow {
  readonly address: string | undefined;
}

interface LockRow {
  readonly lockedUntilEpochSeconds: number | undefined;
}

function decodeCount(row: unknown): CountRow {
  return Object.freeze({ count: requiredInteger(recordRow(row)["count"], "count") });
}

function decodeFlag(row: unknown): FlagRow {
  return Object.freeze({ flag: recordRow(row)["flag"] === true });
}

function decodeId(row: unknown): IdRow {
  return Object.freeze({ id: requiredText(recordRow(row)["id"], "id") });
}

function decodeAddress(row: unknown): AddressRow {
  const value = recordRow(row)["address"];
  return Object.freeze({
    address: typeof value === "string" && value.length > 0 ? value : undefined,
  });
}

function decodeLock(row: unknown): LockRow {
  return Object.freeze({
    lockedUntilEpochSeconds: optionalEpochSeconds(recordRow(row)["locked_until"]),
  });
}

/**
 * PRD-006a D3. Both definer reads answer zero rows for every case they refuse, so a row that
 * arrives with either column blank is a shape violation rather than a refusal, and it decodes to
 * nothing rather than half a context: a policy that compared a new password against an empty
 * fragment would refuse nothing while appearing to run.
 */
function decodePolicyIdentity(row: unknown): PasswordPolicyIdentity | undefined {
  const record = recordRow(row);
  const emailDisplay = record["email_display"];
  const displayName = record["display_name"];
  if (typeof emailDisplay !== "string" || emailDisplay.length === 0) return undefined;
  if (typeof displayName !== "string" || displayName.length === 0) return undefined;
  return Object.freeze({ emailDisplay, displayName });
}

function decodeCredential(row: unknown): PasswordCredential {
  const record = recordRow(row);
  return Object.freeze({
    userId: requiredText(record["user_id"], "user_id"),
    passwordHash: requiredText(record["password_hash"], "password_hash"),
    lockedUntilEpochSeconds: optionalEpochSeconds(record["locked_until"]),
    failedAttemptCount: requiredInteger(record["failed_attempt_count"], "failed_attempt_count"),
    emailVerified: record["email_verified"] === true,
  });
}

function decodeBinding(row: unknown): SignInBinding | undefined {
  const record = recordRow(row);
  const bindingRole = requiredText(record["binding_role"], "binding_role");
  // A binding that grants no session is not a workspace the person can enter, so it is dropped
  // rather than offered. `realtor_collaborator` is the live case: the shared map gives it no
  // session role on purpose (PRD-005a D2), and offering it would produce a choice that refuses.
  if (
    !isDatabaseBindingRole(bindingRole) ||
    applicationRoleForDatabaseRole(bindingRole) === undefined
  ) {
    return undefined;
  }
  return Object.freeze({
    locationId: requiredText(record["location_id"], "location_id"),
    locationDisplayName: requiredText(record["location_display_name"], "location_display_name"),
    bindingRole,
  });
}

function decodeConsumedToken(row: unknown): ConsumedCredentialToken {
  const record = recordRow(row);
  return Object.freeze({
    userId: requiredText(record["user_id"], "user_id"),
    tokenId: requiredText(record["token_id"], "token_id"),
  });
}

function decodeRegisteredAccount(row: unknown) {
  const record = recordRow(row);
  return Object.freeze({
    userId: requiredText(record["user_id"], "user_id"),
    locationId: requiredText(record["location_id"], "location_id"),
    installationId: requiredText(record["installation_id"], "installation_id"),
    bindingId: requiredText(record["binding_id"], "binding_id"),
  });
}

export const lookupPasswordCredentialContract = defineSqlContract<PasswordCredential>({
  name: "runtime.lookup-password-credential.v1",
  access: "read",
  text: `
select
  credential.user_id::text as user_id,
  credential.password_hash,
  credential.locked_until,
  credential.failed_attempt_count,
  credential.email_verified
from platform.lookup_password_credential($1::text) as credential
  `.trim(),
  decode: decodeCredential,
});

export const lookupPasswordCredentialForUserContract = defineSqlContract<PasswordCredential>({
  name: "runtime.lookup-password-credential-for-user.v1",
  access: "read",
  text: `
select
  credential.user_id::text as user_id,
  credential.password_hash,
  credential.locked_until,
  credential.failed_attempt_count,
  credential.email_verified
from platform.lookup_password_credential_for_user($1::uuid) as credential
  `.trim(),
  decode: decodeCredential,
});

/**
 * PRD-006a D5 and D6. The address the resend control sends to, for as long as sending is still
 * the right thing to do. `platform.unverified_email_display_for_user` answers null for a person
 * with no credential, a person who is not active, and a person whose email is already confirmed,
 * so nothing this contract can return is a fact about a confirmed account.
 */
export const unverifiedEmailDisplayForUserContract = defineSqlContract<AddressRow>({
  name: "runtime.unverified-email-display-for-user.v1",
  access: "read",
  text: "select platform.unverified_email_display_for_user($1::uuid) as address",
  decode: decodeAddress,
});

export const recordEmailDeliveryContract = defineSqlContract<FlagRow>({
  name: "runtime.record-email-delivery.v1",
  access: "read",
  text: `
select platform.record_email_delivery(
  $1::uuid, $2::text, $3::text, $4::text, $5::text
) as flag
  `.trim(),
  decode: decodeFlag,
});

export const listSignInBindingsContract = defineSqlContract<SignInBinding | undefined>({
  name: "runtime.list-sign-in-bindings.v1",
  access: "read",
  text: `
select
  binding.location_id::text as location_id,
  binding.location_display_name,
  binding.binding_role
from platform.list_sign_in_bindings($1::uuid) as binding
  `.trim(),
  decode: decodeBinding,
});

export const recordPasswordSignInFailureContract = defineSqlContract<LockRow>({
  name: "runtime.record-password-sign-in-failure.v1",
  access: "read",
  text: `
select failure.locked_until
from platform.record_password_sign_in_failure($1::uuid, $2::text) as failure
  `.trim(),
  decode: decodeLock,
});

export const recordPasswordSignInSuccessContract = defineSqlContract<Record<string, never>>({
  name: "runtime.record-password-sign-in-success.v1",
  access: "read",
  text: "select platform.record_password_sign_in_success($1::uuid, $2::text)",
  decode(): Record<string, never> {
    return Object.freeze({});
  },
});

export const issueCredentialTokenContract = defineSqlContract<IdRow>({
  name: "runtime.issue-credential-token.v1",
  access: "read",
  text: `
select platform.issue_credential_token(
  $1::uuid, $2::text, $3::text, $4::integer, $5::text
)::text as id
  `.trim(),
  decode: decodeId,
});

export const consumeCredentialTokenContract = defineSqlContract<ConsumedCredentialToken>({
  name: "runtime.consume-credential-token.v1",
  access: "read",
  text: `
select consumed.user_id::text as user_id, consumed.token_id::text as token_id
from platform.consume_credential_token($1::text, $2::text) as consumed
  `.trim(),
  decode: decodeConsumedToken,
});

export const setPasswordContract = defineSqlContract<CountRow>({
  name: "runtime.set-password.v1",
  access: "read",
  text: `
select platform.set_password(
  $1::uuid, $2::text, $3::text, $4::text, $5::uuid
) as count
  `.trim(),
  decode: decodeCount,
});

export const revokeAllSessionsForUserContract = defineSqlContract<CountRow>({
  name: "runtime.revoke-all-first-party-sessions-for-user.v1",
  access: "read",
  text: `
select platform.revoke_all_first_party_sessions_for_user(
  $1::uuid, $2::text, $3::text, $4::uuid
) as count
  `.trim(),
  decode: decodeCount,
});

export const registerPasswordAccountContract = defineSqlContract<
  ReturnType<typeof decodeRegisteredAccount>
>({
  name: "runtime.register-password-account.v1",
  access: "read",
  text: `
select
  registered.user_id::text as user_id,
  registered.location_id::text as location_id,
  registered.installation_id::text as installation_id,
  registered.binding_id::text as binding_id
from platform.register_password_account(
  $1::text, $2::text, $3::text, $4::text, $5::text, $6::text
) as registered
  `.trim(),
  decode: decodeRegisteredAccount,
});

export const markEmailVerifiedContract = defineSqlContract<FlagRow>({
  name: "runtime.mark-email-verified.v1",
  access: "read",
  text: "select platform.mark_email_verified($1::uuid, $2::text) as flag",
  decode: decodeFlag,
});

export const consumeAuthRateLimitContract = defineSqlContract<FlagRow>({
  name: "runtime.consume-auth-rate-limit.v1",
  access: "read",
  text: `
select platform.consume_auth_rate_limit(
  $1::text, $2::text, $3::integer, $4::integer
) as flag
  `.trim(),
  decode: decodeFlag,
});

/**
 * PRD-006a D3. The policy context for a person the caller already holds a verified session for.
 */
export const passwordPolicyIdentityForUserContract = defineSqlContract<
  PasswordPolicyIdentity | undefined
>({
  name: "runtime.password-policy-identity-for-user.v1",
  access: "read",
  text: `
select
  identity_row.email_display,
  identity_row.display_name
from platform.password_policy_identity_for_user($1::uuid) as identity_row
  `.trim(),
  decode: decodePolicyIdentity,
});

/**
 * PRD-006a D3 and D5. The same two values for the person a live reset token belongs to, read
 * without consuming it. The definer applies the same four liveness guards
 * `platform.consume_credential_token` applies and fixes the purpose at `password_reset`, so the
 * only token this can answer for is one the consume beside it would redeem.
 */
export const passwordPolicyIdentityForResetTokenContract = defineSqlContract<
  PasswordPolicyIdentity | undefined
>({
  name: "runtime.password-policy-identity-for-reset-token.v1",
  access: "read",
  text: `
select
  identity_row.email_display,
  identity_row.display_name
from platform.password_policy_identity_for_reset_token($1::text) as identity_row
  `.trim(),
  decode: decodePolicyIdentity,
});

export function createPostgresCredentialPort(pool: DatabasePool): CredentialPort {
  return {
    async lookupCredential(emailNormalized) {
      const values: readonly SqlScalar[] = [emailNormalized];
      const rows = await queryRuntimeFunction(pool, lookupPasswordCredentialContract, values);
      return rows[0];
    },

    async lookupCredentialForUser(userId) {
      const values: readonly SqlScalar[] = [userId];
      const rows = await queryRuntimeFunction(
        pool,
        lookupPasswordCredentialForUserContract,
        values,
      );
      return rows[0];
    },

    async unverifiedEmailDisplayForUser(userId) {
      const values: readonly SqlScalar[] = [userId];
      const rows = await queryRuntimeFunction(pool, unverifiedEmailDisplayForUserContract, values);
      return rows[0]?.address;
    },

    async listSignInBindings(userId) {
      const values: readonly SqlScalar[] = [userId];
      const rows = await queryRuntimeFunction(pool, listSignInBindingsContract, values);
      return Object.freeze(rows.filter((row): row is SignInBinding => row !== undefined));
    },

    async recordSignInFailure(input) {
      const values: readonly SqlScalar[] = [input.userId, input.correlationRef];
      const rows = await queryRuntimeFunction(pool, recordPasswordSignInFailureContract, values);
      return rows[0]?.lockedUntilEpochSeconds;
    },

    async recordSignInSuccess(input) {
      const values: readonly SqlScalar[] = [input.userId, input.correlationRef];
      await queryRuntimeFunction(pool, recordPasswordSignInSuccessContract, values);
    },

    async issueToken(input) {
      const values: readonly SqlScalar[] = [
        input.userId,
        input.purpose,
        input.tokenHash,
        input.lifetimeSeconds,
        input.correlationRef,
      ];
      const rows = await queryRuntimeFunction(pool, issueCredentialTokenContract, values);
      const row = rows[0];
      if (row === undefined) {
        throw new Error("platform.issue_credential_token returned no token id");
      }
      return row.id;
    },

    async consumeToken(input) {
      const values: readonly SqlScalar[] = [input.tokenHash, input.purpose];
      const rows = await queryRuntimeFunction(pool, consumeCredentialTokenContract, values);
      return rows[0];
    },

    async passwordPolicyIdentityForUser(userId) {
      const values: readonly SqlScalar[] = [userId];
      const rows = await queryRuntimeFunction(pool, passwordPolicyIdentityForUserContract, values);
      return rows[0];
    },

    async passwordPolicyIdentityForResetToken(tokenHash) {
      const values: readonly SqlScalar[] = [tokenHash];
      const rows = await queryRuntimeFunction(
        pool,
        passwordPolicyIdentityForResetTokenContract,
        values,
      );
      return rows[0];
    },

    async setPassword(input) {
      const values: readonly SqlScalar[] = [
        input.userId,
        input.passwordHash,
        input.reason,
        input.correlationRef,
        input.keepSessionId ?? null,
      ];
      const rows = await queryRuntimeFunction(pool, setPasswordContract, values);
      return rows[0]?.count ?? 0;
    },

    async revokeAllSessions(input) {
      const values: readonly SqlScalar[] = [
        input.userId,
        input.reason,
        input.correlationRef,
        input.keepSessionId ?? null,
      ];
      const rows = await queryRuntimeFunction(pool, revokeAllSessionsForUserContract, values);
      return rows[0]?.count ?? 0;
    },

    async registerAccount(input): Promise<RegisterAccountOutcome> {
      const values: readonly SqlScalar[] = [
        input.emailNormalized,
        input.emailDisplay,
        input.passwordHash,
        input.displayName,
        input.locationDisplayName,
        input.correlationRef,
      ];
      let rows;
      try {
        rows = await queryRuntimeFunction(pool, registerPasswordAccountContract, values);
      } catch (error: unknown) {
        if (isUniqueViolation(error)) {
          return Object.freeze({ registered: false as const, reason: "duplicate_email" as const });
        }
        throw error;
      }
      const account = rows[0];
      if (account === undefined) {
        throw new Error("platform.register_password_account returned no account");
      }
      return Object.freeze({ registered: true as const, account });
    },

    async markEmailVerified(input) {
      const values: readonly SqlScalar[] = [input.userId, input.correlationRef];
      const rows = await queryRuntimeFunction(pool, markEmailVerifiedContract, values);
      return rows[0]?.flag === true;
    },

    async recordEmailDelivery(input) {
      const values: readonly SqlScalar[] = [
        input.userId,
        input.action,
        input.result,
        input.subjectId,
        input.correlationRef,
      ];
      const rows = await queryRuntimeFunction(pool, recordEmailDeliveryContract, values);
      return rows[0]?.flag === true;
    },

    async consumeRateLimit(input) {
      const values: readonly SqlScalar[] = [
        input.scope,
        input.keyHash,
        input.attemptLimit,
        input.windowSeconds,
      ];
      const rows = await queryRuntimeFunction(pool, consumeAuthRateLimitContract, values);
      return rows[0]?.flag === true;
    },
  };
}
