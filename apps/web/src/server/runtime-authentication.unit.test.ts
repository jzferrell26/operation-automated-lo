import { randomBytes } from "node:crypto";

import type { AuthenticatedPrincipal } from "@oalo/application";
import { createSessionBoundCsrfToken, FIRST_PARTY_SESSION_COOKIE } from "@oalo/auth";
import {
  formatActorRef,
  formatInstallationRef,
  formatLocationRef,
  formatSessionRef,
} from "@oalo/contracts";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type {
  IdentityDirectory,
  RoleBindingPort,
  SessionDisplayNames,
} from "./authenticated-principal.js";
import { OALO_REVIEW_SURFACE_AUTHORIZED } from "./authenticated-workspace-data.js";
import { handleCampaignApproval } from "./campaign-approval-handler.js";
import { LOCAL_SYNTHETIC_ENV } from "./campaign-command-test-support.js";
import { handleCampaignPreflight } from "./campaign-preflight-handler.js";
import {
  RUNTIME_AUTHENTICATION_VARIABLES,
  resetRuntimeAuthenticationForTests,
  resolveRuntimeAuthenticationComposition,
  resolveRuntimeCampaignCommandPorts,
  resolveRuntimeShellSession,
  VERIFIED_SESSION_SOURCE,
} from "./runtime-authentication.js";

/**
 * 005A-AC-001 needs a spy on the synthetic port factory itself, so the module is replaced by one
 * whose exports are spies that delegate to the real implementations. Everything else in this file
 * therefore exercises the production code path, not a stub.
 */
const ports = vi.hoisted(() => ({
  createDefaultCampaignCommandPorts: vi.fn(),
  createLocalSyntheticPrincipal: vi.fn(),
  resolveAuthenticatedReadPrincipal: vi.fn(),
}));

const original = vi.hoisted(() => ({
  module: undefined as typeof import("./authenticated-principal.js") | undefined,
}));

vi.mock("./authenticated-principal.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./authenticated-principal.js")>();
  original.module = actual;
  return { ...actual, ...ports };
});

const CSRF_SECRET = randomBytes(32).toString("base64url");
const SESSION_COOKIE_VALUE = randomBytes(32).toString("base64url");
const LOCATION_ID = "00000000-0000-4000-8000-0000000009a1";
const ACTOR_ID = "00000000-0000-4000-8000-0000000009a2";
const SESSION_ID = "00000000-0000-4000-8000-0000000009a3";
const INSTALLATION_ID = "00000000-0000-4000-8000-0000000009a4";

const REVIEW_ENV = Object.freeze({
  OALO_ENVIRONMENT: "preview",
  OALO_PROVIDER_MODE: "stub",
  OALO_SYNTHETIC_DATA_ONLY: "true",
  OALO_REVIEW_SURFACE: OALO_REVIEW_SURFACE_AUTHORIZED,
  OALO_DATABASE_URL: "postgres://runtime:runtime@127.0.0.1:5432/oalo_review",
  OALO_APP_URL: "https://review.operation-automated-lo.test",
  OALO_ALLOWED_ORIGINS: "https://review.operation-automated-lo.test",
  OALO_CSRF_SERVER_SECRET: CSRF_SECRET,
});

const PRODUCTION_ENV = Object.freeze({ ...REVIEW_ENV, OALO_ENVIRONMENT: "production" });

const EMBEDDED_ENV = Object.freeze({
  ...REVIEW_ENV,
  OALO_EMBEDDED_SESSION_ISSUER: "https://auth.operation-automated-lo.test",
  OALO_EMBEDDED_SESSION_AUDIENCE: "oalo-web",
  OALO_EMBEDDED_SESSION_PUBLIC_KEYS_JSON: JSON.stringify({
    key_primary: "-----BEGIN PUBLIC KEY-----\nfixture\n-----END PUBLIC KEY-----\n",
  }),
});

/**
 * The variables the composition cannot do without. Two groups are optional as a set rather than
 * individually: the three embedded ones (PRD-005a) and the two email ones (PRD-006a D6). All
 * present or all absent is fine; a partial set is the composition failure the case below pins.
 */
const REQUIRED_VARIABLES = RUNTIME_AUTHENTICATION_VARIABLES.filter(
  (name) =>
    !name.startsWith("OALO_EMBEDDED") &&
    name !== "OALO_RESEND_API_KEY" &&
    name !== "OALO_EMAIL_FROM",
);

function withoutVariable(variable: string): Record<string, string> {
  const environment: Record<string, string> = { ...REVIEW_ENV };
  delete environment[variable];
  return environment;
}

