import { describe, expect, it } from "vitest";

import {
  MARKETPLACE_APP_ID,
  SEEDED_LOCATION_IDS,
  SEED_IDS,
  assertConfirmedDatabase,
  assertNoForeignActiveLocations,
  assertNotProductionEnvironment,
  databaseNameFromUrl,
  parseSeedArguments,
  reportLines,
  resolveConnectionProfile,
  seedReviewLocation,
  summarizeSeedResult,
  type SeedSession,
  type SeedSqlRequest,
} from "../../scripts/database/seed-review-location.mjs";

const REVIEW_URL = "postgresql://migration_owner@db.example.test:5432/oalo_review";

describe("seed-review-location arguments", () => {
  it("requires both the connection URL and the database confirmation", () => {
    expect(() => parseSeedArguments([])).toThrow("--review-database-url is required.");
    expect(() => parseSeedArguments(["--review-database-url", REVIEW_URL])).toThrow(
      "--confirm-database is required",
    );
  });

  it("refuses an unknown flag rather than ignoring it", () => {
    expect(() =>
      parseSeedArguments(["--review-database-url", REVIEW_URL, "--confirm-databse", "oalo_review"]),
    ).toThrow("Unknown argument --confirm-databse");
  });

  it("refuses a flag whose value is missing or is another flag", () => {
    expect(() => parseSeedArguments(["--review-database-url"])).toThrow(
      "--review-database-url requires a value.",
    );
    expect(() =>
      parseSeedArguments(["--review-database-url", "--confirm-database", "oalo_review"]),
    ).toThrow("--review-database-url requires a value.");
  });

  it("parses the documented flags including the idempotency assertion", () => {
    expect(
      parseSeedArguments([
        "--review-database-url",
        REVIEW_URL,
        "--confirm-database",
        "oalo_review",
        "--expect-unchanged",
      ]),
    ).toEqual({
      confirmDatabase: "oalo_review",
      expectUnchanged: true,
      reviewDatabaseUrl: REVIEW_URL,
    });
  });
});

describe("seed-review-location guards", () => {
  it("reads the database name out of the connection URL", () => {
    expect(databaseNameFromUrl(REVIEW_URL)).toBe("oalo_review");
    expect(databaseNameFromUrl("postgresql://user@host:5432/postgres")).toBe("postgres");
    expect(() => databaseNameFromUrl("postgresql://user@host:5432/")).toThrow(
      "must name a database",
    );
    expect(() => databaseNameFromUrl("not a url")).toThrow("not a valid connection URL");
  });

  it("refuses a confirmation that does not match the URL", () => {
    expect(assertConfirmedDatabase(REVIEW_URL, "oalo_review")).toBe("oalo_review");
    expect(() => assertConfirmedDatabase(REVIEW_URL, "postgres")).toThrow(
      "--confirm-database postgres does not match",
    );
  });

  it("refuses to run while the shell declares production", () => {
    expect(() => assertNotProductionEnvironment({ OALO_ENVIRONMENT: "production" })).toThrow(
      "OALO_ENVIRONMENT=production",
    );
    expect(() => assertNotProductionEnvironment({ OALO_ENVIRONMENT: "preview" })).not.toThrow();
    expect(() => assertNotProductionEnvironment({})).not.toThrow();
  });

  it("refuses a database that already holds an active location it does not own", () => {
    expect(() => assertNoForeignActiveLocations([...SEEDED_LOCATION_IDS])).not.toThrow();
    expect(() => assertNoForeignActiveLocations([])).not.toThrow();
    expect(() =>
      assertNoForeignActiveLocations([
        SEED_IDS.reviewLocationId,
        "11111111-2222-4333-8444-555555555555",
      ]),
    ).toThrow("already holds 1 active location(s)");
  });

  it("keeps TLS off only for loopback", () => {
    expect(
      resolveConnectionProfile("postgresql://postgres@127.0.0.1:55422/oalo_test_campaign"),
    ).toEqual({ deploymentEnvironment: "test", sslMode: "disable" });
    expect(resolveConnectionProfile(REVIEW_URL)).toEqual({
      deploymentEnvironment: "preview",
      sslMode: "require",
    });
  });
});

