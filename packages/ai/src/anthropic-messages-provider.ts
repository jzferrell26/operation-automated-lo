import type {
  ModelRoute,
  ProviderFailureClassification,
  ProviderTokenUsage,
} from "@oalo/contracts";
import { createAbortContext, raceWithAbort, utf8ByteLength } from "@oalo/config";

import type {
  AiProviderPort,
  ProviderAttempt,
  ProviderAttemptFailure,
  ProviderAttemptSuccess,
  ProviderCallInput,
} from "./production-generation.js";

const ANTHROPIC_MESSAGES_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const DEFAULT_RECONCILIATION_CACHE_SIZE = 1_000;

const EMPTY_USAGE: ProviderTokenUsage = Object.freeze({
  cacheWriteTokens: 0,
  cacheReadTokens: 0,
  uncachedInputTokens: 0,
  outputTokens: 0,
  totalTokens: 0,
});

interface SafeHeaders {
  get(name: string): string | null;
}

export interface AiAbortSignal {
  readonly aborted: boolean;
  readonly reason?: unknown;
  addEventListener(
    type: "abort",
    listener: () => void,
    options?: Readonly<{ once?: boolean }>,
  ): void;
  removeEventListener(type: "abort", listener: () => void): void;
}

interface AiAbortController {
  readonly signal: AiAbortSignal;
  abort(reason?: unknown): void;
}

interface AiRuntimeGlobals {
  readonly AbortController: new () => AiAbortController;
  readonly fetch: AiFetchTransport;
  readonly setTimeout: (handler: () => void, timeoutMs: number) => unknown;
  readonly clearTimeout: (timer: unknown) => void;
}

export interface AiHttpResponse {
  readonly status: number;
  readonly headers: SafeHeaders;
  text(): Promise<string>;
}

export type AiFetchTransport = (
  url: string,
  init: Readonly<{
    method: "GET" | "POST";
    headers: Readonly<Record<string, string>>;
    body?: string;
    signal: AiAbortSignal;
  }>,
) => Promise<AiHttpResponse>;

export interface AnthropicModelPricing {
  readonly uncachedInputUsdPerMillionTokens: number;
  readonly cacheWriteUsdPerMillionTokens: number;
  readonly cacheReadUsdPerMillionTokens: number;
  readonly outputUsdPerMillionTokens: number;
}

export interface AnthropicMessagesProviderConfig {
  readonly providerRef: string;
  readonly apiKey: string;
  readonly pricingByModel: Readonly<Record<string, AnthropicModelPricing>>;
  readonly requestTimeoutMs?: number;
  readonly maximumResponseBytes?: number;
  readonly reconciliationCacheSize?: number;
}

export interface AnthropicMessagesProviderClient extends AiProviderPort {
  generateWithSignal(input: ProviderCallInput, signal?: AiAbortSignal): Promise<ProviderAttempt>;
  probe(signal?: AiAbortSignal): Promise<AnthropicProviderProbeResult>;
}

export type AnthropicProviderProbeResult =
  | Readonly<{ status: "ready"; providerRef: string }>
  | Readonly<{
      status: "unavailable";
      providerRef: string;
      classification: ProviderFailureClassification;
    }>;

export interface AnthropicMessagesProviderDependencies {
  readonly fetch?: AiFetchTransport;
  readonly nowMs?: () => number;
}

interface ParsedConfig {
  readonly providerRef: string;
  readonly apiKey: string;
  readonly pricingByModel: Readonly<Record<string, AnthropicModelPricing>>;
  readonly requestTimeoutMs: number;
  readonly maximumResponseBytes: number;
  readonly reconciliationCacheSize: number;
}

interface ParsedAnthropicMessage {
  readonly providerRequestRef: string;
  readonly modelRef: string;
  readonly output: unknown;
  readonly tokenUsage: ProviderTokenUsage;
  readonly refused: boolean;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertBoundedInteger(
  value: unknown,
  fallback: number,
  minimum: number,
  maximum: number,
  label: string,
): number {
  const candidate = value === undefined ? fallback : value;
  if (!Number.isInteger(candidate) || typeof candidate !== "number") {
    throw new AnthropicProviderConfigurationError(`${label} must be an integer.`);
  }
  if (candidate < minimum || candidate > maximum) {
    throw new AnthropicProviderConfigurationError(`${label} is outside its safe bounds.`);
  }
  return candidate;
}

function assertNonNegativePrice(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 10_000) {
    throw new AnthropicProviderConfigurationError("AI model pricing is invalid.");
  }
  return value;
}

