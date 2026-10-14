import "server-only";
import {
  assertMayExecuteCampaignMutation,
  FinancingMediaError,
  type AuthenticatedPrincipal,
} from "@oalo/application";
import {
  FINANCING_MEDIA_MAX_BYTES,
  FinancingMediaRefSchema,
  FinancingImageMimeSchema,
  FinancingRightsBasisSchema,
} from "@oalo/contracts";
import { z, ZodError } from "zod";
import { FinancingMediaStorageError } from "@oalo/storage";
import {
  resolveAuthenticatedPrincipal,
  resolveAuthenticatedReadPrincipal,
  type CampaignCommandPorts,
} from "./authenticated-principal.js";
import { campaignCommandAuthErrorResponse } from "./campaign-command-http.js";
import { resolveRuntimeCampaignCommandPorts } from "./runtime-authentication.js";
import { PRIVATE_PACKAGE_HEADERS } from "./property-package-http.js";
import { createFinancingMediaRuntime } from "./financing-media-runtime.js";
import {
  financingMediaPublicRecord,
  readFinancingMedia,
  uploadFinancingMedia,
  type FinancingMediaRuntime,
} from "./financing-media-service.js";

type Factory = (principal: AuthenticatedPrincipal, environment: unknown) => FinancingMediaRuntime;
function response(body: unknown, status: number) {
  return Response.json(body, { status, headers: PRIVATE_PACKAGE_HEADERS });
}
export function financingMediaFailure(error: unknown): Response {
  if (error instanceof ZodError) return response({ error: "FINANCING_MEDIA_INVALID" }, 400);
  if (error instanceof FinancingMediaStorageError) {
    return response(
      {
        error:
          error.kind === "conflict"
            ? "FINANCING_MEDIA_CONFLICT"
            : error.kind === "integrity"
              ? "FINANCING_MEDIA_INTEGRITY_FAILED"
              : "FINANCING_MEDIA_UNAVAILABLE",
      },
      error.kind === "conflict" ? 409 : error.kind === "integrity" ? 422 : 503,
    );
  }
  const auth = campaignCommandAuthErrorResponse(error);
  if (auth) {
    for (const [key, value] of Object.entries(PRIVATE_PACKAGE_HEADERS))
      auth.headers.set(key, value);
    return auth;
  }
  if (error instanceof FinancingMediaError) {
    const result = response({ error: error.code }, error.status);
    if (error.status === 429) result.headers.set("Retry-After", "3");
    return result;
  }
  return response(
    {
      error: error instanceof ZodError ? "FINANCING_MEDIA_INVALID" : "FINANCING_MEDIA_UNAVAILABLE",
    },
    error instanceof ZodError ? 400 : 503,
  );
}
export async function readBoundedFinancingMediaBody(
  request: Request,
  maximum = FINANCING_MEDIA_MAX_BYTES,
): Promise<Uint8Array> {
  const declared = request.headers.get("content-length");
  if (declared !== null && (!/^\d+$/u.test(declared) || !Number.isSafeInteger(Number(declared)))) {
    await request.body?.cancel();
    throw new FinancingMediaError("FINANCING_MEDIA_INVALID", 400);
  }
  if (declared !== null && Number(declared) > maximum) {
    await request.body?.cancel();
    throw new FinancingMediaError("FINANCING_MEDIA_TOO_LARGE", 413);
  }
  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader();
  const buffer = new Uint8Array(maximum);
  let size = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      if (size + chunk.value.length > maximum)
        throw new FinancingMediaError("FINANCING_MEDIA_TOO_LARGE", 413);
      buffer.set(chunk.value, size);
      size += chunk.value.length;
    }
    return buffer.slice(0, size);
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}
export async function handleFinancingMediaUpload(
  request: Request,
  environment: unknown = process.env,
  ports?: CampaignCommandPorts,
  factory: Factory = createFinancingMediaRuntime,
) {
  try {
    const principal = await resolveAuthenticatedPrincipal(
      request,
      environment,
      ports ?? resolveRuntimeCampaignCommandPorts(environment),
    );
    assertMayExecuteCampaignMutation(principal);
    const mime = FinancingImageMimeSchema.safeParse(request.headers.get("content-type"));
    if (!mime.success) {
      await request.body?.cancel();
      throw new FinancingMediaError("FINANCING_MEDIA_UNSUPPORTED", 415);
    }
    const input = {
      requestId: z.uuid().parse(request.headers.get("X-OALO-Media-Request-Id")),
      declaredMimeType: mime.data,
      rightsBasis: FinancingRightsBasisSchema.parse(
        request.headers.get("X-OALO-Media-Rights-Basis"),
      ),
      rightsConfirmed:
        z.literal("true").parse(request.headers.get("X-OALO-Media-Rights-Confirmed")) === "true",
    };
    const bytes = await readBoundedFinancingMediaBody(request);
    const mediaRuntime = factory(principal, environment);
    const saved = await uploadFinancingMedia(input, bytes, principal, mediaRuntime);
    return response(financingMediaPublicRecord(saved.record), saved.replayed ? 200 : 201);
  } catch (error) {
    if (!request.bodyUsed) await request.body?.cancel().catch(() => undefined);
    return financingMediaFailure(error);
  }
}
export async function handleFinancingMediaRead(
  request: Request,
  mediaRef: string,
  environment: unknown = process.env,
  ports?: CampaignCommandPorts,
  factory: Factory = createFinancingMediaRuntime,
) {
  try {
    const principal = await resolveAuthenticatedReadPrincipal(
      request,
      environment,
      ports ?? resolveRuntimeCampaignCommandPorts(environment),
    );
    const found = await readFinancingMedia(mediaRef, factory(principal, environment));
    return new Response(Uint8Array.from(found.bytes).buffer, {
      status: 200,
      headers: {
        ...PRIVATE_PACKAGE_HEADERS,
        "Content-Type": found.record.mimeType,
        "Content-Length": String(found.bytes.length),
      },
    });
  } catch (error) {
    return financingMediaFailure(error);
  }
}
export async function handleFinancingMediaRevoke(
  request: Request,
  mediaRef: string,
  environment: unknown = process.env,
  ports?: CampaignCommandPorts,
  factory: Factory = createFinancingMediaRuntime,
) {
  try {
    const principal = await resolveAuthenticatedPrincipal(
      request,
      environment,
      ports ?? resolveRuntimeCampaignCommandPorts(environment),
    );
    assertMayExecuteCampaignMutation(principal);
    if ((await readBoundedFinancingMediaBody(request, 1)).length > 0)
      throw new FinancingMediaError("FINANCING_MEDIA_INVALID", 400);
    if (!FinancingMediaRefSchema.safeParse(mediaRef).success)
      throw new FinancingMediaError("FINANCING_MEDIA_NOT_FOUND", 404);
    const runtime = factory(principal, environment);
    // Resolve first for indistinguishable missing/foreign references. Revoked is idempotent.
    const found = await runtime.repository.find(mediaRef);
    if (!found) throw new FinancingMediaError("FINANCING_MEDIA_NOT_FOUND", 404);
    const revocation = await runtime.repository.revoke(mediaRef);
    return response({ mediaRef: revocation.mediaRef, revokedAt: revocation.revokedAt }, 200);
  } catch (error) {
    return financingMediaFailure(error);
  }
}
