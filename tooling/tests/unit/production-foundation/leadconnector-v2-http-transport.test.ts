import { z } from "zod";
import { describe, expect, it, vi } from "vitest";

import {
  LEADCONNECTOR_V2_API_VERSION,
  LEADCONNECTOR_V2_BASE_URL,
  LEADCONNECTOR_V2_ROUTE_ALLOWLIST,
  LeadConnectorTransportConfigurationError,
  LeadConnectorTransportError,
  LeadConnectorTransportInputError,
  classifyLeadConnectorFailure,
  createLeadConnectorV2HttpTransport,
  parseLeadConnectorRateLimitMetadata,
  type LeadConnectorFetchTransport,
  type LeadConnectorHttpResponse,
  type LeadConnectorLocationTokenResolver,
} from "../../../../packages/ghl/src/index.js";

const locationRef = "location_internal_01";
const providerLocationId = "providerLocation01";
const accessToken = "test_only_token_1234567890";

function headers(values: Readonly<Record<string, string>> = {}) {
  const normalized = new Map(
    Object.entries(values).map(([name, value]) => [name.toLowerCase(), value] as const),
  );
  return Object.freeze({
    get(name: string): string | null {
      return normalized.get(name.toLowerCase()) ?? null;
    },
  });
}

function response(
  status: number,
  body: unknown,
  headerValues: Readonly<Record<string, string>> = {},
): LeadConnectorHttpResponse {
  const text = JSON.stringify(body);
  return Object.freeze({
    status,
    headers: headers({ "content-length": String(Buffer.byteLength(text)), ...headerValues }),
    text: vi.fn(async () => text),
  });
}

function dependencies(fetchTransport: LeadConnectorFetchTransport) {
  const resolveLocationToken: LeadConnectorLocationTokenResolver = vi.fn(async () => ({
    locationId: providerLocationId,
    accessToken,
  }));
  return { fetch: fetchTransport, resolveLocationToken };
}

async function captureTransportError(
  promise: Promise<unknown>,
): Promise<LeadConnectorTransportError> {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(LeadConnectorTransportError);
    return error as LeadConnectorTransportError;
  }
  throw new Error("Expected LeadConnector transport request to fail.");
}

