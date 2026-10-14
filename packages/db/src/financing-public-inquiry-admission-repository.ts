import { createHmac } from "node:crypto";
import { z } from "zod";
import { FinancingReleaseError } from "@oalo/application";
import type { DatabasePool, SqlScalar } from "./sql-contract.js";

const Selection = z
  .object({
    publicationId: z.uuid().transform((value) => value.toLowerCase()),
    canonicalOrigin: z.string().regex(/^https:\/\/[a-z0-9.-]+(?::[0-9]+)?$/u),
    requestId: z.uuid().transform((value) => value.toLowerCase()),
    trustedClientKey: z
      .instanceof(Uint8Array)
      .refine((bytes) => bytes.byteLength > 0 && bytes.byteLength <= 512),
  })
  .strict();
const Result = z.discriminatedUnion("status", [
  z
    .object({
      status: z.literal("admitted"),
      allowed: z.literal(true),
      retryAfterSeconds: z.literal(0),
    })
    .strict(),
  z
    .object({
      status: z.literal("limited"),
      allowed: z.literal(false),
      retryAfterSeconds: z.number().int().min(1).max(86400),
    })
    .strict(),
  z.object({ status: z.enum(["invalid", "unavailable", "conflict"]) }).strict(),
]);
export interface FinancingPublicInquiryAdmission {
  readonly publicationId: string;
  readonly canonicalOrigin: string;
  /** UUID from the server-issued signed request nonce, never from inquiry fields. */
  readonly requestId: string;
  /** Resolved under an explicit trusted deployment policy. Never forward visitor headers here. */
  readonly trustedClientKey: Uint8Array;
}
export type FinancingPublicInquiryAdmissionDecision = Readonly<{
  allowed: boolean;
  retryAfterSeconds: number;
}>;

/** Dedicated public pool. Native eligible scope, quota reservation and exact retry are durable.
 * The configured server key must be stable; neither raw client bytes nor the key enter SQL/logs.
 * No trusted client resolver or permissive default is supplied by this database adapter. */
export class PostgresPublicFinancingInquiryAdmissionRepository {
  readonly #key: Uint8Array;
  constructor(
    readonly pool: DatabasePool,
    serverHmacKey: Uint8Array,
  ) {
    if (!(serverHmacKey instanceof Uint8Array) || serverHmacKey.byteLength !== 32)
      throw new Error("A configured public inquiry admission key is required");
    this.#key = Uint8Array.from(serverHmacKey);
  }
  async admit(
    raw: FinancingPublicInquiryAdmission,
  ): Promise<FinancingPublicInquiryAdmissionDecision> {
    const input = Selection.parse(raw);
    const clientHash = createHmac("sha256", this.#key)
      .update("financing-public-client:v1\n")
      .update(input.publicationId)
      .update("\n")
      .update(input.trustedClientKey)
      .digest("hex");
    const connection = await this.pool.connect();
    const execute = (statementName: string, text: string, values: readonly SqlScalar[] = []) =>
      connection.execute({ statementName, text, values, preparedStatementMode: "unnamed" });
    try {
      await execute("financing-public-admission.begin", "begin isolation level serializable");
      await execute("financing-public-admission.role", "set local role financing_public_runtime");
      const rows = await execute(
        "financing-public-admission.admit.v1",
        "select campaign.financing_public_inquiry_admit($1::uuid,$2::text,$3::uuid,$4::text) as value",
        [input.publicationId, input.canonicalOrigin, input.requestId, clientHash],
      );
      if (rows.rows.length !== 1) throw new FinancingReleaseError("UNAVAILABLE", 503);
      const result = z.object({ value: Result }).strict().parse(rows.rows[0]).value;
      if (result.status === "conflict") throw new FinancingReleaseError("CONFLICT", 409);
      if (result.status === "unavailable") throw new FinancingReleaseError("INELIGIBLE", 422);
      if (result.status === "invalid") throw new FinancingReleaseError("INVALID", 400);
      if (result.status !== "admitted" && result.status !== "limited")
        throw new FinancingReleaseError("UNAVAILABLE", 503);
      await execute("financing-public-admission.commit", "commit");
      return { allowed: result.allowed, retryAfterSeconds: result.retryAfterSeconds };
    } catch (error) {
      try {
        await execute("financing-public-admission.rollback", "rollback");
      } catch {
        throw new FinancingReleaseError("UNAVAILABLE", 503);
      }
      if (error instanceof FinancingReleaseError) throw error;
      throw new FinancingReleaseError("UNAVAILABLE", 503);
    } finally {
      await connection.release();
    }
  }
}