function mutationRequest(headers: Readonly<Record<string, string>> = {}): Request {
  return new Request("https://review.operation-automated-lo.test/api/campaigns/approve", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify({ campaignRef: "campaign_reviewProbe001", decision: "approved" }),
  });
}

function denyingIdentityDirectory(): IdentityDirectory {
  return {
    async resolveLocationId() {
      return undefined;
    },
    async resolveActorId() {
      return undefined;
    },
  };
}

function denyingRoleBindings(): RoleBindingPort {
  return {
    async currentRoleVersion() {
      return undefined;
    },
  };
}

function cookieHeaders(): Record<string, string> {
  return {
    cookie: `${FIRST_PARTY_SESSION_COOKIE}=${SESSION_COOKIE_VALUE}`,
    origin: "https://review.operation-automated-lo.test",
    host: "review.operation-automated-lo.test",
  };
}

let loggedErrors: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  const actual = original.module;
  if (actual === undefined) throw new Error("The authenticated principal module did not load");
  ports.createDefaultCampaignCommandPorts.mockImplementation(
    actual.createDefaultCampaignCommandPorts,
  );
  ports.createLocalSyntheticPrincipal.mockImplementation(actual.createLocalSyntheticPrincipal);
  ports.resolveAuthenticatedReadPrincipal.mockImplementation(
    actual.resolveAuthenticatedReadPrincipal,
  );
  loggedErrors = vi.spyOn(console, "error").mockImplementation(() => undefined);
  loggedErrors.mockClear();
  resetRuntimeAuthenticationForTests();
});

afterEach(() => {
  resetRuntimeAuthenticationForTests();
});

