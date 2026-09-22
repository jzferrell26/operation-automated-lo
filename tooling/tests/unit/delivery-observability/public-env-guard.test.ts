import {
  BROWSER_PUBLICATION_APPROVALS,
  BROWSER_PUBLICATION_VALUE_CLASSES,
  PUBLIC_ENVIRONMENT_VARIABLE_NAMES,
  SERVER_ONLY_SECRET_ENVIRONMENT_VARIABLE_NAMES,
  assertPublicEnvironmentAllowlistSecure,
  collectAssignmentViolationsInSource,
  collectPublicAllowlistViolations,
  collectPublicSecretAssignmentViolationsInSources,
} from "@oalo/config";
import { describe, expect, it } from "vitest";

const SINGLE_QUOTE = "'";
const BACKTICK = "\u0060";

function assignmentSource(source: string): { readonly filePath: string; readonly source: string } {
  return { filePath: "synthetic/violating-bridge.ts", source };
}

describe("public environment secret boundary", () => {
  it("accepts the canonical public allowlist", () => {
    expect(() =>
      assertPublicEnvironmentAllowlistSecure(PUBLIC_ENVIRONMENT_VARIABLE_NAMES),
    ).not.toThrow();
    expect(collectPublicAllowlistViolations(PUBLIC_ENVIRONMENT_VARIABLE_NAMES)).toEqual([]);
  });

  it("rejects a secret-bearing name on the public allowlist", () => {
    const violatingAllowlist = ["NEXT_PUBLIC_OALO_DATABASE_URL"] as const;

    expect(collectPublicAllowlistViolations(violatingAllowlist)).toEqual([
      "Public environment variable is not in the reviewed browser-publication registry: NEXT_PUBLIC_OALO_DATABASE_URL",
      "Public environment variable name bears a secret-bearing segment: NEXT_PUBLIC_OALO_DATABASE_URL",
      "Public environment variable must not mirror server-only secret OALO_DATABASE_URL: NEXT_PUBLIC_OALO_DATABASE_URL",
    ]);
    expect(() => assertPublicEnvironmentAllowlistSecure(violatingAllowlist)).toThrow(
      "Public environment allowlist violates secret boundary:\nPublic environment variable is not in the reviewed browser-publication registry: NEXT_PUBLIC_OALO_DATABASE_URL\nPublic environment variable name bears a secret-bearing segment: NEXT_PUBLIC_OALO_DATABASE_URL\nPublic environment variable must not mirror server-only secret OALO_DATABASE_URL: NEXT_PUBLIC_OALO_DATABASE_URL",
    );
  });

  it("rejects mirroring a server-only auth secret onto the public allowlist", () => {
    const violatingAllowlist = ["NEXT_PUBLIC_OALO_TASK_AUTHORITY_HMAC_KEY"] as const;

    expect(() => assertPublicEnvironmentAllowlistSecure(violatingAllowlist)).toThrow(
      /Public environment variable must not mirror server-only secret OALO_TASK_AUTHORITY_HMAC_KEY/u,
    );
  });

  it("lists every server-only secret the repository treats as non-public", () => {
    expect(SERVER_ONLY_SECRET_ENVIRONMENT_VARIABLE_NAMES).toContain("OALO_DATABASE_URL");
    expect(SERVER_ONLY_SECRET_ENVIRONMENT_VARIABLE_NAMES).toContain("OALO_TASK_AUTHORITY_HMAC_KEY");
  });
});

