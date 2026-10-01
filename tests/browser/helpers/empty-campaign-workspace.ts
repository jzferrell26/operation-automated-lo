import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import playwrightConfig from "../../../playwright.config.js";

/**
 * PRD-008d 008D-AC-007, S-2. The synthetic workspace with no campaigns in it, for the campaigns
 * list's empty state.
 *
 * Synthetic mode keeps a workspace's campaigns in one filesystem store, and the synthetic suite
 * writes to it: the create screen's saving, ready, and needs-changes states each save a real
 * campaign. So whether the campaigns list is empty depends on which specs ran before it and on
 * what an earlier run on the same machine left behind, and the sign-off could not name an empty
 * state the suite reliably reaches. This makes it one.
 *
 * It is scoped to the work it wraps and changes nothing any other screen shows. The store is read
 * before anything is touched, replaced with a store holding no campaigns while the work runs, and
 * put back afterwards exactly as it was, byte for byte, or removed again if there was none. The
 * suite runs one test at a time (`workers: 1`, `fullyParallel: false`), so nothing else reads the
 * store while it is swapped, and the server reads the file on every request rather than caching it
 * (`apps/web/src/server/local-campaign-store.ts`, `readStore`), so the swap is what the next page
 * load sees.
 *
 * The path is the one the synthetic server is started with, read from `playwright.config.ts`'s own
 * `webServer.env`, so the fixture cannot drift onto a file the server is not reading.
 */

/** The shape `LocalCampaignStoreSchema` accepts, with nothing in it. */
const EMPTY_CAMPAIGN_STORE = `${JSON.stringify({ schemaVersion: 1, campaigns: {} }, null, 2)}\n`;

function syntheticCampaignStorePath(): string {
  const servers = [playwrightConfig.webServer ?? []].flat();
  const path = servers
    .map((server) => server.env?.["OALO_LOCAL_CAMPAIGN_STORE"])
    .find((candidate) => candidate !== undefined && candidate.length > 0);
  if (path === undefined) {
    throw new Error(
      "The synthetic server's campaign store is not configured in playwright.config.ts; the empty workspace has nothing to stand in for",
    );
  }
  return path;
}

async function readIfPresent(path: string): Promise<string | undefined> {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
}

/** Runs `work` against a synthetic workspace with no campaigns, then puts the store back. */
export async function withAnEmptyCampaignWorkspace(work: () => Promise<void>): Promise<void> {
  const storePath = syntheticCampaignStorePath();
  const original = await readIfPresent(storePath);
  await mkdir(dirname(storePath), { recursive: true });
  await writeFile(storePath, EMPTY_CAMPAIGN_STORE, "utf8");
  try {
    await work();
  } finally {
    if (original === undefined) {
      await rm(storePath, { force: true });
    } else {
      await writeFile(storePath, original, "utf8");
    }
  }
}
