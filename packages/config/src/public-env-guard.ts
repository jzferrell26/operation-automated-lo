/**
 * Server-only credentials and secret payloads. These names must never appear on
 * the NEXT_PUBLIC allowlist or be assigned into a NEXT_PUBLIC variable.
 */
export const SERVER_ONLY_SECRET_ENVIRONMENT_VARIABLE_NAMES = Object.freeze([
  "OALO_DATABASE_URL",
  "OALO_ANTHROPIC_API_KEY",
  "OALO_R2_ACCESS_KEY_ID",
  "OALO_R2_SECRET_ACCESS_KEY",
  "OALO_GHL_LOCATION_PIT_JSON",
  "OALO_TASK_AUTHORITY_HMAC_KEY",
  "OALO_PUBLICATION_CLEANUP_SCHEDULE_AUTHORITY_JSON",
] as const);

export type ServerOnlySecretEnvironmentVariableName =
  (typeof SERVER_ONLY_SECRET_ENVIRONMENT_VARIABLE_NAMES)[number];

const SECRET_BEARING_SEGMENT_PATTERNS: readonly RegExp[] = [
  /DATABASE/u,
  /SECRET/u,
  /TOKEN/u,
  /PRIVATE/u,
  /PASSWORD/u,
  /CREDENTIAL/u,
  /(?:^KEY$|_KEY$|^KEY_|_KEY_)/u,
];

function publicVariableBaseName(name: string): string {
  return name.startsWith("NEXT_PUBLIC_") ? name.slice("NEXT_PUBLIC_".length) : name;
}

function segmentBearsSecret(segment: string): boolean {
  return SECRET_BEARING_SEGMENT_PATTERNS.some((pattern) => pattern.test(segment));
}

function nameBearsSecret(name: string): boolean {
  const baseName = publicVariableBaseName(name);
  return baseName.split("_").some((segment) => segment.length > 0 && segmentBearsSecret(segment));
}

function forbiddenPublicName(publicName: string): string | undefined {
  if (!publicName.startsWith("NEXT_PUBLIC_")) {
    return `Public environment variable must use NEXT_PUBLIC_ prefix: ${publicName}`;
  }

  if (nameBearsSecret(publicName)) {
    return `Public environment variable name bears a secret-bearing segment: ${publicName}`;
  }

  for (const secretName of SERVER_ONLY_SECRET_ENVIRONMENT_VARIABLE_NAMES) {
    if (publicName === `NEXT_PUBLIC_${secretName}`) {
      return `Public environment variable must not mirror server-only secret ${secretName}: ${publicName}`;
    }
  }

  return undefined;
}

export function collectPublicAllowlistViolations(allowlist: readonly string[]): readonly string[] {
  const violations: string[] = [];

  for (const name of allowlist) {
    const violation = forbiddenPublicName(name);
    if (violation !== undefined) {
      violations.push(violation);
    }
  }

  for (const secretName of SERVER_ONLY_SECRET_ENVIRONMENT_VARIABLE_NAMES) {
    const mirrored = `NEXT_PUBLIC_${secretName}`;
    if (allowlist.includes(mirrored)) {
      violations.push(
        `Public environment variable must not mirror server-only secret ${secretName}: ${mirrored}`,
      );
    }
  }

  return violations;
}

export function assertPublicEnvironmentAllowlistSecure(allowlist: readonly string[]): void {
  const violations = collectPublicAllowlistViolations(allowlist);
  if (violations.length > 0) {
    throw new Error(
      `Public environment allowlist violates secret boundary:\n${violations.join("\n")}`,
    );
  }
}

function assignmentPatternsForSecret(secretName: string): readonly RegExp[] {
  const escapedSecret = secretName.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  return [
    new RegExp(
      String.raw`process\.env\.(NEXT_PUBLIC_[A-Z0-9_]+)\s*=\s*[^\n;]*process\.env\.${escapedSecret}\b`,
      "u",
    ),
    new RegExp(
      String.raw`process\.env\[\s*"(NEXT_PUBLIC_[^"]+)"\s*\]\s*=\s*[^\n;]*process\.env\[\s*"${escapedSecret}"\s*\]`,
      "u",
    ),
    new RegExp(
      String.raw`(NEXT_PUBLIC_[A-Z0-9_]+)\s*:\s*[^\n,}]*process\.env\.${escapedSecret}\b`,
      "u",
    ),
    new RegExp(
      String.raw`(NEXT_PUBLIC_[A-Z0-9_]+)\s*:\s*[^\n,}]*process\.env\[\s*"${escapedSecret}"\s*\]`,
      "u",
    ),
    new RegExp(
      String.raw`process\.env\.(NEXT_PUBLIC_[A-Z0-9_]+)\s*=\s*[^\n;]*\b${escapedSecret}\b`,
      "u",
    ),
  ];
}

const assignmentPatterns = SERVER_ONLY_SECRET_ENVIRONMENT_VARIABLE_NAMES.flatMap(
  assignmentPatternsForSecret,
);

export function collectAssignmentViolationsInSource(input: {
  readonly filePath: string;
  readonly source: string;
}): readonly string[] {
  const violations: string[] = [];

  for (const pattern of assignmentPatterns) {
    pattern.lastIndex = 0;
    if (pattern.test(input.source)) {
      violations.push(
        `${input.filePath} assigns or maps a server-only secret into a NEXT_PUBLIC variable (${pattern.source})`,
      );
    }
  }

  return violations;
}

export function collectPublicSecretAssignmentViolationsInSources(
  sources: readonly Readonly<{ filePath: string; source: string }>[],
): readonly string[] {
  const violations: string[] = [];

  for (const entry of sources) {
    if (entry.filePath.endsWith("/public-env-guard.ts")) {
      continue;
    }
    violations.push(...collectAssignmentViolationsInSource(entry));
  }

  return violations;
}
