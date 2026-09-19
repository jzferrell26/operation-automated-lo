import type {
  TransactionalEmailMessage,
  TransactionalEmailPort,
  TransactionalEmailResult,
} from "./transactional-email.js";

/**
 * PRD-006a D6. One `fetch` against Resend's send endpoint.
 *
 * No `resend` package is added. The call is a single POST with three required body fields, and a
 * dependency would add a supply-chain entry and nothing else under a policy that pins exact
 * versions and refuses loose peers.
 *
 * Verified from Resend's own documentation on 2026-09-19: `POST https://api.resend.com/emails`,
 * `Authorization: Bearer <key>`, required body fields `from`, `to`, `subject`, optional `html`
 * and `text`, an optional `Idempotency-Key` header whose keys expire after twenty-four hours, and
 * a JSON success body carrying `id`.
 *
 * The API key is read once, is never logged, and never appears in a thrown error or a returned
 * value. Every failure, including a thrown `fetch`, collapses to `provider_error`.
 */

export const RESEND_SEND_ENDPOINT = "https://api.resend.com/emails";

export type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

export interface ResendEmailAdapterOptions {
  readonly apiKey: string;
  readonly from: string;
  readonly fetch?: FetchLike;
}

const PROVIDER_ERROR: TransactionalEmailResult = Object.freeze({
  delivered: false as const,
  reason: "provider_error" as const,
});

function defaultFetch(input: string, init: RequestInit): Promise<Response> {
  return globalThis.fetch(input, init);
}

async function readProviderMessageId(response: Response): Promise<string | undefined> {
  try {
    const body: unknown = await response.json();
    if (typeof body !== "object" || body === null) return undefined;
    const id = (body as Readonly<Record<string, unknown>>)["id"];
    return typeof id === "string" && id.length > 0 && id.length <= 200 ? id : undefined;
  } catch {
    return undefined;
  }
}

export function createResendEmailAdapter(
  options: Readonly<ResendEmailAdapterOptions>,
): TransactionalEmailPort {
  const send = options.fetch ?? defaultFetch;
  return {
    configured: true,
    async send(message: Readonly<TransactionalEmailMessage>): Promise<TransactionalEmailResult> {
      let response: Response;
      try {
        response = await send(RESEND_SEND_ENDPOINT, {
          method: "POST",
          headers: {
            authorization: `Bearer ${options.apiKey}`,
            "content-type": "application/json",
            "idempotency-key": message.idempotencyKey,
          },
          body: JSON.stringify({
            from: options.from,
            to: message.to,
            subject: message.subject,
            text: message.text,
            html: message.html,
          }),
        });
      } catch {
        // The thrown value is discarded rather than wrapped: a network error from `fetch` can
        // carry the request headers, and those headers carry the key.
        return PROVIDER_ERROR;
      }
      if (!response.ok) return PROVIDER_ERROR;
      const providerMessageId = await readProviderMessageId(response);
      if (providerMessageId === undefined) return PROVIDER_ERROR;
      return Object.freeze({ delivered: true as const, providerMessageId });
    },
  };
}
