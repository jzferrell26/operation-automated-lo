import { getFoundationSnapshot } from "@oalo/application";

export function GET(): Response {
  const foundation = getFoundationSnapshot();
  return Response.json({
    status: "ok",
    phase: foundation.phase,
    productionTrafficEnabled: foundation.productionTrafficEnabled,
  });
}
