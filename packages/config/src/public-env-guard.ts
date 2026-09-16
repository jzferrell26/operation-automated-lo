/**
 * Server-only credentials and secret payloads. These names must never appear on
 * the NEXT_PUBLIC allowlist or be assigned into a NEXT_PUBLIC variable.
 */
export const SERVER_ONLY_SECRET_ENVIRONMENT_VARIABLE_NAMES = Object.freeze([
  "OALO_DATABASE_URL",
  "OALO_TEST_DATABASE_URL",
  "OALO_ANTHROPIC_API_KEY",
  "OALO_R2_ACCESS_KEY_ID",
  "OALO_R2_SECRET_ACCESS_KEY",
  "OALO_GHL_LOCATION_PIT_JSON",
  "OALO_TASK_AUTHORITY_HMAC_KEY",
  "OALO_PUBLICATION_CLEANUP_SCHEDULE_AUTHORITY_JSON",
] as const);

export type ServerOnlySecretEnvironmentVariableName =
  (typeof SERVER_ONLY_SECRET_ENVIRONMENT_VARIABLE_NAMES)[number];

const PUBLIC_PREFIX = "NEXT_PUBLIC_";

/**
 * The closed set of value shapes a human reviewer has accepted as safe to ship to every browser.
 * Approving a variable whose value is not one of these shapes requires widening this union, which
 * is a typed, reviewable change rather than a string edit.
 */
export const BROWSER_PUBLICATION_VALUE_CLASSES = Object.freeze([
  "deployment-environment-label",
  "public-application-url",
  "build-identifier",
] as const);

export type BrowserPublicationValueClass = (typeof BROWSER_PUBLICATION_VALUE_CLASSES)[number];

export interface BrowserPublicationApproval {
  /** The `NEXT_PUBLIC_*` name approved for browser publication. */
  readonly name: string;
  /** Which reviewed value shape this variable carries. */
  readonly valueClass: BrowserPublicationValueClass;
  /** The server-side variable this public value mirrors. Must not be a server-only secret. */
  readonly serverCounterpart: string;
  /** Why publishing this value to every browser is acceptable. */
  readonly rationale: string;
}

/**
 * The browser-publication trust boundary: a positive review gate, not a pattern denylist.
 *
 * `PUBLIC_ENVIRONMENT_VARIABLE_NAMES` (`./environment.ts`) is the *operational* list of names the
 * runtime will read and forward. This registry is the *reviewed* list of names a human accepted for
 * publication into every browser. A variable reaches a browser only when it appears in both, and the
 * two lists live in different modules on purpose: widening the operational list alone fails closed
 * here, and widening this registry alone publishes nothing. Never derive one from the other, because
 * derivation would collapse two independent reviews back into a single edit.
 *
 * Because the gate is membership in this registry, a newly invented public name is rejected however
 * it is spelled: `NEXT_PUBLIC_OALO_CONN`, `NEXT_PUBLIC_PG_URL`, and
 * `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE` all fail without appearing in any pattern list. The name
 * patterns below remain as defence in depth over an already-approved entry, never as the primary
 * control.
 */
export const BROWSER_PUBLICATION_APPROVALS: readonly BrowserPublicationApproval[] = Object.freeze([
  Object.freeze({
    name: "NEXT_PUBLIC_OALO_ENVIRONMENT",
    valueClass: "deployment-environment-label",
    serverCounterpart: "OALO_ENVIRONMENT",
    rationale:
      "Deployment tier label (local, preview, staging, production). Already inferable from the host name and carries no credential.",
  }),
  Object.freeze({
    name: "NEXT_PUBLIC_OALO_APP_URL",
    valueClass: "public-application-url",
    serverCounterpart: "OALO_APP_URL",
    rationale:
      "The origin the browser is already talking to. Required client-side to build absolute links.",
  }),
  Object.freeze({
    name: "NEXT_PUBLIC_OALO_BUILD_ID",
    valueClass: "build-identifier",
    serverCounterpart: "OALO_BUILD_ID",
    rationale:
      "Opaque build identifier used to correlate client error reports with a release. Confers no access.",
  }),
]);