function parsePricing(value: unknown): AnthropicModelPricing {
  if (!isRecord(value)) {
    throw new AnthropicProviderConfigurationError("AI model pricing is invalid.");
  }
  return Object.freeze({
    uncachedInputUsdPerMillionTokens: assertNonNegativePrice(
      value.uncachedInputUsdPerMillionTokens,
    ),
    cacheWriteUsdPerMillionTokens: assertNonNegativePrice(value.cacheWriteUsdPerMillionTokens),
    cacheReadUsdPerMillionTokens: assertNonNegativePrice(value.cacheReadUsdPerMillionTokens),
    outputUsdPerMillionTokens: assertNonNegativePrice(value.outputUsdPerMillionTokens),
  });
}

function parseConfig(unsafeConfig: unknown): ParsedConfig {
  if (!isRecord(unsafeConfig)) {
    throw new AnthropicProviderConfigurationError("Anthropic provider configuration is invalid.");
  }
  const providerRef = unsafeConfig.providerRef;
  if (
    typeof providerRef !== "string" ||
    providerRef.length < 8 ||
    providerRef.length > 160 ||
    !/^[a-z][a-z0-9]*(?:_[A-Za-z0-9]+)+$/u.test(providerRef)
  ) {
    throw new AnthropicProviderConfigurationError("Anthropic provider reference is invalid.");
  }
  const apiKey = unsafeConfig.apiKey;
  if (
    typeof apiKey !== "string" ||
    apiKey.length < 20 ||
    apiKey.length > 512 ||
    /\s/u.test(apiKey)
  ) {
    throw new AnthropicProviderConfigurationError("Anthropic API credentials are invalid.");
  }
  if (!isRecord(unsafeConfig.pricingByModel)) {
    throw new AnthropicProviderConfigurationError("Anthropic model pricing is required.");
  }
  const pricingEntries = Object.entries(unsafeConfig.pricingByModel);
  if (pricingEntries.length === 0 || pricingEntries.length > 100) {
    throw new AnthropicProviderConfigurationError("Anthropic model pricing is invalid.");
  }
  const pricingByModel: Record<string, AnthropicModelPricing> = {};
  for (const [modelRef, pricing] of pricingEntries) {
    if (modelRef.length === 0 || modelRef.length > 300) {
      throw new AnthropicProviderConfigurationError("Anthropic model pricing is invalid.");
    }
    pricingByModel[modelRef] = parsePricing(pricing);
  }
  return Object.freeze({
    providerRef,
    apiKey,
    pricingByModel: Object.freeze(pricingByModel),
    requestTimeoutMs: assertBoundedInteger(
      unsafeConfig.requestTimeoutMs,
      DEFAULT_TIMEOUT_MS,
      1,
      60_000,
      "Anthropic request timeout",
    ),
    maximumResponseBytes: assertBoundedInteger(
      unsafeConfig.maximumResponseBytes,
      DEFAULT_MAX_RESPONSE_BYTES,
      1_024,
      8 * 1024 * 1024,
      "Anthropic response limit",
    ),
    reconciliationCacheSize: assertBoundedInteger(
      unsafeConfig.reconciliationCacheSize,
      DEFAULT_RECONCILIATION_CACHE_SIZE,
      1,
      10_000,
      "Anthropic reconciliation cache size",
    ),
  });
}

function assertSafeInteger(value: unknown, label: string): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < 0 ||
    value > Number.MAX_SAFE_INTEGER
  ) {
    throw new AnthropicProviderResponseError(`${label} is invalid.`);
  }
  return value;
}