describe("runtime authentication composition", () => {
  it("builds the static synthetic ports only in synthetic mode", () => {
    expect(resolveRuntimeAuthenticationComposition(LOCAL_SYNTHETIC_ENV).mode).toBe("synthetic");
    expect(ports.createDefaultCampaignCommandPorts).toHaveBeenCalledTimes(1);

    resetRuntimeAuthenticationForTests();
    ports.createDefaultCampaignCommandPorts.mockClear();

    const review = resolveRuntimeAuthenticationComposition(REVIEW_ENV);
    expect(review.mode).toBe("review");
    expect(review.failedVariable).toBeUndefined();
    expect(ports.createDefaultCampaignCommandPorts).not.toHaveBeenCalled();

    resetRuntimeAuthenticationForTests();

    expect(resolveRuntimeAuthenticationComposition(PRODUCTION_ENV).mode).toBe("review");
    expect(ports.createDefaultCampaignCommandPorts).not.toHaveBeenCalled();
  });

  it("supplies the session lookup, the mutation gate, and no embedded policy by default", () => {
    const composed = resolveRuntimeCampaignCommandPorts(REVIEW_ENV);

    expect(composed.firstPartySessions).toBeDefined();
    expect(composed.mutation?.expectedHost).toBe("review.operation-automated-lo.test");
    expect(composed.mutation?.allowedBrowserOrigins).toEqual([
      "https://review.operation-automated-lo.test",
    ]);
    expect(composed.mutation?.csrfServerSecret.byteLength).toBeGreaterThanOrEqual(32);
    expect(composed.embedded).toBeUndefined();
  });

  it.each(REQUIRED_VARIABLES)("denies every request when %s is absent", async (variable) => {
    const composition = resolveRuntimeAuthenticationComposition(withoutVariable(variable));

    expect(composition.mode).toBe("review");
    expect(composition.failedVariable).toBe(variable);
    expect(composition.ports.firstPartySessions).toBeUndefined();
    expect(composition.ports.mutation).toBeUndefined();
    expect(composition.ports.embedded).toBeUndefined();
    expect(
      await composition.ports.identityDirectory.resolveLocationId(formatLocationRef(LOCATION_ID)),
    ).toBeUndefined();
    expect(
      await composition.ports.identityDirectory.resolveActorId(formatActorRef(ACTOR_ID)),
    ).toBeUndefined();
    expect(
      await composition.ports.roleBindings.currentRoleVersion({
        actorRef: formatActorRef(ACTOR_ID),
        locationRef: formatLocationRef(LOCATION_ID),
        role: "campaign_creator",
      }),
    ).toBeUndefined();
  });

  it.each([
    ["OALO_APP_URL", "http://review.operation-automated-lo.test"],
    ["OALO_ALLOWED_ORIGINS", "https://review.operation-automated-lo.test/app"],
    ["OALO_ALLOWED_ORIGINS", "*"],
    ["OALO_CSRF_SERVER_SECRET", "too-short"],
    ["OALO_DATABASE_URL", "mysql://runtime@127.0.0.1/oalo"],
  ])("denies every request when %s is invalid", (variable, value) => {
    const composition = resolveRuntimeAuthenticationComposition({
      ...REVIEW_ENV,
      [variable]: value,
    });

    expect(composition.failedVariable).toBe(variable);
    expect(composition.ports.mutation).toBeUndefined();
  });

  it("logs a composition failure once per process, naming the variable and not its value", () => {
    const missing = withoutVariable("OALO_CSRF_SERVER_SECRET");

    resolveRuntimeAuthenticationComposition(missing);
    resolveRuntimeAuthenticationComposition({
      ...missing,
      OALO_ALLOWED_ORIGINS: "https://review.operation-automated-lo.test,https://app.example.test",
    });

    expect(loggedErrors).toHaveBeenCalledTimes(1);
    const message = String(loggedErrors.mock.calls[0]?.[0]);
    expect(message).toContain("OALO_CSRF_SERVER_SECRET");
    expect(message).not.toContain(CSRF_SECRET);
  });

  it("treats a partial embedded variable set as a composition failure", () => {
    const partial = resolveRuntimeAuthenticationComposition({
      ...REVIEW_ENV,
      OALO_EMBEDDED_SESSION_ISSUER: EMBEDDED_ENV.OALO_EMBEDDED_SESSION_ISSUER,
    });

    expect(partial.failedVariable).toBe("OALO_EMBEDDED_SESSION_AUDIENCE");
    expect(partial.ports.embedded).toBeUndefined();
    expect(partial.ports.firstPartySessions).toBeUndefined();
  });

  /**
   * 005A-AC-003. The composition wires the activity check to PRD-005b's
   * `platform.first_party_session_is_active` rather than to a constant. That the predicate answers
   * true only for a live session is proven where it can be: the pgTAP suite for the function, and
   * `postgres-authentication-ports.unit.test.ts` for the port that calls it. What is proven here is
   * that the composition supplies it at all, and that a database read is what answers the question.
   */
  it("parses a complete embedded set and wires the activity check to the session store", () => {
    const composition = resolveRuntimeAuthenticationComposition(EMBEDDED_ENV);

    expect(composition.failedVariable).toBeUndefined();
    expect(composition.ports.embedded?.issuer).toBe(EMBEDDED_ENV.OALO_EMBEDDED_SESSION_ISSUER);
    expect(composition.ports.embedded?.audience).toBe("oalo-web");
    expect(Object.keys(composition.ports.embedded?.publicKeysById ?? {})).toEqual(["key_primary"]);
    expect(typeof composition.ports.embedded?.isSessionActive).toBe("function");
    expect(composition.ports.sessionActivity).toBeDefined();
    expect(composition.ports.sessionDisplay).toBeDefined();
    expect(composition.ports.sessionIssuance).toBeDefined();
    // PRD-006a D1 and D6. Review mode composes the credential boundary, and composes the
    // not-configured email adapter until both sending variables are set.
    expect(composition.ports.credentials).toBeDefined();
    expect(composition.ports.transactionalEmail).toBeDefined();
  });

  it("rejects malformed embedded public key material by name", () => {
    const composition = resolveRuntimeAuthenticationComposition({
      ...EMBEDDED_ENV,
      OALO_EMBEDDED_SESSION_PUBLIC_KEYS_JSON: "{not json",
    });

    expect(composition.failedVariable).toBe("OALO_EMBEDDED_SESSION_PUBLIC_KEYS_JSON");
  });
});

describe("runtime authentication at the exported handlers", () => {
  /** 005A-AC-015. No credential, review mode: refused, and never the synthetic principal. */
  it("refuses an unauthenticated mutation in review mode and builds no synthetic principal", async () => {
    const approval = await handleCampaignApproval(mutationRequest(), REVIEW_ENV);
    const preflight = await handleCampaignPreflight(mutationRequest(), REVIEW_ENV);

    expect(approval.status).toBe(401);
    expect(preflight.status).toBe(401);
    expect(ports.createLocalSyntheticPrincipal).not.toHaveBeenCalled();
  });

  it("refuses an unauthenticated mutation in production mode for the same reason", async () => {
    const approval = await handleCampaignApproval(mutationRequest(), PRODUCTION_ENV);

    expect(approval.status).toBe(401);
    expect(ports.createLocalSyntheticPrincipal).not.toHaveBeenCalled();
  });

  /**
   * 005A-AC-004 at the composition level. A failed composition supplies no mutation gate, so a
   * cookie-bearing mutation is refused before any session lookup or repository is constructed.
   */
  it("refuses a cookie-bearing mutation when the composition failed", async () => {
    const response = await handleCampaignApproval(
      mutationRequest(cookieHeaders()),
      withoutVariable("OALO_CSRF_SERVER_SECRET"),
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "UNAUTHENTICATED" });
  });

  /** 005A-AC-016. Identity fields are never accepted from the browser. */
  it.each(["locationRef", "locationId", "actorRef", "installationRef", "role", "roleVersion"])(
    "rejects a request body carrying %s",
    async (field) => {
      const request = new Request("https://oalo.local/api/campaigns/approve", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          campaignRef: "campaign_syntheticProbe001",
          decision: "approved",
          [field]: "attacker_supplied",
        }),
      });

      const response = await handleCampaignApproval(request, LOCAL_SYNTHETIC_ENV);

      expect(response.status).toBe(400);
    },
  );
});

