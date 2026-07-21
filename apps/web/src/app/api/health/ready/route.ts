import { parseRuntimeEnvironment, type RuntimeEnvironment } from "@oalo/config";

import {
  productionReadinessRuntime,
  type ProductionDependencyProbeResult,
} from "../../../../server/production-readiness-runtime.js";

export type ReadinessCheckCode =
  | "READY"
  | "CONFIGURATION_INVALID"
  | "RELEASE_MANIFEST_INVALID"
  | "DEPENDENCY_PROBES_NOT_CONFIGURED"
  | "DEPENDENCY_DEGRADED"
  | "DEPENDENCY_UNAVAILABLE";

export interface ReadinessCheck {
  readonly name: string;
  readonly ready: boolean;
  readonly code: ReadinessCheckCode;
}

export interface ReadinessSummary {
  readonly status: "ready" | "degraded" | "unavailable";
  readonly checks: readonly ReadinessCheck[];
}

const SafeCheckNamePattern = /^[a-z][a-z0-9-]{1,63}$/u;
const SafeCheckCodes = new Set<ReadinessCheckCode>([
  "READY",
  "CONFIGURATION_INVALID",
  "RELEASE_MANIFEST_INVALID",
  "DEPENDENCY_PROBES_NOT_CONFIGURED",
  "DEPENDENCY_DEGRADED",
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
    status: checks.every((check) => check.ready)
      ? "ready"
      : checks.some((check) => !check.ready && check.code !== "DEPENDENCY_DEGRADED")
        ? "unavailable"
        : "degraded",
    checks: Object.freeze(checks.map((check) => Object.freeze({ ...check }))),
  });
}

export function dependencyReadinessChecks(
  result: ProductionDependencyProbeResult,
): readonly ReadinessCheck[] {
  return Object.freeze([
    {
      name: "database",
      ready: result.database === "ready",
      code: result.database === "ready" ? "READY" : "DEPENDENCY_UNAVAILABLE",
    },
    {
      name: "highlevel",
      ready: result.highLevel === "ready",
      code: result.highLevel === "ready" ? "READY" : "DEPENDENCY_DEGRADED",
    },
    {
      name: "ai-provider",
      ready: result.ai === "ready",
      code: result.ai === "ready" ? "READY" : "DEPENDENCY_DEGRADED",
    },
    {
      name: "object-store",
      ready: result.objectStore === "ready",
      code: result.objectStore === "ready" ? "READY" : "DEPENDENCY_UNAVAILABLE",
    },
  ]);
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

export async function GET(): Promise<Response> {
  let summary: ReadinessSummary;
  try {
    const environment = parseRuntimeEnvironment(process.env);
    summary =
      environment.environment === "local"
        ? evaluateEnvironmentReadiness(environment)
        : evaluateEnvironmentReadiness(
            environment,
            dependencyReadinessChecks(await productionReadinessRuntime(process.env).probe()),
          );
  } catch {
    summary = aggregateReadiness([
      { name: "configuration", ready: false, code: "CONFIGURATION_INVALID" },
    ]);
  }

  return Response.json(summary, {
    status: summary.status === "unavailable" ? 503 : 200,
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
