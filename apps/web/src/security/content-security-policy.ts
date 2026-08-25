/**
 * Builds the application Content-Security-Policy for a single request.
 * Nonces must be generated server-side from cryptographic randomness and never
 * copied from inbound request headers.
 */
export const CSP_NONCE_HEADER = "x-nonce" as const;

export type ContentSecurityPolicyMode = "enforce" | "report-only";

export function createRequestNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

export function buildContentSecurityPolicy(nonce: string): string {
  if (!/^[A-Za-z0-9+/=]+$/.test(nonce) || nonce.length < 16) {
    throw new Error("CSP nonce must be a server-generated base64 value.");
  }

  // style-src keeps 'unsafe-inline' because tenant accent variables and theme
  // color-scheme are applied through HTML style attributes, which CSP nonces
  // do not authorize. script-src is nonce + strict-dynamic only.
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

export function contentSecurityPolicyHeaderName(
  mode: ContentSecurityPolicyMode = "enforce",
): "Content-Security-Policy" | "Content-Security-Policy-Report-Only" {
  return mode === "report-only" ? "Content-Security-Policy-Report-Only" : "Content-Security-Policy";
}
