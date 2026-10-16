import "server-only";
import {
  canonicalCampaignHash,
  CampaignCommandForbiddenError,
  CampaignResourceNotAccessibleError,
  type AuthenticatedPrincipal,
} from "@oalo/application";
import {
  OpaqueReferenceSchema,
  WebinarPublisherLaunchRecordSchema,
  WebinarPublisherOperationSchema,
} from "@oalo/contracts";
import { PostgresWebinarPublisherRepository } from "@oalo/db";
import { z } from "zod";
import { PublisherStatusSchema } from "../features/webinar-ads/publisher-status-model.js";
import {
  resolveAuthenticatedReadPrincipal,
  type CampaignCommandPorts,
} from "./authenticated-principal.js";
import { campaignCommandAuthErrorResponse } from "./campaign-command-http.js";
import {
  campaignDatabasePool,
  workspaceCorrelationReferenceFor,
} from "./campaign-persistence-runtime.js";
import { resolveRuntimeCampaignCommandPorts } from "./runtime-authentication.js";
import { WEBINAR_PRIVATE_HEADERS } from "./webinar-ad-http.js";

const Params = z.object({ operationRef: OpaqueReferenceSchema }).strict();
const RecordSchema = z
  .object({
    operation: WebinarPublisherOperationSchema,
    launch: WebinarPublisherLaunchRecordSchema,
  })
  .passthrough();
export interface PublisherStatusReader {
  read(principal: Readonly<AuthenticatedPrincipal>, operationRef: string): Promise<unknown>;
  now(): Date;
}

/** A read-only adapter to the existing native authorized read, never an admission verifier. */
function nativeReader(
  request: Request,
  environment: unknown,
  auth: CampaignCommandPorts,
): PublisherStatusReader {
  const refuseMutation = async (): Promise<never> => {
    throw new Error("PUBLISHER_READ_ONLY");
  };
  return {
    now: () => new Date(),
    read: async (principal, operationRef) => {
      const repository = new PostgresWebinarPublisherRepository(
        campaignDatabasePool(environment),
        {
          currentPrincipal: () => resolveAuthenticatedReadPrincipal(request, environment, auth),
          assertEvidenceCurrent: refuseMutation,
          assertDispatch: refuseMutation,
          assertCheckpoint: refuseMutation,
        },
        workspaceCorrelationReferenceFor(principal),
      );
      return repository.readWorker(principal, operationRef);
    },
  };
}

export function projectPublisherStatus(
  raw: unknown,
  principal: Readonly<AuthenticatedPrincipal>,
  operationRef: string,
  checkedAt: Date,
) {
  const { operation, launch } = RecordSchema.parse(raw);
  const { summary } = launch,
    p = summary.projection;
  if (
    operation.operationRef !== operationRef ||
    operation.locationRef !== principal.locationRef ||
    operation.actorRef !== principal.actorRef ||
    operation.projectionRef !== p.projectionRef ||
    p.locationRef !== principal.locationRef ||
    p.createdBy !== principal.actorRef
  )
    throw new CampaignResourceNotAccessibleError();
  const { summaryHash, ...summaryBody } = summary;
  const { projectionHash, ...projectionBody } = p;
  if (
    (operation.providerObservedAt !== null &&
      Date.parse(operation.providerObservedAt) > checkedAt.getTime()) ||
    canonicalCampaignHash(summaryBody) !== summaryHash ||
    canonicalCampaignHash(projectionBody) !== projectionHash ||
    operation.projectionHash !== projectionHash ||
    operation.summaryHash !== summaryHash
  )
    throw new Error("PUBLISHER_STATUS_INVALID");
  return PublisherStatusSchema.parse({
    operationRef,
    campaignRef: p.campaignRef,
    campaignVersionRef: p.campaignVersionRef,
    action: operation.action,
    state: operation.state,
    campaignState: launch.state,
    stage: operation.stage,
    providerObservedAt: operation.providerObservedAt,
    checkedAt: checkedAt.toISOString(),
    accountLabel: summary.accountLabel,
    pageLabel: summary.pageLabel,
    destination: p.destination.publicUrl,
    headline: p.copy.headline,
    dailyBudgetMinor: p.budget.dailyBudgetMinor,
    totalBudgetMinor: p.budget.totalBudgetMinor,
    totalSemantics: p.budget.totalSemantics,
    endsAt: p.schedule.endsAt,
  });
}

export async function handlePublisherStatus(
  request: Request,
  rawParams: unknown,
  environment: unknown = process.env,
  auth?: CampaignCommandPorts,
  reader?: PublisherStatusReader,
): Promise<Response> {
  try {
    const ports = auth ?? resolveRuntimeCampaignCommandPorts(environment);
    const principal = await resolveAuthenticatedReadPrincipal(request, environment, ports);
    if (principal.role !== "location_admin" || principal.authenticationMode === "local_synthetic")
      throw new CampaignCommandForbiddenError();
    const params = Params.safeParse(rawParams);
    if (!params.success)
      return Response.json(
        { error: "INVALID_PUBLISHER_OPERATION" },
        { status: 400, headers: WEBINAR_PRIVATE_HEADERS },
      );
    const { operationRef } = params.data;
    const source = reader ?? nativeReader(request, environment, ports);
    const record = await source.read(principal, operationRef);
    if (record === null || record === undefined) throw new CampaignResourceNotAccessibleError();
    return Response.json(projectPublisherStatus(record, principal, operationRef, source.now()), {
      headers: WEBINAR_PRIVATE_HEADERS,
    });
  } catch (error) {
    const response =
      error instanceof z.ZodError
        ? Response.json({ error: "PUBLISHER_STATUS_UNAVAILABLE" }, { status: 503 })
        : error instanceof Error && error.message === "PUBLISHER_NOT_FOUND"
          ? Response.json({ error: "NOT_FOUND" }, { status: 404 })
          : (campaignCommandAuthErrorResponse(error) ??
            Response.json({ error: "PUBLISHER_STATUS_UNAVAILABLE" }, { status: 503 }));
    for (const [key, value] of Object.entries(WEBINAR_PRIVATE_HEADERS))
      response.headers.set(key, value);
    return response;
  }
}
