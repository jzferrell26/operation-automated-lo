import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { campaignDatabasePool } from "./campaign-persistence-runtime.js";

export async function runFunnelRetention(
  request: Request,
  environment: unknown = process.env,
): Promise<Response> {
  const json = (body: unknown, status = 200) =>
    Response.json(body, { status, headers: { "cache-control": "no-store" } });
  const env = z
    .object({ CRON_SECRET: z.string().min(32).max(256) })
    .passthrough()
    .safeParse(environment);
  if (!env.success) return json({ error: "RETENTION_NOT_CONFIGURED" }, 503);
  const actual = createHash("sha256")
    .update(request.headers.get("authorization") ?? "")
    .digest();
  const expected = createHash("sha256").update(`Bearer ${env.data.CRON_SECRET}`).digest();
  if (!timingSafeEqual(actual, expected)) return json({ error: "UNAUTHENTICATED" }, 401);
  // Expiration must keep running even when public collection is disabled. The scheduler
  // deletes already-expired ciphertext and neither needs nor uses the contact decryption key.
  const connection = await Promise.resolve()
    .then(() => campaignDatabasePool(environment).connect())
    .catch(() => null);
  if (connection === null) return json({ error: "RETENTION_UNAVAILABLE" }, 503);
  const execute = (name: string, text: string) =>
    connection.execute({
      statementName: `funnel-retention.${name}`,
      text,
      values: [],
      preparedStatementMode: "unnamed",
    });
  try {
    await execute("begin", "begin");
    await execute("role", "set local role scheduler_runtime");
    // The fixed SQL routine shares its five bounded batches between both families.
    // Calling the old funnel-only loop as well would exceed the shared policy.
    const result = await execute(
      "purge",
      "select campaign.purge_expired_marketing_inquiries() as counts",
    );
    const counts = z
      .object({
        counts: z
          .object({
            funnel: z.number().int().min(0).max(15000),
            financing: z.number().int().min(0).max(10000),
            total: z.number().int().min(0).max(25000),
          })
          .strict()
          .refine((value) => value.total === value.funnel + value.financing),
      })
      .strict()
      .parse(result.rows[0]).counts;
    await execute("commit", "commit");
    return json({ removed: counts.total });
  } catch {
    await execute("rollback", "rollback").catch(() => undefined);
    return json({ error: "RETENTION_UNAVAILABLE" }, 503);
  } finally {
    await connection.release();
  }
}