describe("browser publication review registry", () => {
  it("requires every operational public name to carry a reviewed approval", () => {
    const approvedNames = BROWSER_PUBLICATION_APPROVALS.map((approval) => approval.name);

    for (const name of PUBLIC_ENVIRONMENT_VARIABLE_NAMES) {
      expect(approvedNames).toContain(name);
    }
  });

  it("holds only prefixed entries with a reviewed value class and a stated rationale", () => {
    for (const approval of BROWSER_PUBLICATION_APPROVALS) {
      expect(approval.name.startsWith("NEXT_PUBLIC_")).toBe(true);
      expect(BROWSER_PUBLICATION_VALUE_CLASSES).toContain(approval.valueClass);
      expect(approval.rationale.trim().length).toBeGreaterThan(0);
      expect(SERVER_ONLY_SECRET_ENVIRONMENT_VARIABLE_NAMES).not.toContain(
        approval.serverCounterpart,
      );
    }
  });

  /**
   * The mirrored server variable is a review artifact, so it has to actually name something. An
   * empty or whitespace `serverCounterpart` would satisfy every other registry check while
   * declaring nothing, which is the vacuous form of the review this registry exists to force.
   */
  it("requires every approval to name the server variable it mirrors", () => {
    for (const approval of BROWSER_PUBLICATION_APPROVALS) {
      expect(approval.serverCounterpart.trim().length).toBeGreaterThan(0);
    }
  });

  it("fails closed when the operational allowlist is widened without a second reviewed edit", () => {
    const widenedAllowlist = [
      ...PUBLIC_ENVIRONMENT_VARIABLE_NAMES,
      "NEXT_PUBLIC_OALO_ANALYTICS_REGION",
    ];

    expect(collectPublicAllowlistViolations(widenedAllowlist)).toEqual([
      "Public environment variable is not in the reviewed browser-publication registry: NEXT_PUBLIC_OALO_ANALYTICS_REGION",
    ]);
  });

  /**
   * The point of the inversion: these names are rejected because they are absent from the review
   * registry, not because any of them appears in a pattern list. Four of them (`CONN`, `PG_URL`,
   * `SERVICE_ROLE`, `CONNECTION_STRING`) bypassed the previous name denylist entirely.
   */
  it.each([
    "NEXT_PUBLIC_OALO_DATABASE_URL",
    "NEXT_PUBLIC_OALO_DSN",
    "NEXT_PUBLIC_OALO_CONN",
    "NEXT_PUBLIC_PG_URL",
    "NEXT_PUBLIC_SUPABASE_SERVICE_ROLE",
    "NEXT_PUBLIC_OALO_APIKEY",
    "NEXT_PUBLIC_OALO_PIT",
    "NEXT_PUBLIC_OALO_CONNECTION_STRING",
    "NEXT_PUBLIC_OALO_SERVICE_ROLE",
  ])("rejects the unreviewed public name %s", (name) => {
    expect(collectPublicAllowlistViolations([name])).toContain(
      `Public environment variable is not in the reviewed browser-publication registry: ${name}`,
    );
    expect(() => assertPublicEnvironmentAllowlistSecure([name])).toThrow(
      /violates secret boundary/u,
    );
  });

  /**
   * Structural completeness: names with no secret-bearing spelling at all are still rejected, so a
   * credential published under an innocuous name cannot reach a browser.
   */
  it.each([
    "NEXT_PUBLIC_OALO_WIDGET_BOOTSTRAP",
    "NEXT_PUBLIC_OALO_HANDSHAKE_BLOB",
    "NEXT_PUBLIC_OALO_Z1",
  ])("rejects the innocuously spelled unreviewed public name %s", (name) => {
    expect(collectPublicAllowlistViolations([name]).length).toBeGreaterThan(0);
  });

  /**
   * PRD-005a 005A-AC-017, PRD-005b D6, and PRD-006a D7. One case per secret-bearing server
   * variable. Each is rejected twice over: it is absent from the review registry, and its name
   * carries a secret-bearing segment (`SECRET`, `SESSION`, or `KEY`).
   *
   * `OALO_REVIEW_SIGNIN_SECRET` is gone from this list because PRD-006a D9 removed the variable
   * along with the persona sign-in path it configured. `OALO_EMAIL_FROM` and
   * `OALO_SELF_SERVE_SIGNUP` are not here: neither name carries a secret-bearing segment, so the
   * registry is what keeps them off the public allowlist, and the case below covers that.
   */
  it.each([
    "NEXT_PUBLIC_OALO_CSRF_SERVER_SECRET",
    "NEXT_PUBLIC_OALO_RESEND_API_KEY",
    "NEXT_PUBLIC_OALO_EMBEDDED_SESSION_ISSUER",
    "NEXT_PUBLIC_OALO_EMBEDDED_SESSION_AUDIENCE",
    "NEXT_PUBLIC_OALO_EMBEDDED_SESSION_PUBLIC_KEYS_JSON",
  ])("rejects the runtime authentication secret name %s", (name) => {
    const violations = collectPublicAllowlistViolations([name]);

    expect(violations).toContain(
      `Public environment variable is not in the reviewed browser-publication registry: ${name}`,
    );
    expect(violations).toContain(
      `Public environment variable name bears a secret-bearing segment: ${name}`,
    );
    expect(() => assertPublicEnvironmentAllowlistSecure([name])).toThrow(
      /violates secret boundary/u,
    );
  });

  it.each([
    "NEXT_PUBLIC_OALO_REVIEW_LOCATION_ID",
    "NEXT_PUBLIC_OALO_REVIEW_OUTSIDER_LOCATION_ID",
    "NEXT_PUBLIC_OALO_EMAIL_FROM",
    "NEXT_PUBLIC_OALO_SELF_SERVE_SIGNUP",
  ])("rejects the unreviewed non-secret server name %s", (name) => {
    expect(collectPublicAllowlistViolations([name])).toContain(
      `Public environment variable is not in the reviewed browser-publication registry: ${name}`,
    );
  });

  it("still rejects a name that omits the public prefix", () => {
    expect(collectPublicAllowlistViolations(["OALO_APP_URL"])).toContain(
      "Public environment variable must use NEXT_PUBLIC_ prefix: OALO_APP_URL",
    );
  });
});

