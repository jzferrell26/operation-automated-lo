import "server-only";
import { canonicalCampaignHash, type AuthenticatedPrincipal } from "@oalo/application";
import { WebinarDestinationSchema, type WebinarDestination } from "@oalo/contracts";
import {
  createWebinarPublicationRepository,
  WebinarPublicationRowSchema,
  type WebinarPublicationRow,
} from "@oalo/db";
import {
  PublishedFunnelSchema,
  publicationBlockers,
} from "../features/funnels/publication-model.js";
import {
  campaignDatabasePool,
  workspaceCorrelationReferenceFor,
} from "./campaign-persistence-runtime.js";
import { publicFunnelConfig } from "./funnel-public-store.js";

export class WebinarDestinationError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(code);
  }
}
export interface WebinarDestinationChoice {
  readonly destination: WebinarDestination;
  readonly title: string;
  readonly learningSummary: string | null;
}
export interface WebinarHistoricalLabels {
  readonly title: string;
  readonly learningSummary: string | null;
  readonly snapshotHash: string;
}
/** Historical labels are never current-eligibility evidence. No gated field leaves this DTO. */
export function validatedHistoricalWebinarLabels(
  raw: WebinarPublicationRow,
): WebinarHistoricalLabels {
  const row = WebinarPublicationRowSchema.parse(raw);
  const publication = PublishedFunnelSchema.parse(row.publication);
  const frozen = WebinarDestinationSchema.parse(row.frozenDestination);
  const snapshotHash = canonicalCampaignHash(row.publication.snapshot);
  if (
    snapshotHash !== frozen.snapshotHash ||
    publication.id !== frozen.publicationId ||
    publication.sourceRevision !== frozen.sourceRevision ||
    publication.snapshot.kind !== frozen.kind ||
    row.publisherActorRef !== frozen.publisherActorRef
  )
    throw new WebinarDestinationError(409, "DESTINATION_CHANGED");
  return {
    title: publication.snapshot.fields.headline,
    learningSummary: publication.snapshot.fields.description || null,
    snapshotHash,
  };
}

/** Validate full persisted snapshot before hashing; access-only fields are never returned. */
export function validatedWebinarDestination(
  raw: WebinarPublicationRow,
  environment: unknown,
  now = new Date(),
): WebinarDestination {
  let origin: string;
  try {
    origin = publicFunnelConfig(environment).origin;
  } catch {
    throw new WebinarDestinationError(503, "DESTINATION_UNAVAILABLE");
  }
  const row = WebinarPublicationRowSchema.parse(raw),
    publication = PublishedFunnelSchema.parse(row.publication);
  if (!publication.active || Date.parse(publication.expiresAt) <= now.getTime())
    throw new WebinarDestinationError(409, "DESTINATION_CHANGED");
  const { kind, fields } = publication.snapshot;
  if (kind !== "live-webinar" && kind !== "on-demand")
    throw new WebinarDestinationError(422, "DESTINATION_INCOMPLETE");
  if (publicationBlockers(kind, fields, now.getTime()).length)
    throw new WebinarDestinationError(422, "DESTINATION_INCOMPLETE");
  const destination = WebinarDestinationSchema.parse({
    publicationId: publication.id,
    kind,
    sourceRevision: publication.sourceRevision,
    publisherActorRef: row.publisherActorRef,
    snapshotHash: canonicalCampaignHash(row.publication.snapshot),
    publicUrl: `${origin}/f/${publication.id}`,
    publishedAt: publication.createdAt,
    expiresAt: publication.expiresAt,
    eventStartsAt: kind === "live-webinar" ? fields.eventStartsAt : null,
  });
  if (
    row.frozenDestination !== null &&
    canonicalCampaignHash(WebinarDestinationSchema.parse(row.frozenDestination)) !==
      canonicalCampaignHash(destination)
  )
    throw new WebinarDestinationError(409, "DESTINATION_CHANGED");
  return destination;
}
function validatedChoice(
  row: WebinarPublicationRow,
  environment: unknown,
  now: Date,
): WebinarDestinationChoice {
  const destination = validatedWebinarDestination(row, environment, now);
  const { fields } = PublishedFunnelSchema.parse(row.publication).snapshot;
  return { destination, title: fields.headline, learningSummary: fields.description || null };
}

function repository(principal: Readonly<AuthenticatedPrincipal>, environment: unknown) {
  if (principal.authenticationMode === "local_synthetic")
    throw new WebinarDestinationError(403, "DESTINATION_NOT_ACCESSIBLE");
  return createWebinarPublicationRepository(
    campaignDatabasePool(environment),
    principal,
    workspaceCorrelationReferenceFor(principal),
  );
}
export async function listOwnWebinarDestinations(
  principal: Readonly<AuthenticatedPrincipal>,
  environment: unknown,
  now = new Date(),
): Promise<readonly WebinarDestination[]> {
  return (await listOwnWebinarChoices(principal, environment, now)).map(
    (choice) => choice.destination,
  );
}
export async function listOwnWebinarChoices(
  principal: Readonly<AuthenticatedPrincipal>,
  environment: unknown,
  now = new Date(),
): Promise<readonly WebinarDestinationChoice[]> {
  publicFunnelConfig(environment);
  const rows = await repository(principal, environment).listOwned();
  return rows.flatMap((row) => {
    try {
      return [validatedChoice(row, environment, now)];
    } catch (error) {
      if (
        error instanceof WebinarDestinationError &&
        (error.status === 409 || error.status === 422)
      )
        return [];
      throw error;
    }
  });
}
export async function resolveOwnWebinarDestination(
  principal: Readonly<AuthenticatedPrincipal>,
  publicationId: string,
  environment: unknown,
  now = new Date(),
): Promise<WebinarDestination> {
  publicFunnelConfig(environment);
  const row = await repository(principal, environment).owned(publicationId);
  if (!row) throw new WebinarDestinationError(404, "DESTINATION_NOT_ACCESSIBLE");
  return validatedWebinarDestination(row, environment, now);
}
export async function resolveCampaignWebinarDestination(
  principal: Readonly<AuthenticatedPrincipal>,
  campaignRef: string,
  campaignVersionRef: string,
  environment: unknown,
  now = new Date(),
): Promise<WebinarDestination> {
  return (
    await resolveCampaignWebinarChoice(principal, campaignRef, campaignVersionRef, environment, now)
  ).destination;
}
export async function resolveCampaignWebinarChoice(
  principal: Readonly<AuthenticatedPrincipal>,
  campaignRef: string,
  campaignVersionRef: string,
  environment: unknown,
  now = new Date(),
): Promise<WebinarDestinationChoice> {
  publicFunnelConfig(environment);
  const row = await repository(principal, environment).forVersion(campaignRef, campaignVersionRef);
  if (!row) throw new WebinarDestinationError(409, "DESTINATION_CHANGED");
  return validatedChoice(row, environment, now);
}
export async function readCampaignWebinarLabels(
  principal: Readonly<AuthenticatedPrincipal>,
  campaignRef: string,
  campaignVersionRef: string,
  environment: unknown,
): Promise<WebinarHistoricalLabels> {
  const row = await repository(principal, environment).historicalForVersion(
    campaignRef,
    campaignVersionRef,
  );
  if (!row) throw new WebinarDestinationError(404, "DESTINATION_NOT_ACCESSIBLE");
  return validatedHistoricalWebinarLabels(row);
}
