import { randomUUID } from "node:crypto";
import { prepareFinancingRelease, transitionFinancingRelease } from "@oalo/application";
import {
  PostgresFinancingReleaseRepository,
  admitVerifiedFinancingEvidence,
  createPostgresCampaignVersionRepository,
} from "../dist/index.js";
import {
  sourceEvidence,
  admissionFixture,
  prepareRequest,
  releasePorts,
  cryptoFixture,
} from "./financing-release-fixture.mjs";

// Shared synthetic publication setup; each caller still owns its exact tenant cleanup.
export async function publishFinancingTestSource({ pool, tenant, principal, source }) {
  await createPostgresCampaignVersionRepository(pool, {
    resolveTenantDatabaseContext: async () => tenant,
  }).run((tx) => tx.append(source.sourceVersion));
  for (const [kind, proof] of sourceEvidence(source))
    await admitVerifiedFinancingEvidence(pool, admissionFixture(tenant.locationId, kind, proof));
  const owner = new PostgresFinancingReleaseRepository(
    pool,
    principal,
    tenant.correlationId,
    cryptoFixture(),
  );
  await owner.saveSource(source);
  const ports = releasePorts(owner, source);
  const appPrincipal = { actorRef: principal.actorRef, locationRef: principal.locationRef };
  let record = await prepareFinancingRelease(prepareRequest(source), appPrincipal, ports);
  for (const action of ["approve", "publish"])
    record = await transitionFinancingRelease(
      action,
      {
        requestId: randomUUID(),
        releaseRef: record.snapshot.releaseRef,
        expectedRevision: record.revision,
        expectedBundleHash: record.snapshot.bundleHash,
        expectedEvidenceHash: record.snapshot.evidenceHash,
      },
      appPrincipal,
      ports,
    );
  return { owner, ports, record };
}
