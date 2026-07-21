import { describe, expect, it, vi } from "vitest";

import {
  AnthropicProviderConfigurationError,
  createAnthropicMessagesProviderClient,
  type AiFetchTransport,
  type AiHttpResponse,
  type ProviderCallInput,
} from "../../../../packages/ai/src/index.js";

const apiKey = `sk-ant-${"s".repeat(40)}`;
const modelRef = "claude-sonnet-configured";
const route = {
  routeRef: "route_01AnthropicQuality",
  providerRef: "provider_01Anthropic",
  modelRef,
  purpose: "quality" as const,
};
const input: ProviderCallInput = {
  locationRef: "location_01TenantAlpha",
  correlationRef: "correlation_01ProviderCall",
  idempotencyRef: "idempotency_01ProviderCall",
  operation: "campaign_generation",
  route,
  cacheKey: "cache_01TenantScoped",
  stablePrefix: "Approved stable policy and brand context.",
  variablePayload: '{"approvedFact":"Open house Saturday"}',
  maximumOutputTokens: 500,
};
const config = {
  providerRef: route.providerRef,
  apiKey,
  pricingByModel: {
    [modelRef]: {
      uncachedInputUsdPerMillionTokens: 3,
      cacheWriteUsdPerMillionTokens: 3.75,
      cacheReadUsdPerMillionTokens: 0.3,
      outputUsdPerMillionTokens: 15,
    },
  },
  requestTimeoutMs: 25,
  maximumResponseBytes: 4_096,
  reconciliationCacheSize: 2,
};

function headers(values: Readonly<Record<string, string>> = {}) {
  const normalized = Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key.toLowerCase(), value]),
  );
  return { get: (name: string) => normalized[name.toLowerCase()] ?? null };
}

function response(
  status: number,
  body: unknown,
  responseHeaders: Readonly<Record<string, string>> = {},
): AiHttpResponse {
  const text = typeof body === "string" ? body : JSON.stringify(body);
  return {
    status,
    headers: headers(responseHeaders),
    text: async () => text,
  };
}

function successBody(output: unknown = { pieces: [] }) {
  return {
    id: "msg_01ProviderResponse",
    type: "message",
    role: "assistant",
    model: modelRef,
    stop_reason: "end_turn",
    content: [{ type: "text", text: JSON.stringify(output) }],
    usage: {
      input_tokens: 100,
      cache_creation_input_tokens: 20,
      cache_read_input_tokens: 30,
      output_tokens: 40,
    },
  };
}

