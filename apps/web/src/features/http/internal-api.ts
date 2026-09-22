import { SUPPORT_REFERENCE_NOT_RECORDED } from "../../copy/user-language.js";

const INTERNAL_PATH = /^\/(?!\/)/u;

export const CSRF_META_NAME = "oalo-csrf-token";
export const CSRF_REQUEST_HEADER = "x-csrf-token";

/**
 * The header every internal route puts its own request reference on.
 *
 * It is the same header `apps/web/src/server/correlation-boundary.ts` sets on every campaign,
 * account, and setup response, success or refusal. The name is repeated here rather than imported
 * because that module reads `node:crypto` and belongs to the server; `internal-api.unit.test.ts`
 * imports both and fails if the two ever say different things.
 */
export const SUPPORT_REFERENCE_HEADER = "x-oalo-correlation-ref";

/** What a refusal gives a person to quote: the route's own code, and the reference support needs. */
export type InternalRefusal = Readonly<{
  /** The code the route named, or `undefined` when it named none or never answered. */
  code: string | undefined;
  /** Always a value, so the support row is never an empty line (PRD-006b D7 and D8). */
  supportReference: string;
}>;

/** The reference this response carried, or the honest stand-in when it carried none. */
export function supportReferenceFrom(response: Response): string {
  const value = response.headers.get(SUPPORT_REFERENCE_HEADER);
  return value === null || value.trim().length === 0 ? SUPPORT_REFERENCE_NOT_RECORDED : value;
}

/**
 * What a refused internal write tells the person, read once so every surface reads it the same way.
 *
 * The body is consumed here, so a caller that needs the code must not have read it already. A body
 * that is not JSON, or that names no code, still produces a refusal: the generic sentence and the
 * reference are what PRD-006b D7 owes somebody whose request failed for a reason we cannot name.
 */
export async function refusalFrom(response: Response): Promise<InternalRefusal> {
  const body: unknown = await response.json().catch(() => undefined);
  const named = (body as { error?: unknown } | undefined)?.error;
  return Object.freeze({
    code: typeof named === "string" && named.length > 0 ? named : undefined,
    supportReference: supportReferenceFrom(response),
  });
}

/** A failure that never reached a route at all: no code to map, and no reference to quote. */
export const UNREACHED_REFUSAL: InternalRefusal = Object.freeze({
  code: undefined,
  supportReference: SUPPORT_REFERENCE_NOT_RECORDED,
});

/**
 * PRD-005a 005A-AC-012. The token comes from the server-rendered `oalo-csrf-token` meta element,
 * which the authenticated layout emits for a verified session. It is `createSessionBoundCsrfToken`
 * output, an HMAC of the session reference under a server secret, never the `__Host-oalo_session`
 * cookie value. The cookie is `HttpOnly`, so this helper could not read it even if it tried.
 */
export function readCsrfToken(): string | undefined {
  const element = globalThis.document?.querySelector(`meta[name="${CSRF_META_NAME}"]`);
  const token = element?.getAttribute("content") ?? undefined;
  return token === undefined || token.length === 0 ? undefined : token;
}

export async function postInternalJson(path: string, body: unknown): Promise<Response> {
  if (!INTERNAL_PATH.test(path)) {
    throw new Error("Internal API requests must use an application-relative path");
  }

  const csrfToken = readCsrfToken();
  const request = globalThis["fetch"];
  return request(path, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(csrfToken === undefined ? {} : { [CSRF_REQUEST_HEADER]: csrfToken }),
    },
    body: JSON.stringify(body),
  });
}
