import { FIRST_PARTY_SESSION_COOKIE } from "@oalo/auth";
import { describe, expect, it, vi } from "vitest";

import {
  createStaticIdentityDirectory,
  createStaticRoleBindingPort,
  type CampaignCommandPorts,
  type ReviewSessionPort,
} from "./authenticated-principal.js";
import {
  REVIEW_PERSONAS,
  REVIEW_SESSION_LIFETIME_SECONDS,
  ReviewSessionConfigurationError,
  ReviewSessionProductionRefusalError,
  ReviewSignInRequestSchema,
  ReviewSurfaceUnavailableError,
  assertReviewSessionSurface,
  handleReviewSignIn,
  readReviewSessionConfiguration,
  resolvePersonaBinding,
  signInSecretMatches,
} from "./review-session-handler.js";

/**
 * PRD-005b 005B-AC-011, 013, 014, and 020, without a database.
 *
 * The point of most of these cases is what does *not* happen: the pool factory is a spy that fails
 * the test if it is ever called, so "refused before any database access" is a fact rather than a
 * claim about the order of statements in the source.
 */

const REVIEW_HOST = "review.operation-automated-lo.test";
const REVIEW_ORIGIN = `https://${REVIEW_HOST}`;
const SIGN_IN_SECRET = "review-sign-in-secret-fixture-0123456789";
const REVIEW_LOCATION_ID = "1f9b4d2e-6c31-4a05-8f77-2b0c9d5e4a13";
const OUTSIDER_LOCATION_ID = "2a8c5e3f-7d42-4b16-9a88-3c1d0e6f5b24";

function reviewEnvironment(
  overrides: Readonly<Record<string, string>> = {},
): Readonly<Record<string, string>> {
  return Object.freeze({
    OALO_ENVIRONMENT: "preview",
    OALO_PROVIDER_MODE: "stub",
    OALO_SYNTHETIC_DATA_ONLY: "true",
    OALO_REVIEW_SURFACE: "authorized",
    OALO_REVIEW_SIGNIN_SECRET: SIGN_IN_SECRET,
    OALO_REVIEW_LOCATION_ID: REVIEW_LOCATION_ID,
    OALO_REVIEW_OUTSIDER_LOCATION_ID: OUTSIDER_LOCATION_ID,
    ...overrides,
  });
}

/** Every call is a failure: nothing in this file may reach the database. */
function forbiddenReviewSessionPort(): ReviewSessionPort {
  return {
    async resolvePersona() {
      throw new Error("the database must not be reached");
    },
    async issue() {
      throw new Error("the database must not be reached");
    },
    async revoke() {
      throw new Error("the database must not be reached");
    },
    async recordDeniedAttempt() {
      throw new Error("the database must not be reached");
    },
  };
}

function portsWith(reviewSessions: ReviewSessionPort): CampaignCommandPorts {
  return {
    identityDirectory: createStaticIdentityDirectory([]),
    roleBindings: createStaticRoleBindingPort([]),
    mutation: {
      expectedHost: REVIEW_HOST,
      allowedBrowserOrigins: [REVIEW_ORIGIN],
      csrfServerSecret: new Uint8Array(32).fill(7),
    },
    reviewSessions,
  };
}

