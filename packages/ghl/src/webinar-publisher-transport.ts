import { createHash } from "node:crypto";
import { z } from "zod";
import { createAbortContext, raceWithAbort } from "@oalo/config";
import {
  OpaqueReferenceSchema,
  WebinarPublisherNativeIdSchema as Id,
  WebinarPublisherQualificationSchema,
  WebinarPublisherPauseQualificationSchema,
} from "@oalo/contracts";

import {
  hashWebinarPublisherValue,
  assertWebinarPublisherProjection,
  compileWebinarPublisherDraft,
  materializeWebinarPublisherDraft,
} from "./webinar-publisher-compiler.js";
import {
  decodeWebinarPublisherResponse,
  WebinarPublisherAdRequestSchema,
  WebinarPublisherAdsetRequestSchema,
  WebinarPublisherCampaignRequestSchema,
  type WebinarPublisherResponseOperation,
} from "./webinar-publisher-dtos.js";
import {
  classifyLeadConnectorFailure,
  parseLeadConnectorRateLimitMetadata,
  type LeadConnectorFailureClassification,
  type LeadConnectorRateLimitMetadata,
} from "./leadconnector-v2-http-transport.js";
import {
  assertWebinarPublisherMediaUrl,
  webinarPublisherMultipart,
} from "./webinar-publisher-media.js";

import {
  WEBINAR_PUBLISHER_NATIVE_OPERATIONS,
  WEBINAR_PUBLISHER_WIRE_MAPPING_HASH,
} from "./webinar-publisher-wire.js";
const Operations = Object.keys(WEBINAR_PUBLISHER_NATIVE_OPERATIONS) as [
  WebinarPublisherResponseOperation,
  ...WebinarPublisherResponseOperation[],
];
const Request = z
  .object({
    operation: z.enum(Operations),
    locationRef: OpaqueReferenceSchema,
    parameters: z
      .object({ campaignId: Id.optional(), adsetId: Id.optional(), adAccountId: Id.optional() })
      .strict()
      .default({}),
    query: z
      .object({
        after: z.string().min(1).max(2048).optional(),
        limit: z.number().int().min(1).max(50).optional(),
        query: z.string().min(1).max(300).optional(),
        startDate: z.iso.date().optional(),
        endDate: z.iso.date().optional(),
      })
      .strict()
      .default({}),
    body: z.unknown().optional(),
    projection: z.unknown().optional(),
    qualification: z.unknown().optional(),
    mediaReceipt: z.unknown().optional(),
  })
  .strict();
const Token = z
  .object({ locationId: Id, accessToken: z.string().min(20).max(4096).regex(/^\S+$/u) })
  .strict();
export class WebinarPublisherTransportError extends Error {
  public constructor(
    public readonly classification: LeadConnectorFailureClassification,
    public readonly operation: WebinarPublisherResponseOperation,
    public readonly status?: number,
    public readonly rateLimit: LeadConnectorRateLimitMetadata = {},
  ) {
    super(`Webinar publisher operation refused: ${classification}.`);
    this.name = "WebinarPublisherTransportError";
  }
  public get requiresReconciliation(): boolean {
    return this.classification === "UNCERTAIN_WRITE";
  }
}
export interface WebinarPublisherNativeTransportDependencies {
  readonly fetch: (url: string, init: RequestInit) => Promise<Response>;
  readonly resolveLocationToken: (
    input: Readonly<{ locationRef: string; signal: AbortSignal }>,
  ) => Promise<unknown>;
  readonly authority: {
    assertCurrent(
      input: Readonly<{
        projection: unknown;
        qualification: unknown;
        mediaReceipt: unknown;
        operation: WebinarPublisherResponseOperation;
        body: unknown;
        parameters: unknown;
        signal: AbortSignal;
      }>,
    ): Promise<void>;
  };
  readonly requestTimeoutMs?: number;
  readonly now?: () => number;
}