describe("runtime shell session", () => {
  it("reports an unauthenticated shell in review mode without a session", async () => {
    const shell = await resolveRuntimeShellSession(
      new Request("https://review.operation-automated-lo.test/overview"),
      REVIEW_ENV,
    );

    expect(shell.mode).toBe("review");
    expect(shell.authenticated).toBe(false);
    expect(shell.session).toBeUndefined();
    expect(shell.csrfToken).toBeUndefined();
  });

  /**
   * Resolves the shell for a verified principal with a stubbed display read. The other ports deny,
   * because the read principal is already mocked and nothing else in the shell path consults them:
   * anything that started to would fail here rather than silently succeed against a live pool.
   */
  async function shellForDisplay(
    role: AuthenticatedPrincipal["role"],
    display: SessionDisplayNames | undefined,
  ) {
    const gate = resolveRuntimeCampaignCommandPorts(REVIEW_ENV).mutation;
    if (gate === undefined) throw new Error("The review composition must supply a mutation gate");
    const principal: AuthenticatedPrincipal = {
      actorRef: formatActorRef(ACTOR_ID),
      actorId: ACTOR_ID,
      locationRef: formatLocationRef(LOCATION_ID),
      locationId: LOCATION_ID,
      installationRef: formatInstallationRef(INSTALLATION_ID),
      role,
      roleVersion: 17,
      sessionId: formatSessionRef(SESSION_ID),
      authenticationMode: "first_party",
    };
    ports.resolveAuthenticatedReadPrincipal.mockResolvedValue(Object.freeze(principal));
    const shell = await resolveRuntimeShellSession(
      new Request("https://review.operation-automated-lo.test/overview", {
        headers: cookieHeaders(),
      }),
      REVIEW_ENV,
      {
        identityDirectory: denyingIdentityDirectory(),
        roleBindings: denyingRoleBindings(),
        mutation: gate,
        sessionDisplay: {
          async resolve() {
            return display;
          },
        },
      },
    );
    return { gate, principal, shell };
  }

  // 005A-AC-011. The display names come from the definer read, not from the fixture persona and
  // not from anything the browser sent.
  it("projects the verified principal and emits a session-bound CSRF token, never the cookie", async () => {
    const { gate, principal, shell } = await shellForDisplay("campaign_approver", {
      locationDisplayName: "Review location (not connected)",
      userDisplayName: "Review approver",
    });

    expect(shell.authenticated).toBe(true);
    expect(shell.session?.user.displayName).toBe("Review approver");
    expect(shell.session?.user.roleLabel).toBe("Approver");
    expect(shell.session?.user.capabilities).not.toContain("campaign:create");
    expect(shell.session?.location.displayName).toBe("Review location (not connected)");
    expect(shell.session?.location.source).toBe(VERIFIED_SESSION_SOURCE);
    expect(shell.csrfToken).toBe(
      createSessionBoundCsrfToken({
        serverSecret: gate.csrfServerSecret,
        sessionId: principal.sessionId,
      }),
    );
    expect(shell.csrfToken).not.toBe(SESSION_COOKIE_VALUE);
  });

  /**
   * 005A-AC-011's failure direction. When the definer read yields nothing, the shell states the
   * canonical references the session carries rather than inventing a friendly name.
   */
  it("falls back to the canonical references when the display read yields nothing", async () => {
    const { principal, shell } = await shellForDisplay("campaign_creator", undefined);

    expect(shell.session?.user.displayName).toBe(principal.actorRef);
    expect(shell.session?.location.displayName).toBe(principal.locationRef);
  });

  it("never projects a shell session in synthetic mode", async () => {
    const shell = await resolveRuntimeShellSession(
      new Request("https://oalo.local/overview"),
      LOCAL_SYNTHETIC_ENV,
    );

    expect(shell.mode).toBe("synthetic");
    expect(shell.authenticated).toBe(false);
    expect(shell.session).toBeUndefined();
  });
});
