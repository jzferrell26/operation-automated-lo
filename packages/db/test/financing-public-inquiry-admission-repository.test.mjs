import assert from "node:assert/strict";
import { it } from "node:test";
import { readFile } from "node:fs/promises";
import { PostgresPublicFinancingInquiryAdmissionRepository } from "../dist/index.js";
it("refuses missing server configuration and raw browser fields before any database acquisition", async () => {
  let connections = 0;
  const pool = {
    async connect() {
      connections++;
      throw Error("Unexpected acquisition");
    },
    async close() {},
  };
  assert.throws(() => new PostgresPublicFinancingInquiryAdmissionRepository(pool, Buffer.alloc(0)));
  const repo = new PostgresPublicFinancingInquiryAdmissionRepository(pool, Buffer.alloc(32));
  await assert.rejects(
    repo.admit({
      publicationId: "00000000-0000-4000-8000-000000007001",
      canonicalOrigin: "https://reports.example.invalid",
      requestId: "00000000-0000-4000-8000-000000007002",
      trustedClientKey: Buffer.from("synthetic"),
      clientHash: "browser-picked",
    }),
  );
  assert.equal(connections, 0);
});
it("canonical PostgreSQL discovery includes this actual admission integration proof", async () => {
  const gate = await readFile(
    new URL("../../../tooling/scripts/database/run-real-database-tests.mjs", import.meta.url),
    "utf8",
  );
  assert.match(gate, /integration\.test\.mjs/u);
});