async function boundedBytes(
  response: Response,
  maximum: number,
  signal: AbortSignal,
): Promise<Uint8Array> {
  const length = response.headers.get("content-length");
  if (length !== null && (!/^\d+$/u.test(length) || Number(length) > maximum))
    throw new Error("Webinar response exceeds its boundary.");
  const reader = response.body?.getReader();
  if (reader === undefined) throw new Error("Webinar response body is missing.");
  const chunks: Uint8Array[] = [];
  let count = 0;
  try {
    while (true) {
      const chunk = await raceWithAbort(reader.read(), signal);
      if (chunk.done) break;
      count += chunk.value.length;
      if (count > maximum) throw new Error("Webinar response exceeds its boundary.");
      chunks.push(chunk.value);
    }
  } finally {
    await raceWithAbort(reader.cancel(), signal).catch(() => undefined);
    reader.releaseLock();
  }
  return Uint8Array.from(Buffer.concat(chunks));
}

export function createWebinarPublisherNativeTransport(
  dependencies: WebinarPublisherNativeTransportDependencies,
) {
  const timeout = z
    .number()
    .int()
    .min(1)
    .max(60_000)
    .parse(dependencies.requestTimeoutMs ?? 15_000);
  const now = dependencies.now ?? Date.now;
  const execute = async (raw: unknown, signal?: AbortSignal) => {
    const parsedRequest = Request.safeParse(raw);
    if (!parsedRequest.success) throw new Error("Webinar publisher request is invalid.");
    const request = parsedRequest.data;
    const descriptor = WEBINAR_PUBLISHER_NATIVE_OPERATIONS[request.operation];
    const mutation = descriptor.method !== "GET";
    const context = createAbortContext({
      controller: new AbortController(),
      timeoutMilliseconds: timeout,
      timeoutReason: new Error("Webinar publisher deadline"),
      ...(signal === undefined ? {} : { externalSignal: signal }),
      scheduleTimeout: setTimeout,
      cancelTimeout: clearTimeout,
    });
    let dispatched = false;
    try {
      if (context.signal.aborted) throw new Error("Webinar request was aborted.");
      const token = Token.parse(
        await raceWithAbort(
          dependencies.resolveLocationToken({
            locationRef: request.locationRef,
            signal: context.signal,
          }),
          context.signal,
        ),
      );
      let body: string | FormData | undefined;
      if (mutation) {
        const projection = assertWebinarPublisherProjection(request.projection);
        const proof =
          request.operation === "pause"
            ? WebinarPublisherPauseQualificationSchema.parse(request.qualification)
            : WebinarPublisherQualificationSchema.parse(request.qualification);
        if (
          proof.kind !== "app_test" ||
          request.locationRef !== projection.locationRef ||
          token.locationId !== projection.assets.locationId ||
          proof.projectionHash !== projection.projectionHash ||
          proof.locationId !== token.locationId ||
          proof.adAccountId !== projection.assets.adAccountId ||
          proof.wireMappingHash !== projection.providerContract.wireMappingHash ||
          projection.providerContract.wireMappingHash !== WEBINAR_PUBLISHER_WIRE_MAPPING_HASH ||
          now() >= Date.parse(proof.expiresAt) ||
          now() < Date.parse(proof.observedAt) ||
          ("action" in proof
            ? proof.campaignId !== request.parameters.campaignId
            : proof.pageId !== projection.assets.pageId ||
              proof.schedule.observedStop !== projection.schedule.endsAt ||
              proof.schedule.requestEnd !== projection.schedule.endsAt ||
              proof.budget.amountMajor !== projection.budget.dailyBudgetMinor / 100 ||
              proof.timezone !== projection.assets.timezone ||
              projection.budget.totalSemantics === "hard_cap" ||
              now() >= Date.parse(projection.schedule.endsAt))
        ) {
          throw new WebinarPublisherTransportError("DEPENDENCY_BLOCKED", request.operation);
        }
        if (request.operation === "upload") {
          const media = z
            .object({ bytes: z.instanceof(Uint8Array), name: z.string() })
            .strict()
            .parse(request.body);
          if (
            hashBytes(media.bytes) !== projection.creative.digest ||
            media.bytes.length !== projection.creative.byteLength
          )
            throw new Error("Webinar upload differs from approved bytes.");
          body = webinarPublisherMultipart(media);
        } else {
          const schema =
            request.operation === "campaign"
              ? WebinarPublisherCampaignRequestSchema
              : request.operation === "adset"
                ? WebinarPublisherAdsetRequestSchema
                : request.operation === "ad"
                  ? WebinarPublisherAdRequestSchema
                  : z.object({ locationId: Id }).strict();
          const parsed = schema.parse(request.body);
          if (parsed.locationId !== token.locationId)
            throw new Error("Webinar request location mismatch.");
          if (["campaign", "adset", "ad"].includes(request.operation)) {
            const compiled = compileWebinarPublisherDraft({
              projection,
              qualification: proof,
              media: request.mediaReceipt,
              now: new Date(now()).toISOString(),
            });
            if (!compiled.ok || compiled.fixtureOnly)
              throw new Error("Webinar native draft is unqualified.");
            let expected: unknown = compiled.campaign;
            if (request.operation !== "campaign") {
              const parents = z.object({ campaignId: Id, adsetId: Id.optional() }).parse(parsed);
              expected =
                request.operation === "adset"
                  ? { ...compiled.adset, campaignId: parents.campaignId }
                  : materializeWebinarPublisherDraft(compiled, {
                      campaignId: parents.campaignId,
                      adsetId: Id.parse(parents.adsetId),
                    }).ad;
            }
            // Initial creation never accepts an arbitrary existing native id. Reconciliation
            // and the persisted parent lineage are checked by the current authority port.
            if (hashWebinarPublisherValue(parsed) !== hashWebinarPublisherValue(expected))
              throw new Error("Webinar native body differs from the approved projection.");
          }
          body = JSON.stringify(parsed);
          if (Buffer.byteLength(body) > 1_048_576)
            throw new Error("Webinar request exceeds its boundary.");
        }
        await raceWithAbort(
          dependencies.authority.assertCurrent({
            projection,
            qualification: proof,
            mediaReceipt: request.mediaReceipt,
            operation: request.operation,
            body: request.body,
            parameters: request.parameters,
            signal: context.signal,
          }),
          context.signal,
        );
      } else if (
        request.body !== undefined ||
        request.projection !== undefined ||
        request.qualification !== undefined ||
        request.mediaReceipt !== undefined
      )
        throw new Error("Webinar read has mutation fields.");
      const url = new URL(
        descriptor.path.replace(
          /:(campaignId|adAccountId)/gu,
          (_, key: "campaignId" | "adAccountId") =>
            encodeURIComponent(Id.parse(request.parameters[key])),
        ),
        "https://services.leadconnectorhq.com",
      );
      const permittedParameters =
        request.operation === "account"
          ? ["adAccountId"]
          : ["linked", "publish", "progress", "pause", "resume", "reporting"].includes(
                request.operation,
              )
            ? ["campaignId"]
            : [];
      for (const key of Object.keys(request.parameters))
        if (!permittedParameters.includes(key)) throw new Error("Webinar parameter is prohibited.");
      if (!mutation) url.searchParams.set("locationId", token.locationId);
      const permittedQuery =
        request.operation === "pages"
          ? ["after", "limit"]
          : request.operation === "reporting"
            ? ["startDate", "endDate"]
            : request.operation === "geography"
              ? ["query"]
              : [];
      for (const [key, value] of Object.entries(request.query)) {
        if (!permittedQuery.includes(key)) throw new Error("Webinar query is prohibited.");
        url.searchParams.set(key, String(value));
      }
      if (request.operation === "pages") {
        url.searchParams.set("fetchExisting", "true");
        url.searchParams.set("limit", String(request.query.limit ?? 50));
      }
      if (request.operation === "geography") {
        if (!request.query.query) throw new Error("Webinar geography query is required.");
        url.searchParams.set("type", "geolocation");
      }
      if (
        request.operation === "reporting" &&
        (request.query.startDate === undefined ||
          request.query.endDate === undefined ||
          request.query.startDate > request.query.endDate)
      )
        throw new Error("Webinar reporting window is invalid.");
      const headers: Record<string, string> = {
        Authorization: `Bearer ${token.accessToken}`,
        Version: descriptor.version,
        Accept: "application/json",
      };
      if (typeof body === "string") headers["Content-Type"] = "application/json";
      const requestHash = hashWebinarPublisherValue({
        operation: request.operation,
        version: descriptor.version,
        method: descriptor.method,
        url: url.toString(),
        body:
          typeof body === "string"
            ? JSON.parse(body)
            : body === undefined
              ? null
              : {
                  projectionHash: assertWebinarPublisherProjection(request.projection)
                    .projectionHash,
                  digest: assertWebinarPublisherProjection(request.projection).creative.digest,
                },
      });
      if (context.signal.aborted) throw new Error("Webinar request was aborted.");
      dispatched = true;
      const response = await raceWithAbort(
        dependencies.fetch(url.toString(), {
          method: descriptor.method,
          headers,
          ...(body === undefined ? {} : { body }),
          redirect: "error",
          signal: context.signal,
        }),
        context.signal,
      );
      const rateLimit = parseLeadConnectorRateLimitMetadata(response.headers, now());
      if (response.redirected || response.status !== 200)
        throw new WebinarPublisherTransportError(
          response.status >= 200 && response.status < 400
            ? mutation
              ? "UNCERTAIN_WRITE"
              : "TRANSIENT_PROVIDER"
            : classifyLeadConnectorFailure(response.status, descriptor.method),
          request.operation,
          response.status,
          rateLimit,
        );
      const bytes = await boundedBytes(response, 2_097_152, context.signal);
      const parentIds =
        request.operation === "adset" || request.operation === "ad"
          ? z.object({ campaignId: Id, adsetId: Id.optional() }).parse(request.body)
          : undefined;
      const projection = mutation
        ? assertWebinarPublisherProjection(request.projection)
        : undefined;
      const normalized = decodeWebinarPublisherResponse(
        request.operation,
        JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)),
        {
          locationId: token.locationId,
          ...(request.parameters.campaignId === undefined
            ? {}
            : { campaignId: request.parameters.campaignId }),
          ...(request.parameters.adAccountId === undefined
            ? {}
            : { adAccountId: request.parameters.adAccountId }),
          ...(parentIds === undefined ? {} : { campaignId: parentIds.campaignId }),
          ...(parentIds?.adsetId === undefined ? {} : { adsetId: parentIds.adsetId }),
          ...(projection !== undefined && request.operation === "campaign"
            ? { adAccountId: projection.assets.adAccountId }
            : {}),
        },
      );
      return {
        normalized,
        requestHash,
        normalizedResultHash: hashWebinarPublisherValue(normalized),
        rateLimit,
      };
    } catch (error) {
      if (error instanceof WebinarPublisherTransportError) throw error;
      throw new WebinarPublisherTransportError(
        dispatched ? (mutation ? "UNCERTAIN_WRITE" : "TRANSIENT_PROVIDER") : "DEPENDENCY_BLOCKED",
        request.operation,
      );
    } finally {
      context.dispose();
    }
  };
  return {
    execute,
    retrieveMedia: async (
      url: string,
      allowedOrigins: readonly string[],
      signal?: AbortSignal,
    ): Promise<Uint8Array> => {
      const safeUrl = assertWebinarPublisherMediaUrl(url, allowedOrigins);
      const context = createAbortContext({
        controller: new AbortController(),
        timeoutMilliseconds: timeout,
        timeoutReason: new Error("Webinar media deadline"),
        ...(signal === undefined ? {} : { externalSignal: signal }),
        scheduleTimeout: setTimeout,
        cancelTimeout: clearTimeout,
      });
      try {
        const response = await raceWithAbort(
          dependencies.fetch(safeUrl, { method: "GET", redirect: "error", signal: context.signal }),
          context.signal,
        );
        if (
          response.status !== 200 ||
          response.redirected ||
          response.headers.get("content-type")?.split(";")[0] !== "image/png"
        )
          throw new Error("Webinar media fetch is unqualified.");
        return await boundedBytes(response, 25_000_000, context.signal);
      } finally {
        context.dispose();
      }
    },
  };
}

function hashBytes(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}
