import { readFile } from "node:fs/promises";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@playwright/test", () => {
  throw new Error("Browser runtime is unavailable in this web function");
});

import * as database from "@oalo/db";
import { GET, HEAD } from "../app/p/[publicationId]/route.js";
import { POST } from "../app/p/[publicationId]/inquiry/route.js";
import { createPublicFinancingOutputRenderer } from "./financing-release-render.js";
import { outputFixture } from "./financing-release-output-fixture.js";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("public financing routes without a browser runtime", () => {
  it("preserves disabled-publication refusal before database, network or browser access", async () => {
    vi.stubEnv("OALO_FINANCING_PUBLIC_ENABLED", undefined);
    const pool = vi.spyOn(database, "createPostgresPool");
    const fetch = vi.fn(() => {
      throw new Error("Unexpected network access");
    });
    vi.stubGlobal("fetch", fetch);
    const publicationId = "00000000-0000-4000-8000-000000000001";
    const url = `https://reports.example.com/p/${publicationId}`;
    const context = { params: Promise.resolve({ publicationId }) };
    const get = await GET(new Request(url), context);
    expect(get.status).toBe(404);
    expect(await get.text()).toBe("This report is unavailable.");
    expect(get.headers.get("cache-control")).toContain("no-store");
    expect(get.headers.get("content-security-policy")).toContain("default-src 'none'");
    const head = await HEAD(new Request(url, { method: "HEAD" }), context);
    expect(head.status).toBe(404);
    expect(await head.text()).toBe("");
    const post = await POST(new Request(`${url}/inquiry`, { method: "POST" }), context);
    expect(post.status).toBe(503);
    expect(await post.text()).toBe("The request is temporarily unavailable. Please try again.");
    expect(pool).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("requires the browser for real output and releases capacity after import failures", async () => {
    const readMedia = vi.fn(() => {
      throw new Error("Unexpected media read");
    });
    const renderer = createPublicFinancingOutputRenderer({
      readMedia,
      fontBytes: new Uint8Array(
        await readFile("apps/web/public/fonts/webinar/AutomatedLOWebinarInter.ttf"),
      ),
    });
    for (let attempt = 0; attempt < 3; attempt++) {
      // Vitest wraps a rejected mock-module import; assert its exact cause, not wrapper wording.
      await expect(renderer.render(outputFixture())).rejects.toMatchObject({
        cause: { message: "Browser runtime is unavailable in this web function" },
      });
    }
    expect(readMedia).not.toHaveBeenCalled();
  });
});
