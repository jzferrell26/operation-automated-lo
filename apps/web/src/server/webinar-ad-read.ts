import {
  CampaignResourceNotAccessibleError,
  assertWebinarAdPreflightCurrent,
  canonicalCampaignHash,
  type AuthenticatedPrincipal,
  type CampaignWorkspaceVersionRecord,
  type WebinarAdEvidencePort,
} from "@oalo/application";
import {
  CampaignVersionSchema,
  type CampaignVersion,
  type WebinarAdCampaignManifest,
} from "@oalo/contracts";
import { z } from "zod";
import {
  resolveAuthenticatedReadPrincipal,
  type CampaignCommandPorts,
} from "./authenticated-principal.js";
import {
  createCampaignPersistenceAdapter,
  type CampaignPersistenceAdapter,
} from "./campaign-persistence-runtime.js";
import {
  createWebinarAdEvidencePort,
  webinarCurrentEvidence,
  type WebinarCurrentEvidence,
} from "./webinar-ad-evidence.js";
import { regenerateWebinarAdRasters } from "./webinar-ad-raster.js";
import { readCampaignWebinarLabels, type WebinarDestinationChoice } from "./webinar-destination.js";
import { WebinarPreparationError } from "./webinar-ad-prepare.js";
import {
  WebinarVersionParamsSchema,
  WEBINAR_PRIVATE_HEADERS,
  webinarFailure,
  type WebinarAdapterFactory,
} from "./webinar-ad-http.js";
import { resolveRuntimeCampaignCommandPorts } from "./runtime-authentication.js";

export interface WebinarAdReview {
  readonly manifest: WebinarAdCampaignManifest;
  readonly current: WebinarCurrentEvidence;
  readonly publication: Readonly<{ title: string; learningSummary: string | null }> | null;
  readonly providerEnabled: false;
  readonly art: Readonly<{ tall: string; square: string }>;
  readonly effectiveEndsAt: string;
  readonly incompleteSave: boolean;
}
export function webinarArtLinks(version: Readonly<CampaignVersion>) {
  const base = `/api/campaigns/webinar-ads/${version.campaignRef}/${version.campaignVersionRef}`;
  return { tall: `${base}/tall`, square: `${base}/square` };
}
export function frozenWebinarManifest(
  versionValue: unknown,
  principal: Readonly<AuthenticatedPrincipal>,
): WebinarAdCampaignManifest {
  const version = CampaignVersionSchema.parse(versionValue);
  if (
    version.locationRef !== principal.locationRef ||
    version.manifest.blueprintId !== "webinar-ad"
  )
    throw new CampaignResourceNotAccessibleError();
  if (
    canonicalCampaignHash(version.manifest) !== version.manifestHash ||
    canonicalCampaignHash(version.manifest.destination) !== version.manifest.destinationHash
  )
    throw new WebinarPreparationError(503, "WEBINAR_SAVED_EVIDENCE_INVALID");
  return version.manifest;
}
export async function buildWebinarAdReview(
  record: CampaignWorkspaceVersionRecord,
  principal: Readonly<AuthenticatedPrincipal>,
  environment: unknown,
  evidence: WebinarAdEvidencePort = createWebinarAdEvidencePort(principal, environment),
  choice: ((version: CampaignVersion) => Promise<WebinarDestinationChoice>) | undefined = undefined,
): Promise<WebinarAdReview> {
  const manifest = frozenWebinarManifest(record.version, principal);
  let current = await webinarCurrentEvidence(record.version, evidence);
  let incompleteSave = false;
  try {
    assertWebinarAdPreflightCurrent(record.version, record.preflight);
  } catch {
    incompleteSave = record.preflight === undefined;
    current = {
      available: false,
      error: incompleteSave ? "WEBINAR_SAVE_INCOMPLETE" : "WEBINAR_PREFLIGHT_INVALID",
    };
  }
  let publication: WebinarAdReview["publication"] = null;
  try {
    const resolved =
      choice === undefined
        ? await readCampaignWebinarLabels(
            principal,
            record.version.campaignRef,
            record.version.campaignVersionRef,
            environment,
          )
        : await choice(record.version);
    if (
      "destination" in resolved
        ? canonicalCampaignHash(resolved.destination) !== manifest.destinationHash
        : resolved.snapshotHash !== manifest.destination.snapshotHash
    )
      throw new WebinarPreparationError(409, "DESTINATION_CHANGED");
    publication = { title: resolved.title, learningSummary: resolved.learningSummary };
  } catch (error) {
    // The historic manifest and images remain inspectable when current publication capability is withdrawn.
    if (current.available)
      current = {
        available: false,
        error: error instanceof WebinarPreparationError ? error.code : "DESTINATION_UNAVAILABLE",
      };
  }
  return {
    manifest,
    current,
    publication,
    providerEnabled: false,
    art: webinarArtLinks(record.version),
    effectiveEndsAt: manifest.schedule.endsAt,
    incompleteSave,
  };
}
export async function readWebinarVersion(
  principal: Readonly<AuthenticatedPrincipal>,
  raw: unknown,
  adapter: CampaignPersistenceAdapter,
) {
  const params = WebinarVersionParamsSchema.parse(raw);
  const record = (await adapter.readRepository.listVersionsOf(params.campaignRef)).find(
    (candidate) => candidate.version.campaignVersionRef === params.campaignVersionRef,
  );
  if (record === undefined) throw new CampaignResourceNotAccessibleError();
  frozenWebinarManifest(record.version, principal);
  return record;
}
export async function handleWebinarAdRead(
  request: Request,
  raw: unknown,
  environment: unknown = process.env,
  ports: CampaignCommandPorts = resolveRuntimeCampaignCommandPorts(environment),
  adapterFactory: WebinarAdapterFactory = createCampaignPersistenceAdapter,
): Promise<Response> {
  try {
    const principal = await resolveAuthenticatedReadPrincipal(request, environment, ports);
    const record = await readWebinarVersion(principal, raw, adapterFactory(principal, environment));
    return Response.json(await buildWebinarAdReview(record, principal, environment), {
      headers: WEBINAR_PRIVATE_HEADERS,
    });
  } catch (error) {
    return webinarFailure(error);
  }
}
const ArtParams = WebinarVersionParamsSchema.extend({ shape: z.enum(["tall", "square"]) }).strict();
export async function handleWebinarAdArt(
  request: Request,
  raw: unknown,
  environment: unknown = process.env,
  ports: CampaignCommandPorts = resolveRuntimeCampaignCommandPorts(environment),
  adapterFactory: WebinarAdapterFactory = createCampaignPersistenceAdapter,
): Promise<Response> {
  try {
    const principal = await resolveAuthenticatedReadPrincipal(request, environment, ports);
    const params = ArtParams.parse(raw);
    const record = await readWebinarVersion(
      principal,
      { campaignRef: params.campaignRef, campaignVersionRef: params.campaignVersionRef },
      adapterFactory(principal, environment),
    );
    const manifest = frozenWebinarManifest(record.version, principal);
    const images = await regenerateWebinarAdRasters(manifest);
    const image = params.shape === "tall" ? images[0] : images[1];
    return new Response(new Uint8Array(image.bytes), {
      headers: {
        ...WEBINAR_PRIVATE_HEADERS,
        "content-type": "image/png",
        "content-disposition": `attachment; filename="webinar-ad-v${record.version.versionNo}-${params.shape}.png"`,
        "content-security-policy": "default-src 'none'; sandbox",
      },
    });
  } catch (error) {
    return webinarFailure(error);
  }
}
