import { createHash } from "node:crypto";

import { beforeAll, describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import {
  WebinarProviderLaunchInputSchema,
  WebinarDestinationSchema,
  WebinarAdCampaignManifestSchema,
} from "@oalo/contracts";
import { webinarVersion } from "../webinar-ads/webinar-foundation-fixtures.js";
import {
  compileWebinarPublisherDraft,
  createWebinarPublisherProjection,
  decodeWebinarPublisherResponse,
  usdMinorToNativeAmount,
  verifyWebinarPublisherMedia,
  compareWebinarPublisherReadBack,
  createWebinarPublisherNativeTransport,
  assertWebinarPublisherProjection,
  assertWebinarPublisherPng,
  webinarPublisherMultipart,
  materializeWebinarPublisherDraft,
  WEBINAR_PUBLISHER_NATIVE_OPERATIONS,
  LEADCONNECTOR_V2_API_VERSION,
  WEBINAR_PUBLISHER_WIRE_MAPPING_HASH,
} from "@oalo/ghl";

const hash = "a".repeat(64);
const now = "2026-10-14T00:00:00.000Z";
const end = "2026-10-16T18:30:00.000Z";
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);
const digest = createHash("sha256").update(png).digest("hex");
let validPng: Buffer;
beforeAll(async () => {
  validPng = await sharp({
    create: { width: 1080, height: 1080, channels: 4, background: "#123456" },
  })
    .png()
    .toBuffer();
});

function httpFixture(response: unknown = providerLinked()) {
  const fetch = vi.fn(async (_url: string, _init: RequestInit) => Response.json(response));
  const assertCurrent = vi.fn(async (_input: unknown) => undefined);
  const resolveLocationToken = vi.fn(async (_input: unknown) => ({
    locationId: "location123",
    accessToken: "synthetic_test_access_token_only",
  }));
  const transport = createWebinarPublisherNativeTransport({
    fetch,
    authority: { assertCurrent },
    resolveLocationToken,
    now: () => Date.parse(now),
  });
  return { fetch, assertCurrent, resolveLocationToken, transport };
}
function command(
  operation: "campaign" | "adset" | "ad" | "publish" | "pause" | "resume" | "upload",
) {
  const { projection, qualification, media, compiled } = ready();
  const drafts = materializeWebinarPublisherDraft(compiled, {
    campaignId: "campaign123",
    adsetId: "adset123",
  });
  return {
    operation,
    locationRef: "location_test01",
    projection,
    qualification:
      operation === "pause"
        ? {
            schemaVersion: 1,
            contractId: "CTR-003",
            contractRevision: 1,
            kind: "app_test",
            action: "pause",
            evidenceRef: qualification.evidenceRef,
            artifactHash: qualification.artifactHash,
            projectionHash: projection.projectionHash,
            wireMappingHash: qualification.wireMappingHash,
            locationId: qualification.locationId,
            adAccountId: qualification.adAccountId,
            campaignId: "campaign123",
            observedAt: qualification.observedAt,
            expiresAt: qualification.expiresAt,
          }
        : qualification,
    mediaReceipt: media,
    ...(["publish", "pause", "resume"].includes(operation)
      ? { parameters: { campaignId: "campaign123" } }
      : {}),
    body:
      operation === "upload"
        ? { bytes: validPng, name: "creative.png" }
        : operation === "campaign"
          ? drafts.campaign
          : operation === "adset"
            ? drafts.adset
            : operation === "ad"
              ? drafts.ad
              : { locationId: "location123" },
  };
}

