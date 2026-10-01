import { parseRuntimeEnvironment } from "@oalo/config";

/**
 * PRD-008a D4 (008A-AC-019, amending 005E-AC-003). The route takes no request and resolves no
 * principal, so whatever it returns it returns to every caller. It therefore returns only what the
 * deployed proof reads (005E-AC-004): the environment, the build id that identifies the
 * deployment, and the commit. The contract version, the phase, and the release manifest's
 * versions are no longer returned; the environment, manifest included, is still parsed and
 * validated in full, so a broken configuration still answers the handled 503 below.
 */
export function versionEvidenceForEnvironment(input: unknown) {
  const environment = parseRuntimeEnvironment(input);

  return Object.freeze({
    environment: environment.environment,
    buildId: environment.buildId,
    commit: environment.buildCommit,
  });
}

export function GET(): Response {
  try {
    return Response.json(versionEvidenceForEnvironment(process.env), {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch {
    return Response.json(
      { status: "unavailable", code: "CONFIGURATION_INVALID" },
      {
        status: 503,
        headers: { "Cache-Control": "no-store, max-age=0" },
      },
    );
  }
}