/**
 * Matched against the whole name rather than underscore-delimited segments, because compound
 * spellings (`APIKEY`, `SIGNINGKEY`) carry credentials just as readily as `ACCESS_KEY` does and
 * a segment-boundary check cannot see them. This list is defence in depth on top of the review
 * registry above: it exists to catch a reviewer approving an obviously secret-bearing name, not to
 * decide which names are publishable.
 */
const SECRET_BEARING_NAME_PATTERNS: readonly RegExp[] = [
  /AUTH/u,
  /BEARER/u,
  /CERT/u,
  /CREDENTIAL/u,
  /DATABASE/u,
  /DSN/u,
  /HMAC/u,
  /KEY/u,
  /PASS/u,
  /PIT/u,
  /PRIVATE/u,
  /SALT/u,
  /SECRET/u,
  /SESSION/u,
  /SIGNATURE/u,
  /SIGNING/u,
  /TOKEN/u,
];

const serverOnlySecretNames: ReadonlySet<string> = new Set<string>(
  SERVER_ONLY_SECRET_ENVIRONMENT_VARIABLE_NAMES,
);
const browserPublicationValueClasses: ReadonlySet<string> = new Set<string>(
  BROWSER_PUBLICATION_VALUE_CLASSES,
);
const approvedPublicationNames: ReadonlySet<string> = new Set<string>(
  BROWSER_PUBLICATION_APPROVALS.map((approval) => approval.name),
);

function publicVariableBaseName(name: string): string {
  return name.startsWith(PUBLIC_PREFIX) ? name.slice(PUBLIC_PREFIX.length) : name;
}

function nameBearsSecret(name: string): boolean {
  const baseName = publicVariableBaseName(name);
  return SECRET_BEARING_NAME_PATTERNS.some((pattern) => pattern.test(baseName));
}

function mirroredServerOnlySecret(publicName: string): string | undefined {
  return SERVER_ONLY_SECRET_ENVIRONMENT_VARIABLE_NAMES.find(
    (secretName) => publicName === `${PUBLIC_PREFIX}${secretName}`,
  );
}

/**
 * Validates the review registry itself, so a careless widening of the reviewed set cannot quietly
 * become a widening of the trust boundary.
 */
function collectApprovalRegistryViolations(): readonly string[] {
  const violations: string[] = [];
  const seenNames = new Set<string>();

  for (const approval of BROWSER_PUBLICATION_APPROVALS) {
    if (!approval.name.startsWith(PUBLIC_PREFIX)) {
      violations.push(
        `Browser-publication approval must use NEXT_PUBLIC_ prefix: ${approval.name}`,
      );
    }

    if (seenNames.has(approval.name)) {
      violations.push(`Browser-publication approval is duplicated: ${approval.name}`);
    }
    seenNames.add(approval.name);

    if (!browserPublicationValueClasses.has(approval.valueClass)) {
      violations.push(
        `Browser-publication approval declares an unreviewed value class: ${approval.name} (${approval.valueClass})`,
      );
    }

    if (approval.rationale.trim().length === 0) {
      violations.push(
        `Browser-publication approval must state why the value is browser-safe: ${approval.name}`,
      );
    }

    if (approval.serverCounterpart.trim().length === 0) {
      violations.push(
        `Browser-publication approval must name the server variable it mirrors: ${approval.name}`,
      );
    }

    if (serverOnlySecretNames.has(approval.serverCounterpart)) {
      violations.push(
        `Browser-publication approval mirrors server-only secret ${approval.serverCounterpart}: ${approval.name}`,
      );
    }

    if (nameBearsSecret(approval.serverCounterpart)) {
      violations.push(
        `Browser-publication approval mirrors a secret-bearing server variable ${approval.serverCounterpart}: ${approval.name}`,
      );
    }
  }

  return violations;
}