describe("immutable projection and provider parity", () => {
  it("validates its canonical hash after storage and refuses drift", () => {
    const projection = ready().projection;
    expect(assertWebinarPublisherProjection(JSON.parse(JSON.stringify(projection)))).toEqual(
      projection,
    );
    expect(() =>
      assertWebinarPublisherProjection({
        ...projection,
        copy: { ...projection.copy, headline: "Changed" },
      }),
    ).toThrow();
  });
  it.each([
    ["unknown contract", { contractRevision: 2 }],
    ["partner identity", { advertiserIdentity: { kind: "realtor", displayName: "Partner" } }],
    ["extra placement", { placements: ["facebook_feed", "instagram_feed"] }],
    ["other category", { specialAdCategories: ["HOUSING", "CREDIT"] }],
    ["fractional cents", { budget: { ...input().budget, dailyBudgetMinor: 12.34 } }],
    ["insufficient total", { budget: { ...input().budget, totalBudgetMinor: 1 } }],
    [
      "secret URL",
      {
        destination: {
          ...input().destination,
          publicUrl: `${input().destination.publicUrl}?token=private`,
        },
      },
    ],
    [
      "private URL",
      {
        destination: {
          ...input().destination,
          publicUrl: "https://127.0.0.1/f/12345678-1234-4123-8123-123456789abc",
        },
      },
    ],
    ["zip geography", { geographies: [{ ...input().geographies[0], type: "zip" }] }],
    ["foreign country", { geographies: [{ ...input().geographies[0], countryCode: "CA" }] }],
    ["duplicate geography", { geographies: [input().geographies[0], input().geographies[0]] }],
    ["timezone drift", { schedule: { ...input().schedule, timezone: "America/New_York" } }],
  ])("rejects %s", (_label, override) => {
    expect(WebinarProviderLaunchInputSchema.safeParse({ ...input(), ...override }).success).toBe(
      false,
    );
  });
  it("emits native one-image feed DTOs only with exact synthetic proof", () => {
    const { projection, qualification, media } = ready();
    const result = compileWebinarPublisherDraft({
      projection,
      qualification: { ...qualification, kind: "local_synthetic" },
      media,
      now,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Unexpected refusal.");
    expect(result.fixtureOnly).toBe(true);
    expect(result.adset.budget.amount).toBe(12.34);
    expect(result.adset.audience.placements).toEqual({ facebook: ["feed"] });
    expect(result.ad.media[0].type).toBe("image");
    expect(result.ad.destinationLink).toBe(projection.destination.publicUrl);
    expect(result.campaign.specialAdCategories).toEqual(["HOUSING"]);
    expect(result).not.toHaveProperty("ready");
  });
  it.each(["pageId", "adAccountId", "locationId", "timezone", "projectionHash", "wireMappingHash"])(
    "refuses foreign proof %s",
    (field) => {
      const { projection, qualification, media } = ready();
      expect(
        compileWebinarPublisherDraft({
          projection,
          qualification: { ...qualification, [field]: "foreign123" },
          media,
          now,
        }),
      ).toMatchObject({ ok: false, code: "PROVIDER_CONTRACT_UNQUALIFIED" });
    },
  );
  it("refuses guessed budget, stop, expiry, Boolean and hard-cap evidence", () => {
    const { projection, qualification, media } = ready();
    const proofs = [
      true,
      { ...qualification, ready: true },
      { ...qualification, expiresAt: now },
      {
        ...qualification,
        schedule: { ...qualification.schedule, observedStop: "2026-10-17T00:00:00.000Z" },
      },
      { ...qualification, budget: { ...qualification.budget, amountMajor: 1234 } },
    ];
    for (const proof of proofs)
      expect(
        compileWebinarPublisherDraft({ projection, qualification: proof, media, now }).ok,
      ).toBe(false);
    const hard = createWebinarPublisherProjection({
      ...input(),
      budget: { ...input().budget, totalSemantics: "hard_cap" },
    });
    expect(
      compileWebinarPublisherDraft({ projection: hard, qualification, media, now }),
    ).toMatchObject({ ok: false, code: "PROVIDER_CONTRACT_UNQUALIFIED" });
    expect(
      compileWebinarPublisherDraft({ projection, qualification, media, now: end }),
    ).toMatchObject({ ok: false, code: "CAMPAIGN_EXPIRED" });
  });
  it("requires exact media receipts, not arbitrary public URLs", () => {
    const { projection, qualification, media } = ready();
    for (const receipt of [
      null,
      { ...media, digest: hash },
      { ...media, projectionRef: "projection_foreign" },
      { ...media, expiresAt: "2026-10-15T00:00:00.000Z" },
    ]) {
      expect(
        compileWebinarPublisherDraft({ projection, qualification, media: receipt, now }),
      ).toMatchObject({ ok: false, code: "MEDIA_UNQUALIFIED" });
    }
  });
  it("compares independently constructed native entities with exact identity/copy/media/targeting", () => {
    const actual = providerLinked();
    expect(
      compareWebinarPublisherReadBack(ready().compiled, actual, {
        campaignId: "campaign123",
        adsetId: "adset123",
        adId: "ad123",
      }).matches,
    ).toBe(true);
    const mutated = structuredClone(actual);
    mutated.adsets[0]!.ads[0]!.destinationLink = "https://webinar.example/f/other";
    expect(
      compareWebinarPublisherReadBack(ready().compiled, mutated, {
        campaignId: "campaign123",
        adsetId: "adset123",
        adId: "ad123",
      }),
    ).toMatchObject({ matches: false, differingFields: ["ad"] });
    expect(
      compareWebinarPublisherReadBack(
        ready().compiled,
        { ...actual, adsets: [] },
        { campaignId: "campaign123", adsetId: "adset123", adId: "ad123" },
      ).matches,
    ).toBe(false);
    expect(
      compareWebinarPublisherReadBack(ready().compiled, actual, {
        campaignId: "foreign123",
        adsetId: "adset123",
        adId: "ad123",
      }).matches,
    ).toBe(false);
  });
});

describe("bounded native HighLevel wire", () => {
  it("preserves old transport while qualifying each new frozen descriptor", () => {
    expect(LEADCONNECTOR_V2_API_VERSION).toBe("2021-07-28");
    for (const operation of Object.values(WEBINAR_PUBLISHER_NATIVE_OPERATIONS)) {
      expect(operation.version).toBe("v3");
      expect(Object.isFrozen(operation)).toBe(true);
    }
    expect(WEBINAR_PUBLISHER_NATIVE_OPERATIONS.ad.path).toBe("/ad-publishing/facebook/ads");
  });
  it("uses current location tokens and strips nested page secrets before hashing", async () => {
    const fixture = httpFixture({
      locationId: "location123",
      status: "connected",
      pricingModel: "connect_your_bm",
      pages: [
        {
          id: "123456",
          name: "Lending",
          accessToken: "SYNTHETIC_PAGE_TOKEN_SENTINEL",
          otherSecret: "SYNTHETIC_SECRET_SENTINEL",
        },
      ],
    });
    const result = await fixture.transport.execute({
      operation: "integration",
      locationRef: "location_test01",
    });
    const second = httpFixture({
      locationId: "location123",
      status: "connected",
      pricingModel: "connect_your_bm",
      pages: [{ id: "123456", name: "Lending" }],
    });
    const clean = await second.transport.execute({
      operation: "integration",
      locationRef: "location_test01",
    });
    expect(result.normalizedResultHash).toBe(clean.normalizedResultHash);
    expect(JSON.stringify(result)).not.toMatch(/SENTINEL|accessToken|otherSecret/u);
    expect(fixture.fetch).toHaveBeenCalledWith(
      "https://services.leadconnectorhq.com/ad-publishing/facebook/integration?locationId=location123",
      expect.objectContaining({
        method: "GET",
        redirect: "error",
        headers: expect.objectContaining({ Version: "v3" }),
      }),
    );
  });
  it("uses only qualified media/body bytes for native ad creation", async () => {
    const fixture = httpFixture(providerLinked().adsets[0]!.ads[0]);
    const result = await fixture.transport.execute(command("ad"));
    expect(result.normalized).toMatchObject({ id: "ad123", publishingStatus: "DRAFT" });
    expect(fixture.assertCurrent).toHaveBeenCalledOnce();
    const call = fixture.fetch.mock.calls[0]!;
    expect(call[0]).toBe("https://services.leadconnectorhq.com/ad-publishing/facebook/ads");
    expect(JSON.parse(String(call[1].body))).toMatchObject({
      media: [{ type: "image" }],
      destinationLink: input().destination.publicUrl,
    });
    expect(call[1].headers).not.toHaveProperty("Idempotency-Key");
  });
  it.each(["campaign", "adset"] as const)(
    "validates the %s request and provider parent",
    async (operation) => {
      const response = operation === "campaign" ? providerLinked() : providerLinked().adsets[0];
      const fixture = httpFixture(response);
      await expect(fixture.transport.execute(command(operation))).resolves.toHaveProperty(
        "normalized",
      );
      const wrong =
        operation === "campaign"
          ? { ...response, fbAdAccountId: "act_99999" }
          : { ...response, campaignId: "foreign123" };
      await expect(httpFixture(wrong).transport.execute(command(operation))).rejects.toMatchObject({
        classification: "UNCERTAIN_WRITE",
      });
    },
  );
  it("requires real server authority even when data claims App Test proof", async () => {
    const fixture = httpFixture();
    fixture.assertCurrent.mockRejectedValueOnce(new Error("SYNTHETIC_SECRET_SENTINEL"));
    await expect(fixture.transport.execute(command("publish"))).rejects.toMatchObject({
      classification: "DEPENDENCY_BLOCKED",
    });
    expect(fixture.fetch).not.toHaveBeenCalled();
  });
  it("refuses synthetic qualification before writes", async () => {
    const fixture = httpFixture();
    const request = command("publish");
    await expect(
      fixture.transport.execute({
        ...request,
        qualification: { ...request.qualification, kind: "local_synthetic" },
      }),
    ).rejects.toMatchObject({ classification: "DEPENDENCY_BLOCKED" });
    expect(fixture.fetch).not.toHaveBeenCalled();
  });
  it("keeps queued DRAFT distinct from completed publication", async () => {
    const result = await httpFixture().transport.execute(command("publish"));
    expect(result.normalized).toMatchObject({ publishingStatus: "DRAFT" });
    expect(result.normalized).not.toHaveProperty("fbCampaignId");
    expect(result.normalized).not.toHaveProperty("live");
  });
  it.each(["pause", "resume"] as const)(
    "requires %s acknowledgement and does not invent live state",
    async (operation) => {
      expect(
        (await httpFixture({ success: true }).transport.execute(command(operation))).normalized,
      ).toEqual({ success: true });
      await expect(
        httpFixture({ success: false }).transport.execute(command(operation)),
      ).rejects.toMatchObject({ classification: "UNCERTAIN_WRITE" });
    },
  );
  it("requires fresh independent pause proof and refuses expired resume", async () => {
    const fixture = httpFixture({ success: true });
    const request = command("pause");
    request.qualification.expiresAt = "2026-10-14T00:00:01.000Z";
    const later = createWebinarPublisherNativeTransport({
      fetch: fixture.fetch,
      authority: { assertCurrent: fixture.assertCurrent },
      resolveLocationToken: fixture.resolveLocationToken,
      now: () => Date.parse("2026-10-14T00:00:02.000Z"),
    });
    await expect(later.execute(request)).rejects.toMatchObject({
      classification: "DEPENDENCY_BLOCKED",
    });
    request.qualification.expiresAt = "2026-10-14T00:01:00.000Z";
    await expect(later.execute(request)).resolves.toHaveProperty("normalized");
    const resume = command("resume");
    resume.qualification.expiresAt = "2026-10-14T00:00:01.000Z";
    await expect(later.execute(resume)).rejects.toMatchObject({
      classification: "DEPENDENCY_BLOCKED",
    });
  });
  it.each([400, 401, 404, 409, 422, 429, 500, 302, 201])(
    "handles HTTP %i without retrying a write",
    async (status) => {
      const fixture = httpFixture();
      fixture.fetch.mockImplementationOnce(
        async () =>
          new Response("SYNTHETIC_SECRET_SENTINEL", { status, headers: { "retry-after": "2" } }),
      );
      await expect(fixture.transport.execute(command("publish"))).rejects.toThrow(
        /Webinar publisher operation refused/u,
      );
      expect(fixture.fetch).toHaveBeenCalledOnce();
    },
  );
  it("returns sanitized uncertainty for malformed success JSON", async () => {
    const fixture = httpFixture();
    fixture.fetch.mockImplementationOnce(async () => new Response("SYNTHETIC_SECRET_SENTINEL"));
    await expect(fixture.transport.execute(command("publish"))).rejects.toMatchObject({
      classification: "UNCERTAIN_WRITE",
    });
  });
  it.each([
    { operation: "delete", locationRef: "location_test01" },
    { operation: "pages", locationRef: "location_test01", url: "https://evil.example" },
    { operation: "pages", locationRef: "location_test01", query: { type: "interest" } },
    {
      operation: "pages",
      locationRef: "location_test01",
      parameters: { campaignId: "foreign123" },
    },
    { operation: "integration", locationRef: "location_test01", body: {} },
  ])("refuses unknown native operation input %#", async (request) => {
    const fixture = httpFixture();
    await expect(fixture.transport.execute(request)).rejects.toThrow();
    expect(fixture.fetch).not.toHaveBeenCalled();
  });
  it("forces existing-page pagination and US geography search taxonomy", async () => {
    const pages = httpFixture({
      pages: [{ id: "123456", name: "Lending", isConnected: true }],
      paging: { next: "opaque_cursor" },
    });
    await pages.transport.execute({
      operation: "pages",
      locationRef: "location_test01",
      query: { limit: 12, after: "opaque_old" },
    });
    expect(pages.fetch.mock.calls[0]![0]).toContain("fetchExisting=true");
    const geo = httpFixture([
      { key: "1234", name: "Illinois", type: "region", country_code: "US" },
    ]);
    await geo.transport.execute({
      operation: "geography",
      locationRef: "location_test01",
      query: { query: "Illinois" },
    });
    expect(geo.fetch.mock.calls[0]![0]).toContain("type=geolocation");
  });
  it("bounds stalled writes including a transport that ignores abort", async () => {
    const fixture = httpFixture();
    fixture.fetch.mockImplementationOnce(() => new Promise<Response>(() => undefined));
    const transport = createWebinarPublisherNativeTransport({
      fetch: fixture.fetch,
      authority: { assertCurrent: fixture.assertCurrent },
      resolveLocationToken: fixture.resolveLocationToken,
      now: () => Date.parse(now),
      requestTimeoutMs: 10,
    });
    await expect(transport.execute(command("publish"))).rejects.toMatchObject({
      classification: "UNCERTAIN_WRITE",
    });
  });
  it("rejects oversized and foreign-location responses", async () => {
    const fixture = httpFixture();
    fixture.fetch.mockImplementationOnce(
      async () => new Response("{}", { headers: { "content-length": "2097153" } }),
    );
    await expect(
      fixture.transport.execute({ operation: "integration", locationRef: "location_test01" }),
    ).rejects.toMatchObject({ classification: "TRANSIENT_PROVIDER" });
    await expect(
      httpFixture({
        locationId: "foreign123",
        status: "connected",
        pricingModel: "connect_your_bm",
        pages: [],
      }).transport.execute({ operation: "integration", locationRef: "location_test01" }),
    ).rejects.toMatchObject({ classification: "TRANSIENT_PROVIDER" });
  });
});

describe("exact PNG receipt and media ingestion", () => {
  it("verifies structure, raster bytes and multipart binary upload", async () => {
    expect(assertWebinarPublisherPng(validPng)).toEqual({ width: 1080, height: 1080 });
    const form = webinarPublisherMultipart({ bytes: validPng, name: "creative.png" });
    expect(form.get("hosted")).toBe("false");
    expect(Buffer.from(await (form.get("file") as File).arrayBuffer())).toEqual(validPng);
    const fixture = httpFixture({
      fileId: "file123",
      url: "https://storage.googleapis.com/approved/creative.png",
    });
    await fixture.transport.execute(command("upload"));
    expect(fixture.fetch.mock.calls[0]![1].body).toBeInstanceOf(FormData);
    expect(fixture.fetch.mock.calls[0]![1].headers).not.toHaveProperty("Content-Type");
  });
  it("refuses corrupt, truncated, trailing and unreviewed media", () => {
    const corrupt = Buffer.from(validPng);
    corrupt[30] = (corrupt[30] ?? 0) ^ 1;
    for (const bytes of [
      png,
      corrupt,
      validPng.subarray(0, 50),
      Buffer.concat([validPng, Buffer.from([0])]),
    ]) {
      expect(() => assertWebinarPublisherPng(bytes)).toThrow();
    }
    const request = command("upload");
    expect(() =>
      verifyWebinarPublisherMedia({
        projection: {
          ...request.projection,
          creative: { ...request.projection.creative, digest: hash },
        },
        bytes: validPng,
        url: "https://storage.googleapis.com/approved/creative.png",
        fileId: "file123",
        allowedOrigins: ["https://storage.googleapis.com"],
        now,
        expiresAt: end,
      }),
    ).toThrow();
  });
  it("fetches public media with bounded unauthenticated HTTP and refuses foreign origins", async () => {
    const fixture = httpFixture();
    fixture.fetch.mockImplementationOnce(
      async () =>
        new Response(Uint8Array.from(validPng), { headers: { "content-type": "image/png" } }),
    );
    expect(
      Buffer.from(
        await fixture.transport.retrieveMedia(
          "https://storage.googleapis.com/approved/creative.png",
          ["https://storage.googleapis.com"],
        ),
      ),
    ).toEqual(validPng);
    expect(fixture.fetch.mock.calls[0]![1]).not.toHaveProperty("headers");
    await expect(
      fixture.transport.retrieveMedia("https://evil.example/creative.png", [
        "https://evil.example",
      ]),
    ).rejects.toThrow();
    expect(fixture.fetch).toHaveBeenCalledOnce();
  });
});

describe("read-only reporting and authority deadlines", () => {
  it("keeps missing metrics distinct from zero and Meta actions distinct from CDP contacts", async () => {
    const fixture = httpFixture({
      _id: "campaign123",
      name: "Webinar",
      objective: "OUTCOME_TRAFFIC",
      publishingStatus: "PAUSED",
      fbCampaignId: "987654321",
      clicks: "32",
      spend: "1.16",
      results: { lead: "5", linkClick: "22" },
      leads: "4",
    });
    const result = await fixture.transport.execute({
      operation: "reporting",
      locationRef: "location_test01",
      parameters: { campaignId: "campaign123" },
      query: { startDate: "2026-10-01", endDate: "2026-10-14" },
    });
    expect(result.normalized).toMatchObject({ spend: "1.16", results: { lead: "5" }, leads: "4" });
    expect(result.normalized).not.toHaveProperty("impressions");
    expect(result.requestHash).toMatch(/^[a-f0-9]{64}$/u);
    expect(fixture.fetch.mock.calls[0]![0]).toContain("startDate=2026-10-01");
  });
  it("rejects missing or inverted reporting windows and foreign report identifiers", async () => {
    const fixture = httpFixture();
    const base = {
      operation: "reporting",
      locationRef: "location_test01",
      parameters: { campaignId: "campaign123" },
    };
    await expect(fixture.transport.execute(base)).rejects.toThrow();
    await expect(
      fixture.transport.execute({
        ...base,
        query: { startDate: "2026-10-15", endDate: "2026-10-14" },
      }),
    ).rejects.toThrow();
    expect(fixture.fetch).not.toHaveBeenCalled();
    expect(() =>
      decodeWebinarPublisherResponse(
        "reporting",
        {
          _id: "foreign123",
          name: "Webinar",
          objective: "OUTCOME_TRAFFIC",
          publishingStatus: "PUBLISHED",
          fbCampaignId: "987654321",
        },
        { locationId: "location123", campaignId: "campaign123" },
      ),
    ).toThrow();
  });
  it("retains safe rate-limit backoff metadata without provider failure bodies", async () => {
    const fixture = httpFixture();
    fixture.fetch.mockImplementationOnce(
      async () =>
        new Response("SYNTHETIC_SECRET_SENTINEL", { status: 429, headers: { "retry-after": "2" } }),
    );
    await expect(fixture.transport.execute(command("publish"))).rejects.toMatchObject({
      classification: "RATE_LIMITED",
      rateLimit: { retryAfterMilliseconds: 2000 },
    });
  });
  it("never dispatches an already-aborted command", async () => {
    const fixture = httpFixture();
    const controller = new AbortController();
    controller.abort();
    await expect(
      fixture.transport.execute(command("publish"), controller.signal),
    ).rejects.toMatchObject({ classification: "DEPENDENCY_BLOCKED" });
    expect(fixture.resolveLocationToken).not.toHaveBeenCalled();
    expect(fixture.fetch).not.toHaveBeenCalled();
  });
  it("bounds a stalled token resolver without dispatching", async () => {
    const fixture = httpFixture();
    const transport = createWebinarPublisherNativeTransport({
      fetch: fixture.fetch,
      authority: { assertCurrent: fixture.assertCurrent },
      resolveLocationToken: () => new Promise<unknown>(() => undefined),
      requestTimeoutMs: 10,
    });
    await expect(
      transport.execute({ operation: "integration", locationRef: "location_test01" }),
    ).rejects.toMatchObject({ classification: "DEPENDENCY_BLOCKED" });
    expect(fixture.fetch).not.toHaveBeenCalled();
  });
});

function ready() {
  const source = input();
  source.creative.digest = createHash("sha256").update(validPng).digest("hex");
  source.creative.byteLength = validPng.length;
  const projection = createWebinarPublisherProjection(source);
  const qualification = {
    schemaVersion: 1,
    contractId: "CTR-003",
    contractRevision: 1,
    kind: "app_test",
    evidenceRef: "evidence_test01",
    artifactHash: hash,
    projectionHash: projection.projectionHash,
    wireMappingHash: WEBINAR_PUBLISHER_WIRE_MAPPING_HASH,
    evidenceRevision: 1,
    locationId: "location123",
    adAccountId: "act_123456",
    pageId: "123456",
    currency: "USD",
    timezone: "America/Chicago",
    observedAt: now,
    expiresAt: end,
    schedule: {
      format: "offset_datetime",
      requestEnd: end,
      observedStop: end,
      requestHash: hash,
      readBackHash: hash,
    },
    budget: {
      mode: "DAILY",
      amountMajor: 12.34,
      totalSemantics: "estimated_ceiling",
      requestHash: hash,
      readBackHash: hash,
    },
  };
  const media = verifyWebinarPublisherMedia({
    projection,
    bytes: validPng,
    url: "https://storage.googleapis.com/approved/creative.png",
    fileId: "file123",
    allowedOrigins: ["https://storage.googleapis.com"],
    now,
    expiresAt: end,
  });
  const compiled = compileWebinarPublisherDraft({ projection, qualification, media, now });
  if (!compiled.ok) throw new Error("Test qualification failed.");
  return { projection, qualification, media, compiled };
}
function providerLinked() {
  const name = `OALO Webinar ${ready().projection.projectionHash.slice(0, 16)}`;
  return {
    id: "campaign123",
    name,
    locationId: "location123",
    fbAdAccountId: "act_123456",
    objective: "OUTCOME_TRAFFIC",
    specialAdCategories: ["HOUSING"],
    publishingStatus: "DRAFT",
    adsets: [
      {
        id: "adset123",
        name,
        campaignId: "campaign123",
        publishingStatus: "DRAFT",
        pageId: "123456",
        budget: { budgetType: "DAILY", amount: 12.34, scheduleEndDate: end },
        audience: {
          geoLocations: [
            {
              key: "1234",
              name: "Illinois",
              type: "region",
              countryCode: "US",
              selectionType: "include",
            },
          ],
          placementType: "manual",
          placements: { facebook: ["feed"] },
        },
        ads: [
          {
            id: "ad123",
            name,
            campaignId: "campaign123",
            adsetId: "adset123",
            publishingStatus: "DRAFT",
            mediaType: "SINGLE",
            cta: "LEARN_MORE",
            multiAdvertiserAds: false,
            primaryTexts: [{ text: "Learn about buying your first home." }],
            headlines: [{ text: "Free homebuyer webinar" }],
            descriptions: [{ text: "Join the webinar." }],
            media: [
              {
                src: "https://storage.googleapis.com/approved/creative.png",
                type: "image",
                name: "asset_webinar01.png",
              },
            ],
            destinationLink: "https://webinar.example/f/12345678-1234-4123-8123-123456789abc",
          },
        ],
      },
    ],
  };
}

function input() {
  return {
    schemaVersion: 1,
    kind: "webinar-provider-launch",
    contractId: "CTR-003",
    contractRevision: 1,
    projectionRef: "projection_webinar01",
    locationRef: "location_test01",
    campaignRef: "campaign_webinar01",
    campaignVersionRef: "version_webinar01",
    manifestHash: hash,
    preflightHash: hash,
    approvalRef: "approval_webinar01",
    destination: {
      publicationId: "12345678-1234-4123-8123-123456789abc",
      sourceRevision: "00000000-0000-4000-8000-000000000802",
      snapshotHash: hash,
      destinationHash: hash,
      publicUrl: "https://webinar.example/f/12345678-1234-4123-8123-123456789abc",
    },
    templateSourceHash: hash,
    brandHash: hash,
    copyHash: hash,
    advertiserIdentity: { kind: "loan_officer", displayName: "Example Lending" },
    copy: {
      primaryText: "Learn about buying your first home.",
      headline: "Free homebuyer webinar",
      description: "Join the webinar.",
    },
    creative: {
      shape: "square",
      assetRef: "asset_webinar01",
      digest,
      width: 1080,
      height: 1080,
      byteLength: png.length,
      rendererVersion: "1.0.0",
    },
    assets: {
      locationId: "location123",
      adAccountId: "act_123456",
      pageId: "123456",
      discoveryHash: hash,
      currency: "USD",
      timezone: "America/Chicago",
    },
    objective: "OUTCOME_TRAFFIC",
    cta: "LEARN_MORE",
    placements: ["facebook_feed"],
    specialAdCategories: ["HOUSING"],
    geographies: [
      {
        key: "1234",
        name: "Illinois",
        type: "region",
        countryCode: "US",
        selectionType: "include",
        discoveryHash: hash,
      },
    ],
    schedule: { startPolicy: "immediate", endsAt: end, timezone: "America/Chicago" },
    budget: {
      currency: "USD",
      dailyBudgetMinor: 1234,
      totalBudgetMinor: 5000,
      nativeMode: "DAILY",
      totalSemantics: "estimated_ceiling",
      boundsHash: hash,
    },
    providerContract: {
      evidenceRevision: 1,
      apiVersion: "v3",
      wireMappingHash: WEBINAR_PUBLISHER_WIRE_MAPPING_HASH,
    },
    createdBy: "actor_test01",
    createdAt: now,
  };
}

describe("M-PUB-01 actual destination compatibility", () => {
  it("preserves the actual CTR-002 parsed UUID in projection construction and hash round-trip", async () => {
    const saved = await webinarVersion();
    const manifest = WebinarAdCampaignManifestSchema.parse(saved.manifest);
    const destination = WebinarDestinationSchema.parse(manifest.destination);
    const projection = createWebinarPublisherProjection({
      ...input(),
      destination: {
        publicationId: destination.publicationId,
        sourceRevision: destination.sourceRevision,
        snapshotHash: destination.snapshotHash,
        destinationHash: manifest.destinationHash,
        publicUrl: destination.publicUrl,
      },
    });
    expect(projection.destination.sourceRevision).toBe(destination.sourceRevision);
    expect(
      assertWebinarPublisherProjection(JSON.parse(JSON.stringify(projection))).destination,
    ).toEqual(projection.destination);
    expect(compileWebinarPublisherDraft({ projection, qualification: null, now })).toMatchObject({
      ok: false,
      code: "PROVIDER_CONTRACT_UNQUALIFIED",
    });
    expect(manifest.meta.enabled).toBe(false);
    expect(saved.manifest).toEqual(manifest);
  });
  it.each([1, 0, -1, "1", "revision_invalid", null])(
    "rejects a non-UUID source revision %j without coercion",
    (sourceRevision) => {
      expect(
        WebinarProviderLaunchInputSchema.safeParse({
          ...input(),
          destination: { ...input().destination, sourceRevision },
        }).success,
      ).toBe(false);
    },
  );
  it("binds a changed UUID to a new projection and refuses stale qualification", () => {
    const { projection, qualification, media } = ready();
    const destination = {
      ...projection.destination,
      sourceRevision: "00000000-0000-4000-8000-000000000899",
    };
    expect(() => assertWebinarPublisherProjection({ ...projection, destination })).toThrow();
    const { projectionHash: _oldHash, ...body } = projection;
    const changed = createWebinarPublisherProjection({ ...body, destination });
    expect(changed.projectionHash).not.toBe(projection.projectionHash);
    expect(
      compileWebinarPublisherDraft({ projection: changed, qualification, media, now }),
    ).toMatchObject({ ok: false, code: "PROVIDER_CONTRACT_UNQUALIFIED" });
  });
  it("preserves UUID evidence through compilation, current authority and native read-back", async () => {
    const request = command("ad");
    const revision = WebinarDestinationSchema.shape.sourceRevision.parse(
      input().destination.sourceRevision,
    );
    const fixture = httpFixture(providerLinked().adsets[0]!.ads[0]);
    await fixture.transport.execute(request);
    expect(fixture.assertCurrent.mock.calls[0]![0]).toMatchObject({
      projection: { destination: { sourceRevision: revision } },
    });
    const { compiled } = ready();
    expect(compiled.projection.destination.sourceRevision).toBe(revision);
    expect(
      compareWebinarPublisherReadBack(compiled, providerLinked(), {
        campaignId: "campaign123",
        adsetId: "adset123",
        adId: "ad123",
      }).matches,
    ).toBe(true);
    expect(input().providerContract.evidenceRevision).toBe(1);
    expect(input().contractRevision).toBe(1);
  });
});

describe("native webinar adapter boundary", () => {
  it("maps cents to documented account-currency dollars", () => {
    expect(usdMinorToNativeAmount(1234)).toBe(12.34);
    for (const invalid of [0, -1, 0.1, Number.MAX_SAFE_INTEGER + 1, Infinity]) {
      expect(() => usdMinorToNativeAmount(invalid)).toThrow();
    }
  });
  it("rejects additional identity and targeting authority", () => {
    expect(WebinarProviderLaunchInputSchema.safeParse(input()).success).toBe(true);
    expect(
      WebinarProviderLaunchInputSchema.safeParse({ ...input(), realtorIdentity: "Realtor" })
        .success,
    ).toBe(false);
    expect(
      WebinarProviderLaunchInputSchema.safeParse({ ...input(), specialAdCategories: ["NONE"] })
        .success,
    ).toBe(false);
  });
  it("does not compile guessed date or hard-cap mappings", () => {
    const projection = createWebinarPublisherProjection(input());
    expect(compileWebinarPublisherDraft({ projection, qualification: null, now })).toMatchObject({
      ok: false,
      code: "PROVIDER_CONTRACT_UNQUALIFIED",
    });
  });
  it("drops page access tokens before producing discovery results", () => {
    const decoded = decodeWebinarPublisherResponse(
      "integration",
      {
        locationId: "location123",
        status: "connected",
        pricingModel: "connect_your_bm",
        fbAdAccountId: "act_123456",
        pages: [
          { id: "123456", name: "Example Lending", accessToken: "DO_NOT_PERSIST_PAGE_TOKEN" },
        ],
      },
      { locationId: "location123" },
    );
    expect(JSON.stringify(decoded)).not.toContain("DO_NOT_PERSIST");
    expect(decoded).toEqual({
      locationId: "location123",
      status: "connected",
      pricingModel: "connect_your_bm",
      fbAdAccountId: "act_123456",
      pages: [{ id: "123456", name: "Example Lending" }],
    });
  });
  it("rejects foreign discovery locations", () => {
    expect(() =>
      decodeWebinarPublisherResponse(
        "integration",
        {
          locationId: "foreign123",
          status: "connected",
          pricingModel: "connect_your_bm",
          pages: [],
        },
        { locationId: "location123" },
      ),
    ).toThrow();
  });
  it("does not label a publish queue acknowledgement live", () => {
    expect(
      decodeWebinarPublisherResponse(
        "progress",
        {
          campaignId: "campaign123",
          publishingStatus: "FAILED",
          total: 3,
          processed: 3,
          isComplete: true,
          hasFailed: true,
        },
        { locationId: "location123", campaignId: "campaign123" },
      ),
    ).toMatchObject({ publishingStatus: "FAILED", hasFailed: true });
  });
  it("refuses media whose digest or decoded dimensions differ from the approved bytes", () => {
    const projection = createWebinarPublisherProjection(input());
    expect(() =>
      verifyWebinarPublisherMedia({
        projection,
        bytes: png,
        url: "https://storage.googleapis.com/approved/creative.png",
        fileId: "file123",
        allowedOrigins: ["https://storage.googleapis.com"],
        now,
        expiresAt: end,
      }),
    ).toThrow();
  });
  it("refuses targeting expansion in actual provider read-back", () => {
    const actual = providerLinked();
    Object.assign(actual.adsets[0]!.audience, { interests: [{ id: "secretInterest" }] });
    expect(() =>
      compareWebinarPublisherReadBack(ready().compiled, actual, {
        campaignId: "campaign123",
        adsetId: "adset123",
        adId: "ad123",
      }),
    ).toThrow();
  });
  it("refuses native copy drift before making a provider write", async () => {
    const { projection, qualification, media, compiled } = ready();
    const fetch = vi.fn(async () => Response.json(providerLinked().adsets[0]!.ads[0]));
    const authority = { assertCurrent: vi.fn(async () => undefined) };
    const transport = createWebinarPublisherNativeTransport({
      fetch,
      authority,
      resolveLocationToken: async () => ({
        locationId: "location123",
        accessToken: "synthetic_test_access_token_only",
      }),
      now: () => Date.parse(now),
    });
    await expect(
      transport.execute({
        operation: "ad",
        locationRef: "location_test01",
        projection,
        qualification,
        mediaReceipt: media,
        body: {
          ...compiled.ad,
          campaignId: "campaign123",
          adsetId: "adset123",
          primaryTexts: [{ text: "Unreviewed alternate copy" }],
        },
      }),
    ).rejects.toThrow();
    expect(fetch).not.toHaveBeenCalled();
  });
});
