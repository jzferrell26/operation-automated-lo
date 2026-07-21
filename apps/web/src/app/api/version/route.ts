import { getFoundationSnapshot } from "@oalo/application";
import { parseRuntimeEnvironment } from "@oalo/config";

export function versionEvidenceForEnvironment(input: unknown) {
  const environment = parseRuntimeEnvironment(input);
  const foundation = getFoundationSnapshot();

  return Object.freeze({
    environment: environment.environment,
    buildId: environment.buildId,
    commit: environment.buildCommit,
    contractVersion: foundation.contractVersion,
    phase: foundation.phase,
    releaseVersions: environment.releaseManifest?.versions ?? null,
  });
}

export function GET(): Response {
  return Response.json(versionEvidenceForEnvironment(process.env), {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
