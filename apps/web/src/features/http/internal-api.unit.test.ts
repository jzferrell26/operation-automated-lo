import { afterEach, describe, expect, it, vi } from "vitest";

import { postInternalJson } from "./internal-api.js";

describe("postInternalJson", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("allows only application-relative requests", async () => {
    const network = vi.fn(async () => new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", network);

    await postInternalJson("/api/campaigns/preflight", { campaign: "fixture" });

    expect(network).toHaveBeenCalledWith(
      "/api/campaigns/preflight",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("rejects absolute and protocol-relative destinations before transport", async () => {
    const network = vi.fn(async () => new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", network);

    await expect(postInternalJson("https://example.com/api", {})).rejects.toThrow(
      /application-relative/u,
    );
    await expect(postInternalJson("//example.com/api", {})).rejects.toThrow(
      /application-relative/u,
    );
    expect(network).not.toHaveBeenCalled();
  });
});
