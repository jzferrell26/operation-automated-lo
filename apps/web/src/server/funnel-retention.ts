import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { campaignDatabasePool } from "./campaign-persistence-runtime.js";
import { publicFunnelConfig } from "./funnel-public-store.js";

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
  try {
    publicFunnelConfig(environment);
  } catch {
    return json({ error: "RETENTION_NOT_CONFIGURED" }, 503);
  }
  const connection = await campaignDatabasePool(environment).connect();
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
    let removed = 0;
    for (let index = 0; index < 5; index++) {
      const result = await execute(
        "purge",
        "select campaign.purge_expired_funnel_inquiries() as removed",
      );
      const count = z
        .object({ removed: z.number().int().min(0).max(5000) })
        .parse(result.rows[0]).removed;
      removed += count;
      if (count < 5000) break;
    }
    await execute("commit", "commit");
    return json({ removed });
  } catch {
    await execute("rollback", "rollback");
    return json({ error: "RETENTION_UNAVAILABLE" }, 503);
  } finally {
    await connection.release();
  }
}