function collectPublicNameViolations(publicName: string): readonly string[] {
  const violations: string[] = [];

  if (!publicName.startsWith(PUBLIC_PREFIX)) {
    violations.push(`Public environment variable must use NEXT_PUBLIC_ prefix: ${publicName}`);
  }

  if (!approvedPublicationNames.has(publicName)) {
    violations.push(
      `Public environment variable is not in the reviewed browser-publication registry: ${publicName}`,
    );
  }

  if (nameBearsSecret(publicName)) {
    violations.push(
      `Public environment variable name bears a secret-bearing segment: ${publicName}`,
    );
  }

  const mirroredSecret = mirroredServerOnlySecret(publicName);
  if (mirroredSecret !== undefined) {
    violations.push(
      `Public environment variable must not mirror server-only secret ${mirroredSecret}: ${publicName}`,
    );
  }

  return violations;
}

export function collectPublicAllowlistViolations(allowlist: readonly string[]): readonly string[] {
  const violations: string[] = [...collectApprovalRegistryViolations()];

  for (const name of allowlist) {
    violations.push(...collectPublicNameViolations(name));
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

/**
 * Quote characters a source file can wrap a `process.env` key in. Each is a literal character in a
 * regular expression, so none needs escaping. The backtick is spelled as an escape so it can be
 * interpolated into template literals below without terminating them.
 */
const KEY_QUOTE_CHARACTERS: readonly string[] = ['"', "'", "\u0060"];

const PUBLIC_NAME_BODY = String.raw`NEXT_PUBLIC_[A-Z0-9_]+`;
const IDENTIFIER_BODY = String.raw`[A-Za-z_$][A-Za-z0-9_$]*`;

/**
 * A value mention is searched inside a bounded window rather than a single line, so wrapping an
 * assignment across lines (as a formatter will do for long expressions) does not evade the scan.
 */
const ASSIGNMENT_WINDOW = String.raw`[^;]{0,200}`;
const PROPERTY_WINDOW = String.raw`[^,};]{0,200}`;

function escapeForRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function quotedAlternatives(body: string): string {
  return KEY_QUOTE_CHARACTERS.map((quote) => `${quote}(?:${body})${quote}`).join("|");
}

/** `process.env.NAME`, `process.env["NAME"]`, `process.env['NAME']`, and the backtick form. */
function environmentMemberPattern(body: string): string {
  return String.raw`process\.env(?:\.(?:${body})\b|\[\s*(?:${quotedAlternatives(body)})\s*\])`;
}

/** An object-literal key naming a public variable, quoted, bare, or computed. */
function propertyKeyPattern(body: string): string {
  return String.raw`(?:(?:${body})|${quotedAlternatives(body)}|\[\s*(?:${quotedAlternatives(body)})\s*\])`;
}

const publicEnvironmentTarget = environmentMemberPattern(PUBLIC_NAME_BODY);
const publicPropertyKey = propertyKeyPattern(PUBLIC_NAME_BODY);

/**
 * Every syntactic way this repository can move a value into a public variable: assignment onto
 * `process.env`, or a public key in an object literal that is later spread into the environment.
 */
function publicSinkPatterns(escapedValueName: string): readonly RegExp[] {
  const mention = String.raw`\b${escapedValueName}\b`;
  return [
    new RegExp(String.raw`${publicEnvironmentTarget}\s*=\s*${ASSIGNMENT_WINDOW}${mention}`, "u"),
    new RegExp(String.raw`${publicPropertyKey}\s*:\s*${PROPERTY_WINDOW}${mention}`, "u"),
  ];
}

/**
 * Bindings that hold a server-only secret and could therefore be published under another name:
 * a declaration whose initialiser mentions the secret, or a renamed destructure of it.
 */
function aliasDeclarationPatterns(escapedSecretName: string): readonly RegExp[] {
  return [
    new RegExp(
      String.raw`(?:const|let|var)\s+(${IDENTIFIER_BODY})\s*(?::[^=\n]*)?=\s*[^;\n]*\b${escapedSecretName}\b`,
      "gu",
    ),
    new RegExp(
      String.raw`(?:const|let|var)\s*\{[^}\n]*\b${escapedSecretName}\b\s*:\s*(${IDENTIFIER_BODY})`,
      "gu",
    ),
  ];
}

interface SecretScanPatterns {
  readonly secretName: string;
  readonly directSinks: readonly RegExp[];
  readonly aliasDeclarations: readonly RegExp[];
}

const secretScanPatterns: readonly SecretScanPatterns[] =
  SERVER_ONLY_SECRET_ENVIRONMENT_VARIABLE_NAMES.map((secretName) => {
    const escapedSecretName = escapeForRegExp(secretName);
    return {
      secretName,
      directSinks: publicSinkPatterns(escapedSecretName),
      aliasDeclarations: aliasDeclarationPatterns(escapedSecretName),
    };
  });

function aliasBindingNames(source: string, patterns: readonly RegExp[]): readonly string[] {
  const names = new Set<string>();

  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      const binding = match[1];
      if (binding !== undefined) {
        names.add(binding);
      }
    }
  }

  return [...names];
}

