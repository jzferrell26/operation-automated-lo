import type { DatabaseBindingRole } from "@oalo/auth";

/**
 * PRD-006a D1. The shapes the credential trust boundary speaks in.
 *
 * Every decision these describe is taken inside a `security definer` function, not here. This
 * interface exists so the password handler can be driven from a test without a connection, and so
 * the one pool the runtime composition opens is the only pool the auth routes use.
 *
 * Identifiers on this boundary are raw UUIDs, not canonical references. They never come from a
 * browser: each one is either returned by a definer function or parsed from a verified session.
 */

export type CredentialTokenPurpose = "password_reset" | "email_verification" | "sign_in_choice";

export type PasswordChangeReason = "initial" | "reset" | "change";

export type AuthRateLimitScope =
  "sign_in_ip" | "sign_up_ip" | "forgot_ip" | "forgot_email" | "reset_ip" | "verify_ip";

export interface PasswordCredential {
  readonly userId: string;
  readonly passwordHash: string;
  readonly lockedUntilEpochSeconds: number | undefined;
  readonly failedAttemptCount: number;
  readonly emailVerified: boolean;
}

export interface SignInBinding {
  readonly locationId: string;
  readonly locationDisplayName: string;
  readonly bindingRole: DatabaseBindingRole;
}

export interface RegisteredAccount {
  readonly userId: string;
  readonly locationId: string;
  readonly installationId: string;
  readonly bindingId: string;
}

/**
 * The one refusal the boundary lets a caller tell apart, for the reason PRD-006a D5 gives: a
 * sign-up that pretends to succeed leaves a real person with no account and no explanation.
 */
export type RegisterAccountOutcome =
  | Readonly<{ registered: true; account: RegisteredAccount }>
  | Readonly<{ registered: false; reason: "duplicate_email" }>;

export interface ConsumedCredentialToken {
  readonly userId: string;
  readonly tokenId: string;
}

export type EmailDeliveryAction = "auth.reset-email" | "auth.verification-email";

export interface CredentialPort {
  lookupCredential(emailNormalized: string): Promise<Readonly<PasswordCredential> | undefined>;
  /**
   * The same read keyed by the person. Change-password has a verified session and no address in
   * hand, and looking a credential up by an address the browser supplied would be a credential
   * oracle even with the result checked against the session.
   */
  lookupCredentialForUser(userId: string): Promise<Readonly<PasswordCredential> | undefined>;
  listSignInBindings(userId: string): Promise<readonly Readonly<SignInBinding>[]>;
  /** Returns the instant the account is locked until, when this failure locked it. */
  recordSignInFailure(
    input: Readonly<{ userId: string; correlationRef: string }>,
  ): Promise<number | undefined>;
  recordSignInSuccess(input: Readonly<{ userId: string; correlationRef: string }>): Promise<void>;
  issueToken(
    input: Readonly<{
      userId: string;
      purpose: CredentialTokenPurpose;
      tokenHash: string;
      lifetimeSeconds: number;
      correlationRef: string;
    }>,
  ): Promise<string>;
  consumeToken(
    input: Readonly<{ tokenHash: string; purpose: CredentialTokenPurpose }>,
  ): Promise<Readonly<ConsumedCredentialToken> | undefined>;
  /** Returns how many of the person's other sessions the change revoked. */
  setPassword(
    input: Readonly<{
      userId: string;
      passwordHash: string;
      reason: PasswordChangeReason;
      correlationRef: string;
      keepSessionId?: string;
    }>,
  ): Promise<number>;
  revokeAllSessions(
    input: Readonly<{
      userId: string;
      reason: "sign_out" | "operator" | "binding_revoked" | "password_changed";
      correlationRef: string;
      keepSessionId?: string;
    }>,
  ): Promise<number>;
  registerAccount(
    input: Readonly<{
      emailNormalized: string;
      emailDisplay: string;
      passwordHash: string;
      displayName: string;
      locationDisplayName: string;
      correlationRef: string;
    }>,
  ): Promise<RegisterAccountOutcome>;
  markEmailVerified(input: Readonly<{ userId: string; correlationRef: string }>): Promise<boolean>;
  /** 006A-AC-017. The audit row an email send leaves behind, written after the provider answers. */
  recordEmailDelivery(
    input: Readonly<{
      userId: string;
      action: EmailDeliveryAction;
      result: "success" | "failed";
      subjectId: string;
      correlationRef: string;
    }>,
  ): Promise<boolean>;
  /** False once the window's limit is exceeded. */
  consumeRateLimit(
    input: Readonly<{
      scope: AuthRateLimitScope;
      keyHash: string;
      attemptLimit: number;
      windowSeconds: number;
    }>,
  ): Promise<boolean>;
}
