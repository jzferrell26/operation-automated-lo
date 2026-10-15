import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { publisherFixture } from "./webinar-publisher-fixture.mjs";
import {
  PostgresWebinarPublisherRepository,
  WebinarPublisherAdmissionSchema,
} from "../dist/index.js";
import {
  discoverDatabaseUnitTestFiles,
  discoverIntegrationTestFiles,
} from "../../../tooling/scripts/database/run-real-database-tests.mjs";

describe("publisher connectionless discovery and identity boundary", () => {
  it("canonical gate includes actual PG proof separately from connectionless unit proof", async () => {
    const units = await discoverDatabaseUnitTestFiles();
    const actual = await discoverIntegrationTestFiles();
    assert.ok(units.includes("packages/db/test/webinar-publisher-repository.test.mjs"));
    assert.ok(!units.includes("packages/db/test/webinar-publisher.integration.test.mjs"));
    assert.ok(actual.includes("packages/db/test/webinar-publisher.integration.test.mjs"));
  });
  it("synthetic authentication never falls back to an in-memory production store", async () => {
    const f = publisherFixture();
    let connections = 0;
    const pool = {
      connect: async () => {
        connections++;
        throw new Error("unexpected connect");
      },
    };
    const authority = {
      currentPrincipal: async (p) => p,
      assertEvidenceCurrent: async () => {},
      assertDispatch: async () => {},
      assertCheckpoint: async () => {},
    };
    const repo = new PostgresWebinarPublisherRepository(
      pool,
      authority,
      "correlation_discovery001",
    );
    await assert.rejects(
      repo.run({ ...f.principal, authenticationMode: "local_synthetic" }, async () => {}),
    );
    assert.equal(connections, 0);
  });
  it("raw discovery bodies, page tokens and unknown admission revisions fail strict normalization", () => {
    const f = publisherFixture();
    assert.ok(WebinarPublisherAdmissionSchema.safeParse(f.receipt).success);
    assert.equal(
      WebinarPublisherAdmissionSchema.safeParse({ ...f.receipt, contractRevision: 2 }).success,
      false,
    );
    assert.equal(
      WebinarPublisherAdmissionSchema.safeParse({
        ...f.receipt,
        normalized: { ...f.receipt.normalized, access_token: "not-stored" },
      }).success,
      false,
    );
  });
});
