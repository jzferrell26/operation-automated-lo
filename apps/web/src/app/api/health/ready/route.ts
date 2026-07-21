import { parseRuntimeEnvironment, type RuntimeEnvironment } from "@oalo/config";

export type ReadinessCheckCode =
  | "READY"
  | "CONFIGURATION_INVALID"
  | "RELEASE_MANIFEST_INVALID"
  | "DEPENDENCY_PROBES_NOT_CONFIGURED"
  | "DEPENDENCY_UNAVAILABLE";

export interface ReadinessCheck {
  readonly name: string;
  readonly ready: boolean;
  readonly code: ReadinessCheckCode;
}

export interface ReadinessSummary {
  readonly status: "ready" | "not-ready";
  readonly checks: readonly ReadinessCheck[];
}

const SafeCheckNamePattern = /^[a-z][a-z0-9-]{1,63}$/u;
const SafeCheckCodes = new Set<ReadinessCheckCode>([
  "READY",
  "CONFIGURATION_INVALID",
  "RELEASE_MANIFEST_INVALID",
  "DEPENDENCY_PROBES_NOT_CONFIGURED",
  "DEPENDENCY_UNAVAILABLE",
]);

export function aggregateReadiness(checks: readonly ReadinessCheck[]): ReadinessSummary {
  if (checks.length === 0) {
    throw new Error("At least one readiness check is required");
  }

  for (const check of checks) {
    if (!SafeCheckNamePattern.test(check.name) || !SafeCheckCodes.has(check.code)) {
      throw new Error("Readiness check output is invalid");
    }
  }

  return Object.freeze({
    status: checks.every((check) => check.ready) ? "ready" : "not-ready",
    checks: Object.freeze(checks.map((check) => Object.freeze({ ...check }))),
  });
}

export function evaluateEnvironmentReadiness(
  environment: RuntimeEnvironment,
  dependencyChecks: readonly ReadinessCheck[] = [],
): ReadinessSummary {
  const checks: ReadinessCheck[] = [
    { name: "configuration", ready: true, code: "READY" },
    environment.environment === "local" || environment.releaseManifest !== undefined
      ? { name: "release-manifest", ready: true, code: "READY" }
      : { name: "release-manifest", ready: false, code: "RELEASE_MANIFEST_INVALID" },
  ];

  if (environment.environment !== "local" && dependencyChecks.length === 0) {
    checks.push({
      name: "external-dependencies",
      ready: false,
      code: "DEPENDENCY_PROBES_NOT_CONFIGURED",
    });
  } else {
    checks.push(...dependencyChecks);
  }

  return aggregateReadiness(checks);
}

export function evaluateRuntimeReadiness(
  input: unknown,
  dependencyChecks: readonly ReadinessCheck[] = [],
): ReadinessSummary {
  try {
    return evaluateEnvironmentReadiness(parseRuntimeEnvironment(input), dependencyChecks);
  } catch {
    return aggregateReadiness([
      { name: "configuration", ready: false, code: "CONFIGURATION_INVALID" },
    ]);
  }
}

export function GET(): Response {
  const summary = evaluateRuntimeReadiness(process.env);

  return Response.json(summary, {
    status: summary.status === "ready" ? 200 : 503,
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
