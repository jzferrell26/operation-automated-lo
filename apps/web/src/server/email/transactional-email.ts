/**
 * PRD-006a D6. The transactional email port.
 *
 * The product sends exactly two emails: a password-reset link and an email-confirmation link.
 * Neither is marketing, and nothing else may be sent through this port.
 *
 * The port has one method and three outcomes, because those are the three things that actually
 * happen: the message went, no provider is configured, or the provider refused it. Every one of
 * them is a fact the audit row records; none of them is an exception, because a failure to send a
 * reset email must not turn the forgot-password response into something a caller can tell apart
 * from a success.
 */

export interface TransactionalEmailMessage {
  readonly to: string;
  readonly subject: string;
  readonly text: string;
  readonly html: string;
  /**
   * The credential token's id. The Resend adapter sends it as `Idempotency-Key`, so a retried
   * send of the same token cannot deliver the same link twice.
   */
  readonly idempotencyKey: string;
}

export type TransactionalEmailResult =
  | Readonly<{ delivered: true; providerMessageId: string }>
  | Readonly<{ delivered: false; reason: "not_configured" | "provider_error" }>;

export interface TransactionalEmailPort {
  /**
   * Whether this deployment can actually send. The composition always supplies a port, so without
   * this a caller could not tell "configured" from "not configured" except by attempting a send,
   * and 006A-AC-021 turns on not attempting one: a deployment with no sending domain must not
   * issue a confirmation token or ask anyone to check an inbox.
   */
  readonly configured: boolean;
  send(message: Readonly<TransactionalEmailMessage>): Promise<TransactionalEmailResult>;
}

/** The subject an `auth.reset-email` or `auth.verification-email` audit row carries. */
export function emailDeliverySubject(result: TransactionalEmailResult): string {
  return result.delivered ? result.providerMessageId : result.reason;
}

export function emailDeliveryResult(result: TransactionalEmailResult): "success" | "failed" {
  return result.delivered ? "success" : "failed";
}
