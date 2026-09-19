const INTERNAL_PATH = /^\/(?!\/)/u;

export const CSRF_META_NAME = "oalo-csrf-token";
export const CSRF_REQUEST_HEADER = "x-csrf-token";

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