function parseProviderOutput(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function parseAnthropicMessage(value: unknown): ParsedAnthropicMessage {
  if (!isRecord(value)) {
    throw new AnthropicProviderResponseError("Anthropic response is not an object.");
  }
  const providerRequestRef = value.id;
  const modelRef = value.model;
  if (
    value.type !== "message" ||
    value.role !== "assistant" ||
    typeof providerRequestRef !== "string" ||
    providerRequestRef.length < 1 ||
    providerRequestRef.length > 300 ||
    typeof modelRef !== "string" ||
    modelRef.length < 1 ||
    modelRef.length > 300
  ) {
    throw new AnthropicProviderResponseError("Anthropic response identity is invalid.");
  }
  const validStopReasons = [
    "end_turn",
    "max_tokens",
    "model_context_window_exceeded",
    "pause_turn",
    "refusal",
    "stop_sequence",
    "tool_use",
  ] as const;
  if (
    typeof value.stop_reason !== "string" ||
    !(validStopReasons as readonly string[]).includes(value.stop_reason)
  ) {
    throw new AnthropicProviderResponseError("Anthropic response stop reason is invalid.");
  }
  if (!Array.isArray(value.content) || value.content.length === 0 || value.content.length > 100) {
    throw new AnthropicProviderResponseError("Anthropic response content is invalid.");
  }
  const textBlocks: string[] = [];
  for (const block of value.content) {
    if (!isRecord(block) || block.type !== "text" || typeof block.text !== "string") {
      throw new AnthropicProviderResponseError("Anthropic returned unsupported response content.");
    }
    if (block.text.length > 2 * 1024 * 1024) {
      throw new AnthropicProviderResponseError("Anthropic response text exceeds its safe limit.");
    }
    textBlocks.push(block.text);
  }
  if (!isRecord(value.usage)) {
    throw new AnthropicProviderResponseError("Anthropic usage metadata is invalid.");
  }
  const uncachedInputTokens = assertSafeInteger(value.usage.input_tokens, "input token count");
  const outputTokens = assertSafeInteger(value.usage.output_tokens, "output token count");
  const cacheWriteTokens =
    value.usage.cache_creation_input_tokens === undefined
      ? 0
      : assertSafeInteger(value.usage.cache_creation_input_tokens, "cache write token count");
  const cacheReadTokens =
    value.usage.cache_read_input_tokens === undefined
      ? 0
      : assertSafeInteger(value.usage.cache_read_input_tokens, "cache read token count");
  const totalTokens = uncachedInputTokens + cacheWriteTokens + cacheReadTokens + outputTokens;
  if (!Number.isSafeInteger(totalTokens)) {
    throw new AnthropicProviderResponseError("Anthropic total token count is invalid.");
  }
  return Object.freeze({
    providerRequestRef,
    modelRef,
    output: parseProviderOutput(textBlocks.join("")),
    tokenUsage: Object.freeze({
      cacheWriteTokens,
      cacheReadTokens,
      uncachedInputTokens,
      outputTokens,
      totalTokens,
    }),
    refused: value.stop_reason === "refusal",
  });
}

function parseAnthropicModelList(value: unknown): void {
  if (!isRecord(value) || !Array.isArray(value.data) || value.data.length === 0) {
    throw new AnthropicProviderResponseError("Anthropic model probe response is invalid.");
  }
  const first = value.data[0];
  if (
    !isRecord(first) ||
    first.type !== "model" ||
    typeof first.id !== "string" ||
    first.id.length < 1 ||
    first.id.length > 300
  ) {
    throw new AnthropicProviderResponseError("Anthropic model probe response is invalid.");
  }
}

function classifyHttpFailure(status: number): ProviderFailureClassification {
  if (status === 408 || status === 504) return "timeout";
  if (status === 429) return "rate_limited";
  if (status === 400 || status === 401 || status === 403 || status === 404 || status === 422) {
    return "refusal";
  }
  return "provider_unavailable";
}

function safeProviderRequestRef(headers: SafeHeaders): string | undefined {
  const value = headers.get("request-id") ?? headers.get("x-request-id");
  return value !== null && value.length > 0 && value.length <= 300 ? value : undefined;
}

function failure(
  classification: ProviderFailureClassification,
  latencyMs: number,
  providerRequestRef?: string,
): ProviderAttemptFailure {
  return Object.freeze({
    kind: "failure",
    ...(providerRequestRef === undefined ? {} : { providerRequestRef }),
    classification,
    tokenUsage: EMPTY_USAGE,
    estimatedCostUsd: 0,
    latencyMs,
  });
}

function estimatedCostUsd(usage: ProviderTokenUsage, pricing: AnthropicModelPricing): number {
  const total =
    usage.uncachedInputTokens * pricing.uncachedInputUsdPerMillionTokens +
    usage.cacheWriteTokens * pricing.cacheWriteUsdPerMillionTokens +
    usage.cacheReadTokens * pricing.cacheReadUsdPerMillionTokens +
    usage.outputTokens * pricing.outputUsdPerMillionTokens;
  return total / 1_000_000;
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

async function readBoundedResponse(
  response: AiHttpResponse,
  maximumBytes: number,
): Promise<unknown> {
  const contentLength = response.headers.get("content-length");
  if (contentLength !== null) {
    const parsedLength = Number(contentLength);
    if (!Number.isSafeInteger(parsedLength) || parsedLength < 0 || parsedLength > maximumBytes) {
      throw new AnthropicProviderResponseError("Anthropic response exceeds its safe size limit.");
    }
  }
  const text = await response.text();
  if (utf8ByteLength(text) > maximumBytes) {
    throw new AnthropicProviderResponseError("Anthropic response exceeds its safe size limit.");
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new AnthropicProviderResponseError("Anthropic response is not valid JSON.");
  }
}

function providerAbortContext(timeoutMs: number, externalSignal?: AiAbortSignal) {
  const runtimeGlobals = globalThis as unknown as AiRuntimeGlobals;
  return createAbortContext({
    controller: new runtimeGlobals.AbortController(),
    timeoutMilliseconds: timeoutMs,
    timeoutReason: new Error("provider request timeout"),
    ...(externalSignal === undefined ? {} : { externalSignal }),
    scheduleTimeout: runtimeGlobals.setTimeout,
    cancelTimeout: runtimeGlobals.clearTimeout,
  });
}

function defaultFetchTransport(
  url: string,
  init: Parameters<AiFetchTransport>[1],
): Promise<AiHttpResponse> {
  const runtimeGlobals = globalThis as unknown as AiRuntimeGlobals;
  return runtimeGlobals.fetch(url, init);
}

export class AnthropicProviderConfigurationError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "AnthropicProviderConfigurationError";
  }
}