describe("Anthropic Messages provider client", () => {
  it("probes the model endpoint with a bounded authenticated GET", async () => {
    let requestedUrl = "";
    let request: Parameters<AiFetchTransport>[1] | undefined;
    const client = createAnthropicMessagesProviderClient(config, {
      fetch: vi.fn(async (url, init) => {
        requestedUrl = url;
        request = init;
        return response(200, { data: [{ type: "model", id: modelRef }] });
      }),
    });

    await expect(client.probe()).resolves.toEqual({
      status: "ready",
      providerRef: route.providerRef,
    });
    expect(requestedUrl).toBe("https://api.anthropic.com/v1/models?limit=1");
    expect(request?.method).toBe("GET");
    expect(request?.body).toBeUndefined();
    expect(request?.headers["x-api-key"]).toBe(apiKey);
  });

  it("classifies malformed and failed model probes without exposing credentials", async () => {
    const malformed = createAnthropicMessagesProviderClient(config, {
      fetch: async () => response(200, { data: [] }),
    });
    const unauthorized = createAnthropicMessagesProviderClient(config, {
      fetch: async () => response(401, `rejected ${apiKey}`),
    });

    const malformedResult = await malformed.probe();
    const unauthorizedResult = await unauthorized.probe();

    expect(malformedResult).toMatchObject({
      status: "unavailable",
      classification: "provider_unavailable",
    });
    expect(unauthorizedResult).toMatchObject({
      status: "unavailable",
      classification: "refusal",
    });
    expect(JSON.stringify([malformedResult, unauthorizedResult])).not.toContain(apiKey);
  });

  it("honors caller cancellation even when the transport does not settle", async () => {
    const controller = new AbortController();
    controller.abort(new Error("cancelled"));
    const client = createAnthropicMessagesProviderClient(config, {
      fetch: async () => new Promise<AiHttpResponse>(() => undefined),
    });

    await expect(client.probe(controller.signal)).resolves.toMatchObject({
      status: "unavailable",
      classification: "timeout",
    });
  });

  it("builds a bounded direct-provider request and validates the unknown response", async () => {
    let request: Parameters<AiFetchTransport>[1] | undefined;
    const fetchTransport: AiFetchTransport = vi.fn(async (_url, init) => {
      request = init;
      return response(200, successBody({ pieces: [{ headline: "Approved" }] }));
    });
    const times = [1_000, 1_025];
    const client = createAnthropicMessagesProviderClient(config, {
      fetch: fetchTransport,
      nowMs: () => times.shift() ?? 1_025,
    });

    const result = await client.generate(input);

    expect(result).toMatchObject({
      kind: "success",
      providerRequestRef: "msg_01ProviderResponse",
      output: { pieces: [{ headline: "Approved" }] },
      latencyMs: 25,
      tokenUsage: {
        uncachedInputTokens: 100,
        cacheWriteTokens: 20,
        cacheReadTokens: 30,
        outputTokens: 40,
        totalTokens: 190,
      },
    });
    expect(result.estimatedCostUsd).toBeCloseTo(0.000984, 9);
    expect(fetchTransport).toHaveBeenCalledOnce();
    expect(request?.headers["x-api-key"]).toBe(apiKey);
    expect(request?.body).not.toContain(apiKey);
    expect(JSON.parse(request?.body ?? "{}")).toMatchObject({
      model: modelRef,
      max_tokens: 500,
      system: [
        {
          type: "text",
          text: input.stablePrefix,
          cache_control: { type: "ephemeral", ttl: "5m" },
        },
      ],
      messages: [{ role: "user", content: input.variablePayload }],
    });

    await expect(
      client.reconcile({
        locationRef: input.locationRef,
        idempotencyRef: input.idempotencyRef,
        providerRequestRef: "msg_01ProviderResponse",
        route,
      }),
    ).resolves.toEqual(result);
  });

  it.each([
    [408, "timeout"],
    [429, "rate_limited"],
    [403, "refusal"],
    [503, "provider_unavailable"],
  ] as const)(
    "classifies HTTP %s without exposing provider error bodies",
    async (status, expected) => {
      const sensitiveBody = `provider rejected ${apiKey} and raw prompt`;
      const client = createAnthropicMessagesProviderClient(config, {
        fetch: async () => response(status, sensitiveBody, { "request-id": "req_01Safe" }),
      });

      const result = await client.generate(input);

      expect(result).toMatchObject({
        kind: "failure",
        classification: expected,
        providerRequestRef: "req_01Safe",
      });
      expect(JSON.stringify(result)).not.toContain(sensitiveBody);
      expect(JSON.stringify(result)).not.toContain(apiKey);
    },
  );

  it("fails a malformed or oversized successful response closed", async () => {
    const malformed = createAnthropicMessagesProviderClient(config, {
      fetch: async () => response(200, { id: "msg_missing_contract" }),
    });
    await expect(malformed.generate(input)).resolves.toMatchObject({
      kind: "failure",
      classification: "provider_unavailable",
    });

    const oversized = createAnthropicMessagesProviderClient(config, {
      fetch: async () =>
        response(200, successBody(), {
          "content-length": String((config.maximumResponseBytes ?? 0) + 1),
        }),
    });
    await expect(oversized.generate(input)).resolves.toMatchObject({
      kind: "failure",
      classification: "provider_unavailable",
    });
  });

  it("aborts a provider request when the bounded timeout expires", async () => {
    const fetchTransport: AiFetchTransport = vi.fn(
      async (_url, init) =>
        new Promise<AiHttpResponse>((_resolve, reject) => {
          const abort = (): void => {
            const error = new Error("aborted");
            error.name = "AbortError";
            reject(error);
          };
          if (init.signal.aborted) abort();
          else init.signal.addEventListener("abort", abort, { once: true });
        }),
    );
    const client = createAnthropicMessagesProviderClient(
      { ...config, requestTimeoutMs: 1 },
      { fetch: fetchTransport },
    );

    await expect(client.generate(input)).resolves.toMatchObject({
      kind: "failure",
      classification: "timeout",
    });
  });

  it("fails closed for route drift and never includes credentials in configuration errors", async () => {
    const fetchTransport = vi.fn<AiFetchTransport>();
    const client = createAnthropicMessagesProviderClient(config, { fetch: fetchTransport });
    await expect(
      client.generate({
        ...input,
        route: { ...route, providerRef: "provider_02Unexpected" },
      }),
    ).resolves.toMatchObject({ kind: "failure", classification: "refusal" });
    expect(fetchTransport).not.toHaveBeenCalled();

    let thrown: unknown;
    try {
      createAnthropicMessagesProviderClient({ ...config, apiKey: "secret-too-short" });
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(AnthropicProviderConfigurationError);
    expect(String(thrown)).not.toContain("secret-too-short");
  });
});
