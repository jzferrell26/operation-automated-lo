import { getFoundationSnapshot } from "@oalo/application";
import { parsePhaseZeroEnvironment } from "@oalo/config";

export function GET(): Response {
  const environment = parsePhaseZeroEnvironment(process.env);
  const foundation = getFoundationSnapshot();

  return Response.json({
    buildId: environment.OALO_BUILD_ID,
    commit: environment.OALO_BUILD_COMMIT,
    contractVersion: foundation.contractVersion,
    phase: foundation.phase,
  });
}