export class AnthropicProviderResponseError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "AnthropicProviderResponseError";
  }
}

function assertRoute(config: ParsedConfig, route: ModelRoute): AnthropicModelPricing {
  if (route.providerRef !== config.providerRef) {
    throw new AnthropicProviderConfigurationError(
      "AI route does not match the configured Anthropic provider.",
    );
  }
  const pricing = config.pricingByModel[route.modelRef];
  if (pricing === undefined) {
    throw new AnthropicProviderConfigurationError(
      "AI route uses an Anthropic model without configured pricing.",
    );
  }
  return pricing;
}

function rememberAttempt(
  attempts: Map<string, ProviderAttemptSuccess>,
  attempt: ProviderAttemptSuccess,
  maximumSize: number,
): void {
  attempts.delete(attempt.providerRequestRef);
  attempts.set(attempt.providerRequestRef, attempt);
  while (attempts.size > maximumSize) {
    const oldest = attempts.keys().next().value as string | undefined;
    if (oldest === undefined) break;
    attempts.delete(oldest);
  }
}

export function createAnthropicMessagesProviderClient(
  unsafeConfig: unknown,
  dependencies: AnthropicMessagesProviderDependencies = {},
): AnthropicMessagesProviderClient {
  const config = parseConfig(unsafeConfig);
  const fetchTransport = dependencies.fetch ?? defaultFetchTransport;
  const nowMs = dependencies.nowMs ?? Date.now;
  const reconciledAttempts = new Map<string, ProviderAttemptSuccess>();

  const generateWithSignal = async (
    input: ProviderCallInput,
    signal?: AiAbortSignal,
  ): Promise<ProviderAttempt> => {
    let pricing: AnthropicModelPricing;
    try {
      pricing = assertRoute(config, input.route);
    } catch {
      return failure("refusal", 0);
    }
    const startedAt = nowMs();
    const abortContext = providerAbortContext(config.requestTimeoutMs, signal);
    try {
      const response = await raceWithAbort(
        fetchTransport(ANTHROPIC_MESSAGES_URL, {
          method: "POST",
          headers: Object.freeze({
            "anthropic-version": ANTHROPIC_VERSION,
            "content-type": "application/json",
            "x-api-key": config.apiKey,
          }),
          body: JSON.stringify({
            model: input.route.modelRef,
            max_tokens: input.maximumOutputTokens,
            system: [
              {
                type: "text",
                text: input.stablePrefix,
                cache_control: { type: "ephemeral", ttl: "5m" },
              },
            ],
            messages: [{ role: "user", content: input.variablePayload }],
          }),
          signal: abortContext.signal,
        }),
        abortContext.signal,
      );
      const latencyMs = Math.max(0, Math.round(nowMs() - startedAt));
      const responseRequestRef = safeProviderRequestRef(response.headers);
      if (response.status < 200 || response.status >= 300) {
        return failure(classifyHttpFailure(response.status), latencyMs, responseRequestRef);
      }
      let parsed: ParsedAnthropicMessage;
      try {
        parsed = parseAnthropicMessage(
          await raceWithAbort(
            readBoundedResponse(response, config.maximumResponseBytes),
            abortContext.signal,
          ),
        );
      } catch {
        return failure("provider_unavailable", latencyMs, responseRequestRef);
      }
      if (parsed.modelRef !== input.route.modelRef) {
        return failure("provider_unavailable", latencyMs, parsed.providerRequestRef);
      }
      if (parsed.refused) {
        return Object.freeze({
          kind: "failure",
          providerRequestRef: parsed.providerRequestRef,
          classification: "refusal",
          tokenUsage: parsed.tokenUsage,
          estimatedCostUsd: estimatedCostUsd(parsed.tokenUsage, pricing),
          latencyMs,
        });
      }
      const attempt: ProviderAttemptSuccess = Object.freeze({
        kind: "success",
        providerRequestRef: parsed.providerRequestRef,
        output: parsed.output,
        tokenUsage: parsed.tokenUsage,
        estimatedCostUsd: estimatedCostUsd(parsed.tokenUsage, pricing),
        latencyMs,
      });
      rememberAttempt(reconciledAttempts, attempt, config.reconciliationCacheSize);
      return attempt;
    } catch (error) {
      const latencyMs = Math.max(0, Math.round(nowMs() - startedAt));
      return failure(
        isAbortError(error) || abortContext.signal.aborted ? "timeout" : "provider_unavailable",
        latencyMs,
      );
    } finally {
      abortContext.dispose();
    }
  };

  const probe = async (signal?: AiAbortSignal): Promise<AnthropicProviderProbeResult> => {
    const abortContext = providerAbortContext(config.requestTimeoutMs, signal);
    try {
      const response = await raceWithAbort(
        fetchTransport(`${ANTHROPIC_MESSAGES_URL.replace(/\/messages$/u, "/models")}?limit=1`, {
          method: "GET",
          headers: Object.freeze({
            "anthropic-version": ANTHROPIC_VERSION,
            "x-api-key": config.apiKey,
          }),
          signal: abortContext.signal,
        }),
        abortContext.signal,
      );
      if (response.status < 200 || response.status >= 300) {
        return Object.freeze({
          status: "unavailable",
          providerRef: config.providerRef,
          classification: classifyHttpFailure(response.status),
        });
      }
      try {
        parseAnthropicModelList(
          await raceWithAbort(
            readBoundedResponse(response, config.maximumResponseBytes),
            abortContext.signal,
          ),
        );
      } catch {
        return Object.freeze({
          status: "unavailable",
          providerRef: config.providerRef,
          classification: "provider_unavailable",
        });
      }
      return Object.freeze({ status: "ready", providerRef: config.providerRef });
    } catch (error) {
      return Object.freeze({
        status: "unavailable",
        providerRef: config.providerRef,
        classification:
          isAbortError(error) || abortContext.signal.aborted ? "timeout" : "provider_unavailable",
      });
    } finally {
      abortContext.dispose();
    }
  };

  return Object.freeze({
    generate: (input: ProviderCallInput) => generateWithSignal(input),
    generateWithSignal,
    probe,
    reconcile: async (input: Parameters<AiProviderPort["reconcile"]>[0]) =>
      reconciledAttempts.get(input.providerRequestRef) ?? Object.freeze({ kind: "not_found" }),
  });
}
