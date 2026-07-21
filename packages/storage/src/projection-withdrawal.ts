import {
  PublishedCampaignProjectionSchema,
  type PublishedCampaignProjection,
} from "@oalo/contracts";

export interface ProjectionWithdrawalRecord {
  readonly schemaVersion: 1;
  readonly withdrawalRef: string;
  readonly publicCampaignId: string;
  readonly campaignVersionRef: string;
  readonly actorRef: string;
  readonly projection: PublishedCampaignProjection;
  readonly withdrawnAt: string;
}

function assertOpaqueReference(value: unknown, label: string): string {
  if (
    typeof value !== "string" ||
    value.length < 8 ||
    value.length > 128 ||
    !/^[a-z][a-z0-9]*(?:_[A-Za-z0-9]+)+$/u.test(value)
  ) {
    throw new Error(`${label} must be an opaque reference`);
  }
  return value;
}

function deepFreeze(value: unknown): void {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) return;
  for (const child of Object.values(value)) deepFreeze(child);
  Object.freeze(value);
}

export interface ProjectionWithdrawalAuditPort {
  withdrawAndAppendAudit(
    input: Readonly<{
      projection: PublishedCampaignProjection;
      record: ProjectionWithdrawalRecord;
    }>,
  ): Promise<void>;
}

export async function withdrawProjectionWithAudit(
  untrustedProjection: unknown,
  actorRef: unknown,
  withdrawnAt: Date,
  port: ProjectionWithdrawalAuditPort,
): Promise<ProjectionWithdrawalRecord> {
  const projection = PublishedCampaignProjectionSchema.parse(untrustedProjection);
  deepFreeze(projection);
  const actor = assertOpaqueReference(actorRef, "actorRef");
  const publicIdSegment = projection.publicCampaignId.replaceAll(/[^A-Za-z0-9]/gu, "").slice(0, 16);
  const record: ProjectionWithdrawalRecord = Object.freeze({
    schemaVersion: 1,
    withdrawalRef: `withdrawal_${withdrawnAt.getTime().toString(36)}_${publicIdSegment}`,
    publicCampaignId: projection.publicCampaignId,
    campaignVersionRef: projection.campaignVersionRef,
    actorRef: actor,
    projection,
    withdrawnAt: withdrawnAt.toISOString(),
  });
  await port.withdrawAndAppendAudit({ projection, record });
  return record;
}
