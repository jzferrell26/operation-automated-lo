import { buildLocalApprovalEvidence } from "../../../apps/web/src/features/ui-foundation/evidence/approval-evidence.js";

export type ApprovalEvidenceSnapshot = Readonly<{
  approvalId: string;
  artifactIds: readonly string[];
  bytesHex: string;
  campaignId: string;
  manifestId: string;
  sha256: string;
}>;

export function readApprovalEvidenceSnapshot(): ApprovalEvidenceSnapshot {
  const evidence = buildLocalApprovalEvidence();

  return Object.freeze({
    approvalId: evidence.approval.approvalId,
    artifactIds: Object.freeze(
      evidence.artifactManifest.artifacts.map((artifact) => artifact.artifactId),
    ),
    bytesHex: Buffer.from(evidence.canonicalApprovalBytes).toString("hex"),
    campaignId: evidence.campaignInput.campaignId,
    manifestId: evidence.artifactManifest.manifestId,
    sha256: evidence.sha256,
  });
}