describe("seed-review-location reporting", () => {
  it("sums inserted rows across the seeded tables", () => {
    expect(summarizeSeedResult({ "platform.locations": 2, "platform.app_users": 3 })).toEqual({
      insertedByTable: { "platform.app_users": 3, "platform.locations": 2 },
      insertedRowCount: 5,
    });
  });

  it("prints the environment variable values and nothing secret", () => {
    const lines = reportLines("oalo_review", summarizeSeedResult({ "platform.locations": 0 }));
    const text = lines.join("\n");

    expect(text).toContain(`OALO_REVIEW_LOCATION_ID=${SEED_IDS.reviewLocationId}`);
    expect(text).toContain(`OALO_REVIEW_OUTSIDER_LOCATION_ID=${SEED_IDS.outsiderLocationId}`);
    expect(text).toContain("no secret is printed here");
    expect(text).not.toMatch(/secret\s*[:=]\s*\S/iu);
    expect(text).not.toContain("password");
  });
});

describe("seed-review-location run", () => {
  it("assumes migration_owner, guards, seeds, and commits in one transaction", async () => {
    const recorded = recordingSession({ "seed-review.active-locations": [] });
    const lines: string[] = [];

    const summary = await seedReviewLocation({
      argv: ["--review-database-url", REVIEW_URL, "--confirm-database", "oalo_review"],
      connect: recorded.connect,
      environment: {},
      log: (line) => lines.push(line),
    });

    expect(recorded.statements).toEqual([
      "seed-review.begin",
      "seed-review.assume-migration-owner",
      "seed-review.active-locations",
      "seed-review.locations",
      "seed-review.app-users",
      "seed-review.installations",
      "seed-review.role-bindings",
      "seed-review.commit",
    ]);
    expect(summary.insertedRowCount).toBe(4);
    expect(recorded.disposed).toBe(true);
    expect(lines.join("\n")).toContain(SEED_IDS.creatorUserId);
  });

  it("rolls back and reports when the foreign active location guard fires", async () => {
    const recorded = recordingSession({
      "seed-review.active-locations": [{ id: "11111111-2222-4333-8444-555555555555" }],
    });

    await expect(
      seedReviewLocation({
        argv: ["--review-database-url", REVIEW_URL, "--confirm-database", "oalo_review"],
        connect: recorded.connect,
        environment: {},
        log: () => undefined,
      }),
    ).rejects.toThrow("already holds 1 active location(s)");

    expect(recorded.statements).toEqual([
      "seed-review.begin",
      "seed-review.assume-migration-owner",
      "seed-review.active-locations",
      "seed-review.rollback",
    ]);
    expect(recorded.disposed).toBe(true);
  });

  it("fails an --expect-unchanged run that inserted rows", async () => {
    const recorded = recordingSession({ "seed-review.active-locations": [] });

    await expect(
      seedReviewLocation({
        argv: [
          "--review-database-url",
          REVIEW_URL,
          "--confirm-database",
          "oalo_review",
          "--expect-unchanged",
        ],
        connect: recorded.connect,
        environment: {},
        log: () => undefined,
      }),
    ).rejects.toThrow("Expected an idempotent run but 4 row(s) were inserted.");
  });

  it("passes an --expect-unchanged run that inserted nothing", async () => {
    const recorded = recordingSession({ "seed-review.active-locations": [] }, 0);

    const summary = await seedReviewLocation({
      argv: [
        "--review-database-url",
        REVIEW_URL,
        "--confirm-database",
        "oalo_review",
        "--expect-unchanged",
      ],
      connect: recorded.connect,
      environment: {},
      log: () => undefined,
    });

    expect(summary.insertedRowCount).toBe(0);
  });

  it("never opens a connection when the shell declares production", async () => {
    let connected = false;

    await expect(
      seedReviewLocation({
        argv: ["--review-database-url", REVIEW_URL, "--confirm-database", "oalo_review"],
        async connect() {
          connected = true;
          throw new Error("unreachable");
        },
        environment: { OALO_ENVIRONMENT: "production" },
        log: () => undefined,
      }),
    ).rejects.toThrow("OALO_ENVIRONMENT=production");

    expect(connected).toBe(false);
  });

  it("seeds the review installation against the documented marketplace app id", () => {
    expect(MARKETPLACE_APP_ID).toBe("oalo-review-surface");
  });
});

function recordingSession(
  rowsByStatement: Readonly<Record<string, readonly unknown[]>>,
  insertRowCount = 1,
) {
  const statements: string[] = [];
  const state = { disposed: false };
  const session: SeedSession = {
    connection: {
      async execute(request: SeedSqlRequest) {
        statements.push(request.statementName);
        return {
          rowCount: rowsByStatement[request.statementName] === undefined ? insertRowCount : 0,
          rows: rowsByStatement[request.statementName] ?? [],
        };
      },
    },
    async dispose() {
      state.disposed = true;
    },
  };
  return {
    connect: async () => session,
    get disposed() {
      return state.disposed;
    },
    statements,
  };
}
