import { NextResponse, type NextRequest } from "next/server.js";

import {
  CSP_NONCE_HEADER,
  buildContentSecurityPolicy,
  contentSecurityPolicyHeaderName,
  createRequestNonce,
} from "./security/content-security-policy.js";

/**
 * PRD-006a 006A-AC-019. The two pages a URL token lands on.
 *
 * A reset or verification link carries its token in the query string, so the browser would
 * otherwise put that token in the `Referer` of anything the page links to, and a shared or proxy
 * cache would be free to keep the rendered page. `no-referrer` and `no-store` close both. The
 * nonce policy below is untouched: `authSurfaceSecurityHeaders` would emit its own
 * `default-src 'self'`, which would intersect with the nonce policy and block the theme bootstrap
 * script, so only these two headers are applied here.
 */
const TOKEN_BEARING_PATHS = Object.freeze(["/reset-password", "/verify-email", "/home-report"]);

function isTokenBearingPath(pathname: string): boolean {
  return TOKEN_BEARING_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

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
  if (isTokenBearingPath(request.nextUrl.pathname)) {
    response.headers.set("Referrer-Policy", "no-referrer");
    response.headers.set("Cache-Control", "no-store");
    if (request.nextUrl.pathname.startsWith("/home-report/"))
      response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  }
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
