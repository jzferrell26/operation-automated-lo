import { afterEach, describe, expect, it, vi } from "vitest";
import { DomainClientError, domainErrorMessage, loadDomain, writeDomain } from "./client.js";
import { domainFixture, domainState } from "./domain.test-support.js";
afterEach(() => vi.unstubAllGlobals());
describe("strict domain UI client", () => {
  it("reads only the relative no-store current-owner API", async () => {
    const network = vi.fn().mockResolvedValue(Response.json(domainState()));
    vi.stubGlobal("fetch", network);
    expect(await loadDomain()).toEqual(domainState());
    expect(network).toHaveBeenCalledWith(
      "/api/funnel-domains",
      expect.objectContaining({
        method: "GET",
        credentials: "same-origin",
        redirect: "error",
        cache: "no-store",
      }),
    );
  });
  it.each([
    { ...domainState(), providerToken: "secret" },
    { ...domainState(), canEdit: "yes" },
    { ...domainState(), domain: { ...domainFixture(), hostname: "https://evil.invalid/path" } },
  ])("refuses an invalid or extended response", async (body) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(body)));
    await expect(loadDomain()).rejects.toBeInstanceOf(DomainClientError);
  });
  it("rejects caller-added fields before a mutation", async () => {
    const network = vi.fn();
    vi.stubGlobal("fetch", network);
    await expect(
      writeDomain({
        action: "check",
        id: domainFixture().id,
        expectedRevision: domainFixture().revision,
        token: "x",
      } as never),
    ).rejects.toThrow();
    expect(network).not.toHaveBeenCalled();
  });
  it.each([
    [409, "DOMAIN_CONFLICT", "conflict"],
    [403, "DOMAIN_FORBIDDEN", "forbidden"],
    [429, "DOMAIN_UNAVAILABLE", "cooldown"],
    [503, "DOMAIN_UNAVAILABLE", "unavailable"],
  ] as const)(
    "maps refusal %s with a support reference and safe copy",
    async (status, code, reason) => {
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValue(
            Response.json(
              { error: code, stack: "secret-provider-token" },
              { status, headers: { "x-oalo-correlation-ref": "support-fixture" } },
            ),
          ),
      );
      let failure: unknown;
      try {
        await loadDomain();
      } catch (error) {
        failure = error;
      }
      expect(failure).toMatchObject({
        reason,
        refusal: { code, supportReference: "support-fixture" },
      });
      expect(domainErrorMessage(failure)).not.toMatch(/secret-provider|DOMAIN_/u);
    },
  );
  it("treats a lost write response as unconfirmed", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("raw private failure")));
    await expect(
      writeDomain({
        action: "disconnect",
        id: domainFixture().id,
        expectedRevision: domainFixture().revision,
      }),
    ).rejects.toMatchObject({ reason: "unconfirmed" });
  });
});
