import { randomUUID } from "node:crypto";
import { assertMayExecuteCampaignMutation, type AuthenticatedPrincipal } from "@oalo/application";
import { normalizeFunnelPhoto } from "@oalo/rendering";
import { z, ZodError } from "zod";
import {
  FunnelDraftSchema,
  FunnelPhotoSchema,
  FunnelSaveSchema,
  type FunnelBrand,
  type FunnelStudioContext,
} from "../features/funnels/model.js";
import {
  resolveAuthenticatedPrincipal,
  resolveAuthenticatedReadPrincipal,
  type CampaignCommandPorts,
} from "./authenticated-principal.js";
import { readSavedAdBrand } from "./ad-brand-read.js";
import { campaignCommandAuthErrorResponse } from "./campaign-command-http.js";
import { HomeownerError, readBoundedJson } from "./homeowners/errors.js";
import { PRIVATE_PACKAGE_HEADERS } from "./property-package-http.js";
import { resolveRuntimeCampaignCommandPorts } from "./runtime-authentication.js";
import { createFunnelStore, FunnelError, funnelRequestHash } from "./funnel-store.js";

export const EMPTY_FUNNEL_BRAND: FunnelBrand = {
  name: "",
  company: "",
  nmls: "",
  companyNmls: "",
  disclosure: "",
  colorPresetId: "navy",
};
export const EMPTY_FUNNEL_CONTEXT: FunnelStudioContext = {
  canSave: false,
  brandReady: false,
  brand: EMPTY_FUNNEL_BRAND,
  drafts: [],
  synthetic: false,
};
export async function readFunnelStudio(
  principal: Readonly<AuthenticatedPrincipal>,
  environment: unknown,
): Promise<FunnelStudioContext> {
  const canSave = principal.role === "location_admin" || principal.role === "campaign_creator";
  if (principal.role === "platform_support") return EMPTY_FUNNEL_CONTEXT;
  const saved = await readSavedAdBrand(principal, environment);
  const { name, company, nmls, companyNmls, colorPresetId, disclosureLine } = saved.band;
  return {
    canSave,
    brandReady:
      saved.saved &&
      !!name &&
      !!company &&
      /^\d{4,12}$/u.test(nmls) &&
      /^\d{4,12}$/u.test(companyNmls),
    brand: { name, company, nmls, companyNmls, colorPresetId, disclosure: disclosureLine },
    drafts: await createFunnelStore(principal, environment).list(),
    synthetic: principal.authenticationMode === "local_synthetic",
  };
}
const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: PRIVATE_PACKAGE_HEADERS });
/** Shared by the two funnel mutations; do not accept a body before verified authority. */
async function funnelWriter(request: Request, environment: unknown, ports: CampaignCommandPorts) {
  const principal = await resolveAuthenticatedPrincipal(request, environment, ports);
  assertMayExecuteCampaignMutation(principal);
  const mediaType = request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase();
  if (mediaType !== "application/json") throw new FunnelError("FUNNEL_INVALID", 415);
  return principal;
}
function failure(error: unknown) {
  if (error instanceof FunnelError) return json({ error: error.code }, error.status);
  if (error instanceof ZodError) return json({ error: "FUNNEL_INVALID" }, 400);
  if (error instanceof HomeownerError)
    return json({ error: "FUNNEL_INVALID" }, error.status === 413 ? 413 : 400);
  const auth = campaignCommandAuthErrorResponse(error);
  if (auth) {
    for (const [key, value] of Object.entries(PRIVATE_PACKAGE_HEADERS))
      auth.headers.set(key, value);
    return auth;
  }
  return json({ error: "FUNNEL_UNAVAILABLE" }, 503);
}
/** Server owns identity; browser supplies only the exact catalog key and its editable fields. */
export async function handleFunnelSave(
  request: Request,
  environment: unknown = process.env,
  ports: CampaignCommandPorts = resolveRuntimeCampaignCommandPorts(environment),
) {
  try {
    const principal = await funnelWriter(request, environment, ports);
    const command = FunnelSaveSchema.parse(await readBoundedJson(request, 900000));
    if (
      (command.fields.heroPhoto || command.fields.hostPhoto) &&
      !command.fields.mediaPermissionConfirmed
    )
      throw new FunnelError("FUNNEL_INVALID", 400);
    // Validate image bytes again on save; upload success is not a client-granted trust signal.
    for (const slot of ["heroPhoto", "hostPhoto"] as const) {
      const photo = command.fields[slot];
      if (photo) {
        try {
          const normalized = await normalizeFunnelPhoto(
            Buffer.from(photo.dataUrl.split(",")[1] ?? "", "base64"),
          );
          command.fields[slot] = FunnelPhotoSchema.parse({
            dataUrl: `data:image/webp;base64,${Buffer.from(normalized).toString("base64")}`,
            alt: photo.alt,
          });
        } catch {
          throw new FunnelError("FUNNEL_PHOTO_INVALID", 400);
        }
      }
    }
    const saved = await readSavedAdBrand(principal, environment);
    const b = saved.band;
    if (
      !saved.saved ||
      !b.name ||
      !b.company ||
      !/^\d{4,12}$/u.test(b.nmls) ||
      !/^\d{4,12}$/u.test(b.companyNmls)
    )
      throw new FunnelError("FUNNEL_BRAND_REQUIRED", 400);
    const draft = FunnelDraftSchema.parse({
      kind: command.kind,
      templateVersion: command.templateVersion,
      fields: command.fields,
      revision: randomUUID(),
      savedAt: new Date().toISOString(),
      requestId: command.requestId,
      requestHash: funnelRequestHash(command.kind, command.fields),
      brand: {
        name: b.name,
        company: b.company,
        nmls: b.nmls,
        companyNmls: b.companyNmls,
        colorPresetId: b.colorPresetId,
        disclosure: b.disclosureLine,
      },
      publicationAuthorized: false,
    });
    return json({
      draft: await createFunnelStore(principal, environment).save(draft, command.expectedRevision),
    });
  } catch (error) {
    return failure(error);
  }
}
export async function handleFunnelRead(
  request: Request,
  environment: unknown = process.env,
  ports: CampaignCommandPorts = resolveRuntimeCampaignCommandPorts(environment),
) {
  try {
    const principal = await resolveAuthenticatedReadPrincipal(request, environment, ports);
    return json({ drafts: await createFunnelStore(principal, environment).list() });
  } catch (error) {
    return failure(error);
  }
}
let activePhotos = 0;
export async function handleFunnelPhoto(
  request: Request,
  environment: unknown = process.env,
  ports: CampaignCommandPorts = resolveRuntimeCampaignCommandPorts(environment),
) {
  try {
    await funnelWriter(request, environment, ports);
    if (activePhotos >= 2) return json({ error: "FUNNEL_UNAVAILABLE" }, 429);
    activePhotos++;
    try {
      const body = z
        .object({
          data: z
            .string()
            .max(4000100)
            .regex(/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/u),
          alt: z.string().trim().min(1).max(180),
        })
        .strict()
        .parse(await readBoundedJson(request, 4010000));
      let bytes: Uint8Array;
      try {
        bytes = await normalizeFunnelPhoto(Buffer.from(body.data.split(",")[1] ?? "", "base64"));
      } catch {
        throw new FunnelError("FUNNEL_PHOTO_INVALID", 400);
      }
      return json({
        photo: {
          dataUrl: `data:image/webp;base64,${Buffer.from(bytes).toString("base64")}`,
          alt: body.alt,
        },
      });
    } finally {
      activePhotos--;
    }
  } catch (error) {
    return failure(error);
  }
}
