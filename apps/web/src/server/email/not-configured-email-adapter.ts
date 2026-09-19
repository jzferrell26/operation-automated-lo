import type { TransactionalEmailPort } from "./transactional-email.js";

/**
 * PRD-006a D6 and 006A-AC-025. The honest state of a deployment with no sending domain: no
 * message is attempted and no network request is made, ever.
 *
 * This is the adapter synthetic mode always composes, and the one a review deployment composes
 * until the operator sets both email variables. The forgot-password flow still issues its token,
 * so the operator can hand a person a reset link out of band, and the audit row says
 * `not_configured` rather than pretending a message went out.
 */
export function createNotConfiguredEmailAdapter(): TransactionalEmailPort {
  return {
    configured: false,
    async send() {
      return Object.freeze({ delivered: false as const, reason: "not_configured" as const });
    },
  };
}