describe("LeadConnector V2 HTTP transport", () => {
  it("publishes an exact non-destructive route and method allowlist", () => {
    expect(LEADCONNECTOR_V2_ROUTE_ALLOWLIST["get-location"]).toEqual({
      method: "GET",
      route: "/locations/:locationId",
    });
    expect(Object.keys(LEADCONNECTOR_V2_ROUTE_ALLOWLIST)).toHaveLength(16);
    expect(
      Object.values(LEADCONNECTOR_V2_ROUTE_ALLOWLIST).every(({ method, route }) => {
        return (
          ["GET", "POST", "PUT"].includes(method) &&
          !/(delete|duplicate|custom-audience|\/google\/|\/linkedin\/|reselling|subscription)/iu.test(
            route,
          )
        );
      }),
    ).toBe(true);
  });

  it("rejects invalid configuration and unknown request fields before transport work", async () => {
    expect(() => createLeadConnectorV2HttpTransport({ requestTimeoutMs: 0 })).toThrow(
      LeadConnectorTransportConfigurationError,
    );
    expect(() => createLeadConnectorV2HttpTransport({ unexpected: true })).toThrow(
      LeadConnectorTransportConfigurationError,
    );
    const fetchTransport: LeadConnectorFetchTransport = vi.fn(async () => response(200, {}));
    const transport = createLeadConnectorV2HttpTransport({}, dependencies(fetchTransport));
    await expect(
      transport.execute({ operation: "delete-campaign", locationRef }, z.object({}).strict()),
    ).rejects.toBeInstanceOf(LeadConnectorTransportInputError);
    await expect(
      transport.execute(
        { operation: "get-integration", locationRef, accessToken },
        z.object({}).strict(),
      ),
    ).rejects.toBeInstanceOf(LeadConnectorTransportInputError);
    expect(fetchTransport).not.toHaveBeenCalled();
  });

  it("fails closed without location token resolution and never reaches fetch", async () => {
    const fetchTransport: LeadConnectorFetchTransport = vi.fn(async () => response(200, {}));
    const transport = createLeadConnectorV2HttpTransport({}, { fetch: fetchTransport });
    const error = await captureTransportError(
      transport.execute({ operation: "get-integration", locationRef }, z.object({}).strict()),
    );
    expect(error).toMatchObject({
      classification: "DEPENDENCY_BLOCKED",
      retrySafe: false,
      requiresReconciliation: false,
    });
    expect(fetchTransport).not.toHaveBeenCalled();
    await expect(transport.probe({ locationRef })).resolves.toMatchObject({
      ready: false,
      classification: "DEPENDENCY_BLOCKED",
    });
  });

  it("implements the existing Meta read port with exact headers and resolved location scope", async () => {
    const fetchTransport: LeadConnectorFetchTransport = vi.fn(async () =>
      response(
        200,
        {
          state: "live",
          completedSteps: 2,
          totalSteps: 2,
          observedAt: "2026-07-21T12:00:00.000Z",
        },
        {
          "x-request-id": "request_01",
          "x-ratelimit-remaining": "87",
        },
      ),
    );
    const transport = createLeadConnectorV2HttpTransport({}, dependencies(fetchTransport));
    await expect(
      transport.get({
        locationRef,
        route: "/ad-publishing/facebook/campaigns/campaign_meta_01/publishing-progress",
      }),
    ).resolves.toMatchObject({ state: "live" });

    expect(fetchTransport).toHaveBeenCalledTimes(1);
    const call = vi.mocked(fetchTransport).mock.calls[0];
    expect(call?.[0]).toBe(
      `${LEADCONNECTOR_V2_BASE_URL}/ad-publishing/facebook/campaigns/campaign_meta_01/publishing-progress?locationId=${providerLocationId}`,
    );
    expect(call?.[1]).toMatchObject({
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
        Version: LEADCONNECTOR_V2_API_VERSION,
      },
    });
    expect(call?.[1].headers).not.toHaveProperty("Content-Type");
  });

  it("rejects non-allowlisted and query-bearing Meta read routes before auth resolution", async () => {
    const fetchTransport: LeadConnectorFetchTransport = vi.fn(async () => response(200, {}));
    const deps = dependencies(fetchTransport);
    const transport = createLeadConnectorV2HttpTransport({}, deps);
    await expect(
      transport.get({ locationRef, route: "/ad-publishing/facebook/campaigns/delete" }),
    ).rejects.toBeInstanceOf(LeadConnectorTransportInputError);
    await expect(
      transport.get({
        locationRef,
        route: "/ad-publishing/facebook/pages?locationId=attacker",
      }),
    ).rejects.toBeInstanceOf(LeadConnectorTransportInputError);
    expect(deps.resolveLocationToken).not.toHaveBeenCalled();
    expect(fetchTransport).not.toHaveBeenCalled();
  });

  it("parses standard HighLevel rate-limit and reset metadata", () => {
    expect(
      parseLeadConnectorRateLimitMetadata(
        headers({
          "x-ratelimit-limit-daily": "200000",
          "x-ratelimit-daily-remaining": "199999",
          "x-ratelimit-interval-milliseconds": "10000",
          "x-ratelimit-max": "100",
          "x-ratelimit-remaining": "99",
          "retry-after": "2.5",
          "x-ratelimit-reset": "1784653260",
        }),
        1_784_653_200_000,
      ),
    ).toEqual({
      dailyLimit: 200_000,
      dailyRemaining: 199_999,
      intervalMilliseconds: 10_000,
      intervalLimit: 100,
      intervalRemaining: 99,
      retryAfterMilliseconds: 2_500,
      resetAtEpochMilliseconds: 1_784_653_260_000,
    });
    expect(
      parseLeadConnectorRateLimitMetadata(headers({ "retry-after": "not-a-duration" })),
    ).toEqual({});
  });

  it.each([
    [400, "VALIDATION_TERMINAL"],
    [401, "AUTH_RECONNECT_REQUIRED"],
    [403, "AUTH_RECONNECT_REQUIRED"],
    [404, "NOT_FOUND"],
    [409, "PRODUCT_CONFLICT"],
    [422, "VALIDATION_TERMINAL"],
    [429, "RATE_LIMITED"],
    [500, "TRANSIENT_PROVIDER"],
    [503, "TRANSIENT_PROVIDER"],
  ] as const)("classifies GET status %i as %s", (status, classification) => {
    expect(classifyLeadConnectorFailure(status, "GET")).toBe(classification);
  });

  it("returns safe hashes and normalized results without retaining credentials or raw payloads", async () => {
    const fetchTransport: LeadConnectorFetchTransport = vi.fn(async () =>
      response(200, {
        state: "live",
        completedSteps: 2,
        totalSteps: 2,
        observedAt: "2026-07-21T12:00:00.000Z",
        unnecessaryRawPayload: "discard-me",
      }),
    );
    const transport = createLeadConnectorV2HttpTransport({}, dependencies(fetchTransport));
    const normalizedSchema = z
      .object({ state: z.literal("live") })
      .loose()
      .transform(({ state }) => ({ state }));
    const result = await transport.execute(
      { operation: "get-publishing-progress", locationRef, parameters: { campaignId: "cmp_01" } },
      normalizedSchema,
    );

    expect(result.normalized).toEqual({ state: "live" });
    expect(result.attempt).toMatchObject({
      classification: "SUCCESS",
      operation: "get-publishing-progress",
      method: "GET",
      requestHash: expect.stringMatching(/^sha256:[a-f0-9]{64}$/u),
      normalizedResultHash: expect.stringMatching(/^sha256:[a-f0-9]{64}$/u),
    });
    const persistedShape = JSON.stringify(result);
    expect(persistedShape).not.toContain(accessToken);
    expect(persistedShape).not.toContain("discard-me");
    expect(persistedShape).not.toContain("Authorization");
  });

  it("rejects malformed successful responses and never includes raw bodies in the error", async () => {
    const fetchTransport: LeadConnectorFetchTransport = vi.fn(async () =>
      response(200, { state: "unexpected", rawSecretLikeValue: "do-not-retain" }),
    );
    const transport = createLeadConnectorV2HttpTransport({}, dependencies(fetchTransport));
    const error = await captureTransportError(
      transport.execute(
        { operation: "get-publishing-progress", locationRef, parameters: { campaignId: "cmp_01" } },
        z.object({ state: z.literal("live") }).strict(),
      ),
    );
    expect(error.classification).toBe("TRANSIENT_PROVIDER");
    expect(JSON.stringify(error)).not.toContain(accessToken);
    expect(JSON.stringify(error)).not.toContain("do-not-retain");
  });

  it("marks ambiguous mutation failures uncertain and prohibits blind retry", async () => {
    const fetchTransport: LeadConnectorFetchTransport = vi.fn(async () => {
      throw new Error("connection reset after dispatch");
    });
    const transport = createLeadConnectorV2HttpTransport({}, dependencies(fetchTransport));
    const error = await captureTransportError(
      transport.execute(
        {
          operation: "publish-campaign",
          locationRef,
          parameters: { campaignId: "cmp_01" },
          body: { campaignId: "cmp_01" },
          idempotencyKey: "idem_publish_01",
        },
        z.json(),
      ),
    );
    expect(error).toMatchObject({
      classification: "UNCERTAIN_WRITE",
      retrySafe: false,
      requiresReconciliation: true,
    });
    expect(JSON.stringify(error)).not.toContain("connection reset after dispatch");
  });

  it("classifies write 5xx and invalid success bodies as uncertain", async () => {
    for (const providerResponse of [response(503, { message: "unavailable" }), response(200, {})]) {
      const fetchTransport: LeadConnectorFetchTransport = vi.fn(async () => providerResponse);
      const transport = createLeadConnectorV2HttpTransport({}, dependencies(fetchTransport));
      const error = await captureTransportError(
        transport.execute(
          {
            operation: "publish-campaign",
            locationRef,
            parameters: { campaignId: "cmp_01" },
            body: { campaignId: "cmp_01" },
            idempotencyKey: "idem_publish_01",
          },
          z.object({ success: z.literal(true) }).strict(),
        ),
      );
      expect(error).toMatchObject({
        classification: "UNCERTAIN_WRITE",
        requiresReconciliation: true,
        retrySafe: false,
      });
    }
  });

  it("applies a bounded abort-aware timeout", async () => {
    const fetchTransport: LeadConnectorFetchTransport = vi.fn(
      async (_url, init) =>
        await new Promise<LeadConnectorHttpResponse>((_resolve, reject) => {
          init.signal.addEventListener(
            "abort",
            () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })),
            { once: true },
          );
        }),
    );
    const transport = createLeadConnectorV2HttpTransport(
      { requestTimeoutMs: 1 },
      dependencies(fetchTransport),
    );
    const error = await captureTransportError(
      transport.execute({ operation: "get-integration", locationRef }, z.object({}).strict()),
    );
    expect(error).toMatchObject({
      classification: "TRANSIENT_PROVIDER",
      retrySafe: true,
      timedOut: true,
    });
  });

  it("propagates caller cancellation through the production Meta GET boundary", async () => {
    const controller = new AbortController();
    let markFetchStarted: (() => void) | undefined;
    const fetchStarted = new Promise<void>((resolve) => {
      markFetchStarted = resolve;
    });
    const fetchTransport: LeadConnectorFetchTransport = vi.fn(
      async (_url, init) =>
        await new Promise<LeadConnectorHttpResponse>((_resolve, reject) => {
          markFetchStarted?.();
          init.signal.addEventListener(
            "abort",
            () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })),
            { once: true },
          );
        }),
    );
    const transport = createLeadConnectorV2HttpTransport({}, dependencies(fetchTransport));
    const request = transport.get(
      {
        locationRef,
        route: "/ad-publishing/facebook/campaigns/campaign_meta_01/publishing-progress",
      },
      controller.signal,
    );

    await fetchStarted;
    controller.abort();
    const error = await captureTransportError(request);
    expect(error).toMatchObject({
      classification: "TRANSIENT_PROVIDER",
      retrySafe: true,
      timedOut: false,
    });
    expect(fetchTransport).toHaveBeenCalledOnce();
  });

  it("provides a bounded identity-checked readiness probe", async () => {
    let now = 1_000;
    const fetchTransport: LeadConnectorFetchTransport = vi.fn(async () => {
      now = 1_007;
      return response(200, { location: { id: providerLocationId, name: "not-retained" } });
    });
    const transport = createLeadConnectorV2HttpTransport(
      {},
      { ...dependencies(fetchTransport), nowMs: () => now },
    );
    const result = await transport.probe({ locationRef });
    expect(result).toEqual({
      ready: true,
      classification: "SUCCESS",
      latencyMilliseconds: 7,
      providerLocationHash: expect.stringMatching(/^sha256:[a-f0-9]{64}$/u),
      rateLimit: {},
    });
    const call = vi.mocked(fetchTransport).mock.calls[0];
    expect(call?.[0]).toBe(`${LEADCONNECTOR_V2_BASE_URL}/locations/${providerLocationId}`);

    const mismatchedFetch: LeadConnectorFetchTransport = vi.fn(async () =>
      response(200, { location: { id: "anotherLocation01" } }),
    );
    const mismatched = createLeadConnectorV2HttpTransport({}, dependencies(mismatchedFetch));
    await expect(mismatched.probe({ locationRef })).resolves.toMatchObject({
      ready: false,
      classification: "DEPENDENCY_BLOCKED",
    });
  });
});