describe("public secret assignment scan", () => {
  it.each([
    ["dot target, dot source", "process.env.NEXT_PUBLIC_OALO_X = process.env.OALO_DATABASE_URL;"],
    [
      "double-quoted bracket target and source",
      'process.env["NEXT_PUBLIC_OALO_X"] = process.env["OALO_DATABASE_URL"];',
    ],
    [
      "single-quoted bracket target and source",
      `process.env[${SINGLE_QUOTE}NEXT_PUBLIC_OALO_X${SINGLE_QUOTE}] = process.env[${SINGLE_QUOTE}OALO_DATABASE_URL${SINGLE_QUOTE}];`,
    ],
    [
      "single-quoted bracket target, dot source",
      `process.env[${SINGLE_QUOTE}NEXT_PUBLIC_OALO_X${SINGLE_QUOTE}] = process.env.OALO_DATABASE_URL;`,
    ],
    [
      "double-quoted bracket target, dot source",
      'process.env["NEXT_PUBLIC_OALO_X"] = process.env.OALO_DATABASE_URL;',
    ],
    [
      "backtick bracket target and source",
      `process.env[${BACKTICK}NEXT_PUBLIC_OALO_X${BACKTICK}] = process.env[${BACKTICK}OALO_DATABASE_URL${BACKTICK}];`,
    ],
    [
      "object literal, bare key",
      "const publicEnv = { NEXT_PUBLIC_OALO_X: process.env.OALO_DATABASE_URL };",
    ],
    [
      "object literal, quoted key",
      'const publicEnv = { "NEXT_PUBLIC_OALO_X": process.env.OALO_DATABASE_URL };',
    ],
    [
      "assignment wrapped across lines",
      "process.env.NEXT_PUBLIC_OALO_X =\n  process.env.OALO_DATABASE_URL;",
    ],
  ])("rejects a direct secret assignment: %s", (_label, source) => {
    const violations = collectAssignmentViolationsInSource(assignmentSource(source));

    expect(violations.length).toBeGreaterThan(0);
    expect(violations.join("\n")).toMatch(
      /assigns or maps a server-only secret into a NEXT_PUBLIC variable/u,
    );
  });

  it.each([
    [
      "declaration alias",
      "const leaked = process.env.OALO_DATABASE_URL;\nprocess.env.NEXT_PUBLIC_OALO_X = leaked;",
    ],
    [
      "typed declaration alias into a quoted bracket target",
      `const leaked: string = process.env.OALO_DATABASE_URL ?? "";\nprocess.env[${SINGLE_QUOTE}NEXT_PUBLIC_OALO_X${SINGLE_QUOTE}] = leaked;`,
    ],
    [
      "declaration alias into an object literal",
      "const leaked = process.env.OALO_DATABASE_URL;\nconst publicEnv = { NEXT_PUBLIC_OALO_X: leaked };",
    ],
    [
      "renamed destructure",
      "const { OALO_DATABASE_URL: leaked } = process.env;\nprocess.env.NEXT_PUBLIC_OALO_X = leaked;",
    ],
    [
      "bare destructure",
      "const { OALO_DATABASE_URL } = process.env;\nprocess.env.NEXT_PUBLIC_OALO_X = OALO_DATABASE_URL;",
    ],
  ])("rejects a single-hop indirect secret assignment: %s", (_label, source) => {
    const violations = collectAssignmentViolationsInSource(assignmentSource(source));

    expect(violations.length).toBeGreaterThan(0);
    expect(violations.join("\n")).toMatch(
      /assigns or maps a server-only secret into a NEXT_PUBLIC variable/u,
    );
  });

  it("does not flag a public variable mirroring a non-secret server variable", () => {
    const violations = collectAssignmentViolationsInSource(
      assignmentSource("process.env.NEXT_PUBLIC_OALO_BUILD_ID = process.env.OALO_BUILD_ID;"),
    );

    expect(violations).toEqual([]);
  });

  /**
   * Pins the documented limit of the textual scan rather than endorsing it: a value laundered
   * through two or more bindings is out of reach for a regular expression. The review registry is
   * what actually stops the leak, because `NEXT_PUBLIC_OALO_X` is not approved for publication. If
   * this expectation ever starts failing, tighten the limitation wording in
   * `packages/config/src/public-env-guard.ts` and `docs/production-environments.md` to match.
   */
  it("documents that multi-hop indirection is out of reach for the textual scan", () => {
    const source = [
      "const first = process.env.OALO_DATABASE_URL;",
      "const second = first;",
      "process.env.NEXT_PUBLIC_OALO_X = second;",
    ].join("\n");

    expect(collectAssignmentViolationsInSource(assignmentSource(source))).toEqual([]);
    expect(collectPublicAllowlistViolations(["NEXT_PUBLIC_OALO_X"]).length).toBeGreaterThan(0);
  });

  /**
   * The scan exempts this guard module, because it necessarily spells every secret name next to
   * `NEXT_PUBLIC_` patterns. The exemption is one exact path, so it cannot be claimed by naming a
   * new file `public-env-guard.ts` somewhere else and thereby switching the scan off for it.
   */
  it("exempts only the guard module itself, not any file sharing its name", () => {
    const leak = "process.env.NEXT_PUBLIC_OALO_X = process.env.OALO_DATABASE_URL;";

    expect(
      collectPublicSecretAssignmentViolationsInSources([
        { filePath: "packages/config/src/public-env-guard.ts", source: leak },
      ]),
    ).toEqual([]);

    for (const filePath of [
      "apps/web/src/server/public-env-guard.ts",
      "packages/config/src/nested/public-env-guard.ts",
    ]) {
      expect(
        collectPublicSecretAssignmentViolationsInSources([{ filePath, source: leak }]).length,
      ).toBeGreaterThan(0);
    }
  });
});
