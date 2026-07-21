import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";
import { z } from "zod";

const appManifestSchema = z
  .object({
    name: z.enum(["@oalo/web", "@oalo/tasks"]),
    dependencies: z.record(z.string(), z.string()),
  })
  .passthrough();

async function loadManifest(path: string) {
  const parsed: unknown = JSON.parse(await readFile(path, "utf8"));
  return appManifestSchema.parse(parsed);
}

describe("workspace integration", () => {
  it("builds both deployable shells from the shared application package", async () => {
    const web = await loadManifest("apps/web/package.json");
    const tasks = await loadManifest("apps/tasks/package.json");

    expect(web.dependencies["@oalo/application"]).toBe("workspace:*");
    expect(tasks.dependencies["@oalo/application"]).toBe("workspace:*");
  });
});
