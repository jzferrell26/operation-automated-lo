import { NextResponse, type NextRequest } from "next/server.js";

import {
  CSP_NONCE_HEADER,
  buildContentSecurityPolicy,
  contentSecurityPolicyHeaderName,
  createRequestNonce,
} from "./security/content-security-policy.js";

/**
 * Issues a fresh CSP nonce per request and attaches the enforced policy.
 * Proxy is not an authorization boundary; it only hardens browser responses.
 */
export function proxy(request: NextRequest): NextResponse {
  const nonce = createRequestNonce();
  const contentSecurityPolicy = buildContentSecurityPolicy(nonce);
  const cspHeaderName = contentSecurityPolicyHeaderName("enforce");

  const requestHeaders = new Headers(request.headers);
  // Never trust a client-supplied nonce or inbound CSP request header.
  requestHeaders.delete(CSP_NONCE_HEADER);
  requestHeaders.delete("content-security-policy");
  requestHeaders.delete("content-security-policy-report-only");
  requestHeaders.set(CSP_NONCE_HEADER, nonce);
  // Next.js reads the script nonce from the request CSP header during render.
  requestHeaders.set(cspHeaderName, contentSecurityPolicy);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  response.headers.set(cspHeaderName, contentSecurityPolicy);
  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
