import { describe, expect, it } from "vitest";
import { createVercelFinancingClientResolver } from "./financing-release-vercel-client.js";

const environment = {
  OALO_FINANCING_CLIENT_IDENTITY_PROFILE: "vercel-direct-v1",
  OALO_FINANCING_VERCEL_PROJECT_ID: "prj_FixtureOwnedProject",
  OALO_FINANCING_VERCEL_ENVIRONMENT: "production",
  OALO_ENVIRONMENT: "production",
  VERCEL: "1",
  VERCEL_PROJECT_ID: "prj_FixtureOwnedProject",
  VERCEL_ENV: "production",
};
const request = (ip: string, extra: Record<string, string> = {}) =>
  new Request("https://reports.example.com/p/fixture/inquiry", {
    method: "POST",
    headers: { "x-vercel-forwarded-for": ip, ...extra },
  });
describe("direct Vercel financing client identity", () => {
  it("returns canonical family-tagged numeric IPv4 bytes", async () => {
    const resolver = createVercelFinancingClientResolver(environment);
    expect(await resolver(request("192.0.2.1"))).toEqual(Uint8Array.from([1, 4, 192, 0, 2, 1]));
    expect(await resolver(request("192.0.2.2"))).not.toEqual(await resolver(request("192.0.2.1")));
  });
  it("normalizes equivalent IPv6 spellings and mapped IPv4", async () => {
    const resolver = createVercelFinancingClientResolver(environment);
    expect(await resolver(request("2001:db8::1"))).toEqual(
      await resolver(request("2001:0DB8:0000:0000:0000:0000:0000:0001")),
    );
    expect(await resolver(request("::ffff:192.0.2.1"))).toEqual(
      await resolver(request("::FFFF:c000:0201")),
    );
    expect(await resolver(request("::ffff:192.0.2.1"))).toEqual(
      await resolver(request("192.0.2.1")),
    );
    expect(await resolver(request("2001:db8::1"))).toEqual(
      Uint8Array.from([1, 6, 32, 1, 13, 184, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1]),
    );
    expect(await resolver(request("::192.0.2.1"))).not.toEqual(
      await resolver(request("192.0.2.1")),
    );
  });
  it("does not share mutable bucket arrays", async () => {
    const resolver = createVercelFinancingClientResolver(environment);
    const value = await resolver(request("192.0.2.1"));
    value.fill(0);
    expect(await resolver(request("192.0.2.1"))).toEqual(Uint8Array.from([1, 4, 192, 0, 2, 1]));
  });
  it("handles IPv6 compression at either end, all zero and full-width addresses", async () => {
    const resolver = createVercelFinancingClientResolver(environment);
    expect(await resolver(request("::"))).toEqual(
      Uint8Array.from([1, 6, ...Array<number>(16).fill(0)]),
    );
    expect(await resolver(request("2001:db8::"))).toEqual(
      await resolver(request("2001:db8:0:0:0:0:0:0")),
    );
    expect(await resolver(request("::1"))).toEqual(await resolver(request("0:0:0:0:0:0:0:1")));
    expect(await resolver(request("ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff"))).toEqual(
      Uint8Array.from([1, 6, ...Array<number>(16).fill(255)]),
    );
    expect(await resolver(request("2001:db8::192.0.2.1"))).toEqual(
      await resolver(request("2001:db8::c000:201")),
    );
    // Without brackets this is a valid IPv6 address, not a distinguishable port suffix.
    expect(await resolver(request("2001:db8::1:443"))).toEqual(
      await resolver(request("2001:db8:0:0:0:0:1:443")),
    );
  });
  it.each([null, false, "vercel-direct-v1", []])(
    "rejects invalid environment objects %s",
    (value) => {
      expect(() => createVercelFinancingClientResolver(value)).toThrow(
        "FINANCING_RELEASE_UNAVAILABLE",
      );
    },
  );
  it("captures validated server configuration without retaining a mutable caller object", async () => {
    const values = { ...environment };
    const resolver = createVercelFinancingClientResolver(values);
    values.VERCEL_PROJECT_ID = "prj_OtherProject";
    expect(await resolver(request("192.0.2.1"))).toEqual(Uint8Array.from([1, 4, 192, 0, 2, 1]));
    expect(() => createVercelFinancingClientResolver(values)).toThrow(
      "FINANCING_RELEASE_UNAVAILABLE",
    );
  });
  it.each([
    "",
    "not-an-ip",
    "192.0.2.1, 198.51.100.1",
    "192.0.2.1,192.0.2.1",
    "192.0.2.1:443",
    "[2001:db8::1]:443",
    "[2001:db8::1]",
    "fe80::1%eth0",
    "fe80::1%25eth0",
    "192.0.2.1/path",
    "192.0.2.1/32",
    "::1/128",
    "http://192.0.2.1",
    "0192.0.2.1",
    "192.0.2",
    "3232235777",
    "0xc0000201",
    "256.0.0.1",
    "192.0.2.1 .",
    "2001:::1",
    "1:2:3:4:5:6:7:8:9",
    "::ffff:192.0.02.1",
    "a".repeat(46),
  ])("refuses malformed or ambiguous identity %s", async (value) => {
    const resolver = createVercelFinancingClientResolver(environment);
    await expect(resolver(request(value))).rejects.toThrow("FINANCING_RELEASE_UNAVAILABLE");
  });
  it("rejects actual duplicate header fields coalesced by Fetch Headers", async () => {
    const headers = new Headers();
    headers.append("x-vercel-forwarded-for", "192.0.2.1");
    headers.append("X-Vercel-Forwarded-For", "192.0.2.1");
    await expect(
      createVercelFinancingClientResolver(environment)(
        new Request("https://reports.example.com", { headers }),
      ),
    ).rejects.toThrow();
  });
  it("never substitutes ordinary forwarding headers, deployment headers or visitor cookies", async () => {
    const resolver = createVercelFinancingClientResolver(environment);
    const spoof = {
      "x-forwarded-for": "198.51.100.1",
      "x-real-ip": "198.51.100.2",
      "x-vercel-id": "fixture-platform-looking",
      "x-vercel-deployment-url": "owned-looking.vercel.app",
      cookie: "nonce=visitor-input",
    };
    expect(await resolver(request("192.0.2.1", spoof))).toEqual(
      await resolver(request("192.0.2.1")),
    );
    await expect(
      resolver(new Request("https://reports.example.com", { headers: spoof })),
    ).rejects.toThrow();
  });
  it.each([
    { OALO_FINANCING_CLIENT_IDENTITY_PROFILE: undefined },
    { OALO_FINANCING_CLIENT_IDENTITY_PROFILE: "external-proxy" },
    { VERCEL: undefined },
    { VERCEL: "true" },
    { VERCEL: "0" },
    { VERCEL_PROJECT_ID: undefined },
    { VERCEL_PROJECT_ID: "prj_OtherProject" },
    { OALO_FINANCING_VERCEL_PROJECT_ID: undefined },
    { OALO_FINANCING_VERCEL_ENVIRONMENT: undefined },
    { VERCEL_ENV: "development" },
    { VERCEL_ENV: "preview" },
    { OALO_ENVIRONMENT: "local" },
    { OALO_ENVIRONMENT: "test" },
    { OALO_ENVIRONMENT: "preview" },
  ])(
    "requires explicit server deployment profile and exact project/runtime environment",
    (change) => {
      expect(() => createVercelFinancingClientResolver({ ...environment, ...change })).toThrow(
        "FINANCING_RELEASE_UNAVAILABLE",
      );
    },
  );
  it("supports explicitly selected hosted preview/staging profiles", async () => {
    for (const runtime of ["preview", "staging"]) {
      const resolver = createVercelFinancingClientResolver({
        ...environment,
        OALO_FINANCING_VERCEL_ENVIRONMENT: "preview",
        VERCEL_ENV: "preview",
        OALO_ENVIRONMENT: runtime,
      });
      expect(await resolver(request("2001:db8::1"))).toHaveLength(18);
    }
  });
  it("returns sanitized refusal without raw IP or server project details", async () => {
    const resolver = createVercelFinancingClientResolver(environment);
    try {
      await resolver(request("private-invalid-client-value"));
      throw new Error("Unexpected acceptance");
    } catch (error) {
      expect(error).toMatchObject({
        code: "UNAVAILABLE",
        status: 503,
        message: "FINANCING_RELEASE_UNAVAILABLE",
      });
      expect(JSON.stringify(error)).not.toContain("private-invalid-client-value");
      expect(JSON.stringify(error)).not.toContain("prj_");
    }
  });
});
