export const G2_MATRIX_GATE_ID = "G2" as const;

export const G2_MATRIX_CASES = [
  {
    caseId: "signed_custom_page_context",
    title: "Signed Custom Page context accepted",
    actionClass: "SESSION_EXCHANGE",
    path: "/sessions/ghl/bootstrap",
    method: "POST",
  },
  {
    caseId: "oauth_callback_success",
    title: "OAuth callback success",
    actionClass: "SESSION_EXCHANGE",
    path: "/oauth/ghl/callback",
    method: "POST",
  },
  {
    caseId: "location_token_exchange",
    title: "Per-location token exchange",
    actionClass: "SESSION_EXCHANGE",
    path: "/oauth/ghl/location-token",
    method: "POST",
  },
  {
    caseId: "refresh_rotation",
    title: "Refresh rotation",
    actionClass: "SESSION_EXCHANGE",
    path: "/oauth/ghl/refresh",
    method: "POST",
  },
  {
    caseId: "uninstall_blocks_work",
    title: "Uninstall blocks new work",
    actionClass: "SIMULATED_WRITE",
    path: "/webhooks/ghl/uninstall",
    method: "POST",
  },
  {
    caseId: "reinstall_restores_authority",
    title: "Reinstall restores authority",
    actionClass: "SIMULATED_WRITE",
    path: "/webhooks/ghl/install",
    method: "POST",
  },
  {
    caseId: "role_resolution",
    title: "Role resolution",
    actionClass: "READ_ONLY",
    path: "/sessions/ghl/role",
    method: "GET",
  },
  {
    caseId: "embedded_iframe_access",
    title: "Embedded / iframe access",
    actionClass: "SESSION_EXCHANGE",
    path: "/sessions/ghl/embedded",
    method: "POST",
  },
  {
    caseId: "first_party_fallback",
    title: "First-party fallback when embed cookies fail",
    actionClass: "SESSION_EXCHANGE",
    path: "/sessions/ghl/first-party",
    method: "POST",
  },
] as const;

export type G2MatrixCaseId = (typeof G2_MATRIX_CASES)[number]["caseId"];

export type G2MatrixCase = (typeof G2_MATRIX_CASES)[number];

export function listG2MatrixCases(): readonly G2MatrixCase[] {
  return G2_MATRIX_CASES;
}

export function getG2MatrixCase(caseId: string): G2MatrixCase {
  const found = G2_MATRIX_CASES.find((entry) => entry.caseId === caseId);
  if (!found) {
    throw new Error(`Unknown G2 matrix caseId: ${caseId}`);
  }
  return found;
}
