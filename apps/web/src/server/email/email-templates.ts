import { RESET_EMAIL_COPY, VERIFICATION_EMAIL_COPY } from "../../features/auth/strings.js";
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

function renderHtml(body: string, link: string, linkLabel: string): string {
  return [
    "<!doctype html><html><body>",
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
  const body = RESET_EMAIL_COPY.body(input.name);
  return Object.freeze({
    to: input.to,
    subject: RESET_EMAIL_COPY.subject,
    text: renderText(body, input.link),
    html: renderHtml(body, input.link, "Choose a new password"),
    idempotencyKey: input.idempotencyKey,
  });
}

export function buildEmailVerificationEmail(input: {
  readonly to: string;
  readonly name: string;
  readonly link: string;
  readonly idempotencyKey: string;
}): TransactionalEmailMessage {
  const body = VERIFICATION_EMAIL_COPY.body(input.name);
  return Object.freeze({
    to: input.to,
    subject: VERIFICATION_EMAIL_COPY.subject,
    text: renderText(body, input.link),
    html: renderHtml(body, input.link, "Confirm your email"),
    idempotencyKey: input.idempotencyKey,
  });
}