function signInRequest(body: unknown, headers: Readonly<Record<string, string>> = {}): Request {
  return new Request(`${REVIEW_ORIGIN}/api/review/session`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: REVIEW_ORIGIN,
      host: REVIEW_HOST,
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

describe("review session environment", () => {
  it("refuses production before review mode is consulted (005B-AC-020)", () => {
    expect(() =>
      assertReviewSessionSurface(
        reviewEnvironment({ OALO_ENVIRONMENT: "production", OALO_REVIEW_SURFACE: "authorized" }),
      ),
    ).toThrow(ReviewSessionProductionRefusalError);
  });

  it("refuses a deployment that is not in review mode", () => {
    expect(() =>
      assertReviewSessionSurface(reviewEnvironment({ OALO_REVIEW_SURFACE: "" })),
    ).toThrow(ReviewSurfaceUnavailableError);
  });

  it.each([
    ["OALO_REVIEW_SIGNIN_SECRET", { OALO_REVIEW_SIGNIN_SECRET: "short" }],
    ["OALO_REVIEW_SIGNIN_SECRET", { OALO_REVIEW_SIGNIN_SECRET: "" }],
    ["OALO_REVIEW_LOCATION_ID", { OALO_REVIEW_LOCATION_ID: "not-a-uuid" }],
    ["OALO_REVIEW_LOCATION_ID", { OALO_REVIEW_LOCATION_ID: REVIEW_LOCATION_ID.toUpperCase() }],
    ["OALO_REVIEW_OUTSIDER_LOCATION_ID", { OALO_REVIEW_OUTSIDER_LOCATION_ID: "" }],
  ])("names %s when it is missing or malformed (005B-AC-011)", (variable, overrides) => {
    const environment = assertReviewSessionSurface(reviewEnvironment(overrides));

    expect(() => readReviewSessionConfiguration(environment)).toThrow(
      ReviewSessionConfigurationError,
    );
    try {
      readReviewSessionConfiguration(environment);
      expect.unreachable("the configuration must be refused");
    } catch (error) {
      expect((error as ReviewSessionConfigurationError).variable).toBe(variable);
    }
  });

  it("accepts a complete configuration", () => {
    const configuration = readReviewSessionConfiguration(
      assertReviewSessionSurface(reviewEnvironment()),
    );

    expect(configuration.signInSecret).toBe(SIGN_IN_SECRET);
    expect(configuration.locationIdByVariable.OALO_REVIEW_LOCATION_ID).toBe(REVIEW_LOCATION_ID);
  });
});

describe("persona mapping", () => {
  const configuration = readReviewSessionConfiguration(
    assertReviewSessionSurface(reviewEnvironment()),
  );

  it.each([
    ["creator", "creator", "campaign_creator", REVIEW_LOCATION_ID],
    ["approver", "approver", "campaign_approver", REVIEW_LOCATION_ID],
    ["outsider", "location_admin", "location_admin", OUTSIDER_LOCATION_ID],
  ])(
    "maps the %s persona through the shared role map",
    (persona, bindingRole, sessionRole, locationId) => {
      const binding = resolvePersonaBinding(
        persona as (typeof REVIEW_PERSONAS)[number],
        configuration,
      );

      expect(binding.bindingRole).toBe(bindingRole);
      expect(binding.sessionRole).toBe(sessionRole);
      expect(binding.locationId).toBe(locationId);
    },
  );
});

describe("sign-in secret comparison (005B-AC-013)", () => {
  it("calls the comparison with two buffers of equal length", () => {
    const compare = vi.fn(() => true);

    expect(signInSecretMatches(SIGN_IN_SECRET, SIGN_IN_SECRET, compare)).toBe(true);
    expect(compare).toHaveBeenCalledTimes(1);
    const [left, right] = compare.mock.calls[0] as unknown as [Buffer, Buffer];
    expect(Buffer.isBuffer(left)).toBe(true);
    expect(Buffer.isBuffer(right)).toBe(true);
    expect(left.byteLength).toBe(right.byteLength);
  });

  it("never calls the comparison for a candidate of a different length", () => {
    const compare = vi.fn(() => true);

    expect(signInSecretMatches(SIGN_IN_SECRET, `${SIGN_IN_SECRET}x`, compare)).toBe(false);
    expect(compare).not.toHaveBeenCalled();
  });

  it("reports a mismatch of the same length as false", () => {
    expect(signInSecretMatches(SIGN_IN_SECRET, "review-sign-in-secret-fixture-9876543210")).toBe(
      false,
    );
  });
});

describe("the sign-in request schema (005B-AC-014)", () => {
  it("accepts exactly a persona and a secret", () => {
    expect(
      ReviewSignInRequestSchema.safeParse({ persona: "creator", secret: SIGN_IN_SECRET }).success,
    ).toBe(true);
  });

  it.each(["locationId", "userId", "role", "installationRef", "roleVersion", "locationRef"])(
    "rejects a body that also carries %s",
    (field) => {
      const parsed = ReviewSignInRequestSchema.safeParse({
        persona: "creator",
        secret: SIGN_IN_SECRET,
        [field]: "anything",
      });

      expect(parsed.success).toBe(false);
    },
  );
});

describe("POST /api/review/session refusals reach no database", () => {
  it("answers 403 in production (005B-AC-011, 020)", async () => {
    const response = await handleReviewSignIn(
      signInRequest({ persona: "creator", secret: SIGN_IN_SECRET }),
      reviewEnvironment({ OALO_ENVIRONMENT: "production" }),
      portsWith(forbiddenReviewSessionPort()),
    );

    expect(response.status).toBe(403);
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("answers 404 outside review mode (005B-AC-011, 020)", async () => {
    const response = await handleReviewSignIn(
      signInRequest({ persona: "creator", secret: SIGN_IN_SECRET }),
      reviewEnvironment({ OALO_REVIEW_SURFACE: "" }),
      portsWith(forbiddenReviewSessionPort()),
    );

    expect(response.status).toBe(404);
  });

  it("answers 503 when an operator variable is missing (005B-AC-011)", async () => {
    const response = await handleReviewSignIn(
      signInRequest({ persona: "creator", secret: SIGN_IN_SECRET }),
      reviewEnvironment({ OALO_REVIEW_SIGNIN_SECRET: "" }),
      portsWith(forbiddenReviewSessionPort()),
    );

    expect(response.status).toBe(503);
  });

  it.each([
    ["a wrong secret", { persona: "creator", secret: "review-sign-in-secret-fixture-9876543210" }],
    ["an unknown persona", { persona: "administrator", secret: SIGN_IN_SECRET }],
  ])("answers 401 for %s without touching the database", async (_label, body) => {
    const response = await handleReviewSignIn(
      signInRequest(body),
      reviewEnvironment(),
      portsWith(forbiddenReviewSessionPort()),
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "UNAUTHENTICATED" });
  });

  it("answers 401 for an unlisted origin without touching the database", async () => {
    const response = await handleReviewSignIn(
      signInRequest(
        { persona: "creator", secret: SIGN_IN_SECRET },
        { origin: "https://attacker.example" },
      ),
      reviewEnvironment(),
      portsWith(forbiddenReviewSessionPort()),
    );

    expect(response.status).toBe(401);
  });
});

describe("POST /api/review/session issues through the definer port", () => {
  it("serializes the cookie with the PRD lifetime and returns only the session reference", async () => {
    const issued = vi.fn(async () => "session_0123456789abcdef0123456789abcdef");
    const resolvePersona = vi.fn(async () => "3c7d6f4a-8e53-4c27-ab99-4d2e1f7a6c35");
    const response = await handleReviewSignIn(
      signInRequest({ persona: "approver", secret: SIGN_IN_SECRET }),
      reviewEnvironment(),
      portsWith({
        resolvePersona,
        issue: issued,
        async revoke() {
          return true;
        },
        async recordDeniedAttempt() {
          return true;
        },
      }),
      { randomSecret: () => "a".repeat(43) },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toBe(
      `${FIRST_PARTY_SESSION_COOKIE}=${"a".repeat(43)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${String(REVIEW_SESSION_LIFETIME_SECONDS)}`,
    );
    expect(await response.json()).toEqual({
      sessionRef: "session_0123456789abcdef0123456789abcdef",
    });

    expect(resolvePersona).toHaveBeenCalledWith({
      locationId: REVIEW_LOCATION_ID,
      bindingRole: "approver",
    });
    const issuance = (issued.mock.calls as unknown as ReadonlyArray<readonly unknown[]>)[0]?.[0] as
      Record<string, unknown> | undefined;
    expect(issuance).toBeDefined();
    if (issuance === undefined) return;
    expect(issuance.sessionRole).toBe("campaign_approver");
    expect(issuance.lifetimeSeconds).toBe(REVIEW_SESSION_LIFETIME_SECONDS);
    // 005B-AC-016 and the storage rule: only the SHA-256 hash crosses into the database.
    expect(issuance.sessionSecretHash).toMatch(/^[0-9a-f]{64}$/u);
    expect(JSON.stringify(issuance)).not.toContain("a".repeat(43));
    expect(JSON.stringify(issuance)).not.toContain(SIGN_IN_SECRET);
  });

  it("collapses a database refusal into the same generic 401", async () => {
    const response = await handleReviewSignIn(
      signInRequest({ persona: "creator", secret: SIGN_IN_SECRET }),
      reviewEnvironment(),
      portsWith({
        async resolvePersona() {
          throw new Error("42501");
        },
        async issue() {
          return "session_0123456789abcdef0123456789abcdef";
        },
        async revoke() {
          return true;
        },
        async recordDeniedAttempt() {
          return true;
        },
      }),
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "UNAUTHENTICATED" });
  });
});
