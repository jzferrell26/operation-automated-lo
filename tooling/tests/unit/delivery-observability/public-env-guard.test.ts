import {
  BROWSER_PUBLICATION_APPROVALS,
  BROWSER_PUBLICATION_VALUE_CLASSES,
  PUBLIC_ENVIRONMENT_VARIABLE_NAMES,
  SERVER_ONLY_SECRET_ENVIRONMENT_VARIABLE_NAMES,
  assertPublicEnvironmentAllowlistSecure,
  collectAssignmentViolationsInSource,
  collectPublicAllowlistViolations,
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
});
