import { afterEach, describe, expect, it, vi } from "vitest";

import { SUPPORT_REFERENCE_NOT_RECORDED } from "../../copy/user-language.js";
import { CORRELATION_REFERENCE_HEADER } from "../../server/correlation-boundary.js";
import {
  postInternalJson,
  getInternalJson,
  refusalFrom,
  supportReferenceFrom,
  SUPPORT_REFERENCE_HEADER,
  UNREACHED_REFUSAL,
} from "./internal-api.js";

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
  it("rejects backslash and control-character host escapes for reads and writes", async () => {
    const network = vi.fn(async () => new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", network);
    for (const path of [
      "/\\outside.example/report",
      "/\n/outside.example/report",
      "//outside.example/report",
      "https://outside.example/report",
    ]) {
      await expect(getInternalJson(path)).rejects.toThrow("application-relative");
      await expect(postInternalJson(path, {})).rejects.toThrow("application-relative");
    }
    expect(network).not.toHaveBeenCalled();
    await getInternalJson("/api/homeowner-reports");
    expect(network).toHaveBeenCalledWith(
      "/api/homeowner-reports",
      expect.objectContaining({
        method: "GET",
        cache: "no-store",
        credentials: "same-origin",
        redirect: "error",
      }),
    );
  });
});

/**
 * PRD-006b D7 and D8. What a refused request gives a person to quote.
 *
 * The browser half of the support reference names the header itself, because the module that sets
 * it reads `node:crypto` and cannot be imported into a page. Two spellings of one header is exactly
 * the kind of drift that shows up as an empty support row months later, so the first case here
 * imports both and compares them.
 */
describe("the support reference a refusal carries", () => {
  it("reads the same header the routes write", () => {
    expect(SUPPORT_REFERENCE_HEADER).toBe(CORRELATION_REFERENCE_HEADER);
  });

  it("takes the reference off a response that carried one", () => {
    const response = new Response(null, {
      status: 500,
      headers: { [SUPPORT_REFERENCE_HEADER]: "correlation_approve_0a1b2c3d4e5f60718293a4b5" },
    });

    expect(supportReferenceFrom(response)).toBe("correlation_approve_0a1b2c3d4e5f60718293a4b5");
  });

  it("says so rather than showing an empty row when the response carried none", () => {
    expect(supportReferenceFrom(new Response(null, { status: 500 }))).toBe(
      SUPPORT_REFERENCE_NOT_RECORDED,
    );
    expect(
      supportReferenceFrom(
        new Response(null, { status: 500, headers: { [SUPPORT_REFERENCE_HEADER]: "   " } }),
      ),
    ).toBe(SUPPORT_REFERENCE_NOT_RECORDED);
  });

  it("reads the code and the reference a refusal answered with", async () => {
    const refusal = await refusalFrom(
      new Response(JSON.stringify({ error: "CAMPAIGN_APPROVAL_CONFLICT" }), {
        status: 409,
        headers: {
          "content-type": "application/json",
          [SUPPORT_REFERENCE_HEADER]: "correlation_approve_1111222233334444aaaabbbb",
        },
      }),
    );

    expect(refusal).toEqual({
      code: "CAMPAIGN_APPROVAL_CONFLICT",
      supportReference: "correlation_approve_1111222233334444aaaabbbb",
    });
  });

  it("names no code when the body is not JSON or holds none", async () => {
    expect(await refusalFrom(new Response("<html>gateway</html>", { status: 502 }))).toEqual({
      code: undefined,
      supportReference: SUPPORT_REFERENCE_NOT_RECORDED,
    });
    expect(
      await refusalFrom(
        new Response(JSON.stringify({ state: "refused" }), {
          status: 400,
          headers: { "content-type": "application/json" },
        }),
      ),
    ).toEqual({ code: undefined, supportReference: SUPPORT_REFERENCE_NOT_RECORDED });
  });

  it("has an answer for a request that never reached a route", () => {
    expect(UNREACHED_REFUSAL.code).toBeUndefined();
    expect(UNREACHED_REFUSAL.supportReference).toBe(SUPPORT_REFERENCE_NOT_RECORDED);
  });
});
