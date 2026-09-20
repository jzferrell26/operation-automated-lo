import { RESET_PASSWORD_EMAIL, VERIFY_EMAIL_EMAIL } from "../../features/auth/strings.js";
import type { TransactionalEmailMessage } from "./transactional-email.js";

/**
 * PRD-006a D6. Plain text plus minimal HTML. No remote image, no tracking pixel, no link other
 * than the one the person asked for, and no styling that needs a network fetch to render.
 *
 * The link is the only variable part besides the person's name. It is never logged and never
 * reaches an audit row.
 */

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/**
 * The document carries a language and a title. Both are free, both help a screen reader in a mail
 * client, and both are what an accessibility check asks of any document, including the one the
 * preview route renders in a frame (PRD-006d 006D-AC-014).
 */
function renderHtml(subject: string, body: string, link: string, linkLabel: string): string {
  return [
    '<!doctype html><html lang="en"><head>',
    `<title>${escapeHtml(subject)}</title>`,
    "</head><body>",
    `<p>${escapeHtml(body)}</p>`,
    `<p><a href="${escapeHtml(link)}">${escapeHtml(linkLabel)}</a></p>`,
    `<p>${escapeHtml(link)}</p>`,
    "</body></html>",
  ].join("");
}

function renderText(body: string, link: string): string {
  return `${body}\n\n${link}\n`;
}

export function buildPasswordResetEmail(input: {
  readonly to: string;
  readonly name: string;
  readonly link: string;
  readonly idempotencyKey: string;
}): TransactionalEmailMessage {
  const body = RESET_PASSWORD_EMAIL.body(input.name);
  return Object.freeze({
    to: input.to,
    subject: RESET_PASSWORD_EMAIL.subject,
    text: renderText(body, input.link),
    html: renderHtml(RESET_PASSWORD_EMAIL.subject, body, input.link, "Choose a new password"),
    idempotencyKey: input.idempotencyKey,
  });
}

export function buildEmailVerificationEmail(input: {
  readonly to: string;
  readonly name: string;
  readonly link: string;
  readonly idempotencyKey: string;
}): TransactionalEmailMessage {
  const body = VERIFY_EMAIL_EMAIL.body(input.name);
  return Object.freeze({
    to: input.to,
    subject: VERIFY_EMAIL_EMAIL.subject,
    text: renderText(body, input.link),
    html: renderHtml(VERIFY_EMAIL_EMAIL.subject, body, input.link, "Confirm your email"),
    idempotencyKey: input.idempotencyKey,
  });
}