/**
 * Textual, single-hop detection of secrets crossing into public variables.
 *
 * KNOWN LIMITATION, by design: this is a regular-expression scan, so it sees only one level of
 * indirection inside one file. A value laundered through two or more bindings, through a function
 * parameter or return value, through a re-export from another module, or through a computed name
 * assembled at runtime will NOT be detected here. The primary defence against a secret reaching a
 * browser is therefore the review registry above (`BROWSER_PUBLICATION_APPROVALS`), which fails
 * closed on the *destination* name regardless of where the value came from; this scan is a
 * supporting check on the *source* of the value. Closing the remaining indirection classes needs
 * real dataflow analysis over the type-checked program, not a longer pattern list. See
 * `docs/production-environments.md`.
 */
export function collectAssignmentViolationsInSource(input: {
  readonly filePath: string;
  readonly source: string;
}): readonly string[] {
  const violations: string[] = [];

  for (const { secretName, directSinks, aliasDeclarations } of secretScanPatterns) {
    for (const pattern of directSinks) {
      if (pattern.test(input.source)) {
        violations.push(
          `${input.filePath} assigns or maps a server-only secret into a NEXT_PUBLIC variable (${pattern.source})`,
        );
      }
    }

    for (const binding of aliasBindingNames(input.source, aliasDeclarations)) {
      const aliasSinks = publicSinkPatterns(escapeForRegExp(binding));
      if (aliasSinks.some((pattern) => pattern.test(input.source))) {
        violations.push(
          `${input.filePath} assigns or maps a server-only secret into a NEXT_PUBLIC variable via the intermediate binding ${binding} (${secretName})`,
        );
      }
    }
  }

  return violations;
}

/**
 * This module is the only file exempt from its own scan, because it necessarily spells every
 * server-only secret name next to `NEXT_PUBLIC_` patterns. The exemption is the one exact
 * workspace-relative path rather than a filename suffix: a suffix match would silently exempt any
 * new file someone happened to name `public-env-guard.ts`, turning the scan off for that file.
 */
const SCAN_EXEMPT_FILE_PATHS: ReadonlySet<string> = new Set([
  "packages/config/src/public-env-guard.ts",
]);

function isScanExempt(filePath: string): boolean {
  return SCAN_EXEMPT_FILE_PATHS.has(filePath.replaceAll("\\", "/"));
}

export function collectPublicSecretAssignmentViolationsInSources(
  sources: readonly Readonly<{ filePath: string; source: string }>[],
): readonly string[] {
  const violations: string[] = [];

  for (const entry of sources) {
    if (isScanExempt(entry.filePath)) {
      continue;
    }
    violations.push(...collectAssignmentViolationsInSource(entry));
  }

  return violations;
}
