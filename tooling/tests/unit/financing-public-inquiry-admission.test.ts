import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  PostgresPublicFinancingInquiryAdmissionRepository,
  type DatabasePool,
  type SqlRequest,
} from "@oalo/db";

const input = {
  publicationId: "00000000-0000-4000-8000-000000007a01",
  canonicalOrigin: "https://reports.example.invalid",
  requestId: "00000000-0000-4000-8000-000000007002",
  trustedClientKey: Buffer.from("trusted deployment bytes"),
};
function fixture(
  value: unknown = { status: "admitted", allowed: true, retryAfterSeconds: 0 },
  failStatement?: string,
) {
  const requests: SqlRequest[] = [];
  let opened = 0,
    released = 0;
  const pool: DatabasePool = {
    async connect() {
      opened++;
      return {
        async execute(request) {
          requests.push(request);
          if (request.statementName === failStatement) throw new Error("sensitive driver detail");
          return {
            rows: request.statementName.endsWith("admit.v1") ? [{ value }] : [],
            rowCount: request.statementName.endsWith("admit.v1") ? 1 : 0,
          };
        },
        async release() {
          released++;
        },
      };
    },
  };
  return { pool, requests, opened: () => opened, released: () => released };
}
describe("native public inquiry admission boundary", () => {
  it("requires a server key and strict trusted inputs before opening a connection", async () => {
    const f = fixture();
    expect(
      () => new PostgresPublicFinancingInquiryAdmissionRepository(f.pool, Buffer.alloc(31)),
    ).toThrow("configured public inquiry admission key");
    const repo = new PostgresPublicFinancingInquiryAdmissionRepository(f.pool, Buffer.alloc(32));
    await expect(repo.admit({ ...input, trustedClientKey: Buffer.alloc(0) })).rejects.toThrow();
    await expect(
      repo.admit({ ...input, canonicalOrigin: "https://spoof@example.invalid" }),
    ).rejects.toThrow();
    await expect(repo.admit({ ...input, requestId: "client-nonce" })).rejects.toThrow();
    await expect(repo.admit({ ...input, ip: "not accepted" } as typeof input)).rejects.toThrow();
    expect(f.opened()).toBe(0);
  });
  it("uses serializable native scope and a copied publication-separated HMAC without raw client bytes", async () => {
    const f = fixture(),
      key = Buffer.alloc(32, 41);
    const repo = new PostgresPublicFinancingInquiryAdmissionRepository(f.pool, key);
    key.fill(1);
    await expect(repo.admit(input)).resolves.toEqual({ allowed: true, retryAfterSeconds: 0 });
    expect(f.requests.map((request) => request.text)).toEqual([
      "begin isolation level serializable",
      "set local role financing_public_runtime",
      "select campaign.financing_public_inquiry_admit($1::uuid,$2::text,$3::uuid,$4::text) as value",
      "commit",
    ]);
    const expected = createHmac("sha256", Buffer.alloc(32, 41))
      .update("financing-public-client:v1\n")
      .update(input.publicationId)
      .update("\n")
      .update(input.trustedClientKey)
      .digest("hex");
    expect(f.requests[2]!.values).toEqual([
      input.publicationId,
      input.canonicalOrigin,
      input.requestId,
      expected,
    ]);
    expect(JSON.stringify(f.requests)).not.toContain(input.trustedClientKey.toString());
    expect(f.requests.every((request) => request.preparedStatementMode === "unnamed")).toBe(true);
    expect(f.released()).toBe(1);
  });
  it("returns exact durable denial without pretending the inquiry was accepted", async () => {
    const f = fixture({ status: "limited", allowed: false, retryAfterSeconds: 600 });
    await expect(
      new PostgresPublicFinancingInquiryAdmissionRepository(f.pool, Buffer.alloc(32)).admit(input),
    ).resolves.toEqual({ allowed: false, retryAfterSeconds: 600 });
    expect(f.requests.at(-1)?.text).toBe("commit");
  });
  it("canonicalizes UUID case before the client HMAC so one native publication has one bucket", async () => {
    const f = fixture();
    const repo = new PostgresPublicFinancingInquiryAdmissionRepository(f.pool, Buffer.alloc(32));
    await repo.admit(input);
    await repo.admit({ ...input, publicationId: input.publicationId.toUpperCase() });
    const admitted = f.requests.filter((request) => request.statementName.endsWith("admit.v1"));
    expect(admitted[0]!.values).toEqual(admitted[1]!.values);
  });
  it.each([
    [{ status: "conflict" }, "CONFLICT"],
    [{ status: "unavailable" }, "INELIGIBLE"],
    [{ status: "invalid" }, "INVALID"],
    [{ status: "admitted", allowed: true, retryAfterSeconds: 1 }, "UNAVAILABLE"],
    [{ status: "limited", allowed: false, retryAfterSeconds: 0 }, "UNAVAILABLE"],
    [{ status: "admitted", allowed: true, retryAfterSeconds: 0, token: "unknown" }, "UNAVAILABLE"],
  ])("rolls back a refused or unknown result: %j", async (value, code) => {
    const f = fixture(value);
    await expect(
      new PostgresPublicFinancingInquiryAdmissionRepository(f.pool, Buffer.alloc(32)).admit(input),
    ).rejects.toMatchObject({ code });
    expect(f.requests.at(-1)?.text).toBe("rollback");
    expect(f.released()).toBe(1);
  });
  it("sanitizes actual driver failure and still rolls back/releases", async () => {
    const f = fixture(undefined, "financing-public-admission.admit.v1");
    await expect(
      new PostgresPublicFinancingInquiryAdmissionRepository(f.pool, Buffer.alloc(32)).admit(input),
    ).rejects.toMatchObject({ code: "UNAVAILABLE", message: "FINANCING_RELEASE_UNAVAILABLE" });
    expect(f.requests.at(-1)?.text).toBe("rollback");
    expect(f.released()).toBe(1);
  });
});
