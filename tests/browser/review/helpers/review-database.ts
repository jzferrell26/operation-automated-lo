import {
  TEST_DATABASE_NAME,
  assertDisposableTestDatabaseName,
  localDatabaseUrl,
  readLocalDatabasePort,
} from "../../../../tooling/scripts/database/run-real-database-tests.mjs";

/**
 * The review browser run's own database, for the specs that write to it directly where the product
 * has no way to (`verification-token.ts`, `seed-campaign-history.ts`).
 *
 * It connects to the gate's disposable database by the gate's own constants: `TEST_DATABASE_NAME`,
 * the local stack's port from `supabase/config.toml`, and the stack's well-known local credential,
 * which the seeding step already uses. The name guard the gate applies to every destructive step is
 * applied here too, the address must be the loopback interface, and the helper refuses to run
 * outside the review browser run, which is the only place that database exists.
 */
export async function reviewDatabaseUrl(): Promise<string> {
  if (process.env["OALO_REVIEW_BROWSER_RUN"] !== "true") {
    throw new Error(
      "The review database is reached only inside the review browser run of `pnpm test:db`",
    );
  }
  const databaseName = assertDisposableTestDatabaseName(TEST_DATABASE_NAME);
  const url = localDatabaseUrl(await readLocalDatabasePort(), databaseName, {
    withPassword: true,
  });
  const parsed = new URL(url);
  if (parsed.hostname !== "127.0.0.1" || parsed.pathname !== `/${databaseName}`) {
    throw new Error("The review database is the loopback disposable database and nothing else");
  }
  return url;
}
