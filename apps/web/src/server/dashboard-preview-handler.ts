import { ZodError } from "zod";
import { campaignCheckSchema } from "../features/dashboard-preview/model.js";
import { canRenderDashboardPreview } from "./dashboard-preview.js";
import { compileOpenHouseDraft } from "./open-house-draft.js";
import { createLocalSyntheticPrincipal } from "./local-synthetic-principal.js";

const MAX_BODY_BYTES = 100_000;
function json(value: unknown, status = 200) {
  return Response.json(value, { status, headers: { "Cache-Control": "no-store" } });
}

function sameBrowserOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin || request.headers.get("sec-fetch-site") === "cross-site") return false;
  try {
    const source = new URL(origin);
    // Next may expose its internal localhost URL after proxying. The HTTP Host
    // is the destination the browser actually requested; browsers cannot set it.
    const host = request.headers.get("host") ?? new URL(request.url).host;
    const secure = source.protocol === "https:";
    const local =
      source.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(source.hostname);
    return source.origin === origin && source.host === host && (secure || local);
  } catch {
    return false;
  }
}

/** Uses the real content compiler, in memory, with no database or provider calls. */
export async function handleDashboardPreviewCheck(
  request: Request,
  environment: unknown = process.env,
): Promise<Response> {
  if (!canRenderDashboardPreview(environment)) return json({ error: "NOT_FOUND" }, 404);
  if (!sameBrowserOrigin(request)) return json({ error: "ORIGIN_NOT_ALLOWED" }, 403);
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json"))
    return json({ error: "INVALID_CAMPAIGN_DRAFT" }, 415);
  const reader = request.body?.getReader();
  if (!reader) return json({ error: "INVALID_CAMPAIGN_DRAFT" }, 400);
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.byteLength;
      if (size > MAX_BODY_BYTES) {
        await reader.cancel();
        return json({ error: "INVALID_CAMPAIGN_DRAFT" }, 413);
      }
      chunks.push(part.value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    const input: unknown = JSON.parse(new TextDecoder().decode(bytes));
    const { version, preflight } = await compileOpenHouseDraft(
      input,
      createLocalSyntheticPrincipal(),
      environment,
    );
    const manifest = version.manifest;
    return json(
      campaignCheckSchema.parse({
        campaignRef: version.campaignRef,
        campaignVersionRef: version.campaignVersionRef,
        detailHref: `/marketing/campaigns/${version.campaignRef}`,
        manifestHash: version.manifestHash,
        preflightResultHash: preflight.resultHash,
        state: preflight.blocking ? "preflight_failed" : "awaiting_approval",
        blocking: preflight.blocking,
        findings: preflight.findings,
        headline: manifest.content.headline,
        propertyAddress: manifest.property.address,
        realtorDisplayName: manifest.partner.realtorDisplayName,
        dailyBudgetMinor: manifest.meta.dailyBudgetMinor,
        totalBudgetMinor: manifest.meta.totalBudgetMinor,
        specialAdCategory: manifest.meta.specialAdCategory,
        persistenceKind: "browser",
        providerPublicationAuthorized: false,
        createdAt: new Date().toISOString(),
      }),
    );
  } catch (error) {
    if (error instanceof ZodError)
      return json(
        {
          error: "INVALID_CAMPAIGN_DRAFT",
          issues: error.issues.map((issue) => ({ path: issue.path })),
        },
        400,
      );
    return json({ error: "CAMPAIGN_PREFLIGHT_FAILED" }, 400);
  } finally {
    reader.releaseLock();
  }
}
