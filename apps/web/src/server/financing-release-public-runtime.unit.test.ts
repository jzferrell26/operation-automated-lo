import { describe, expect, it, vi, afterEach } from "vitest";
import {
  prepareFinancingRelease,
  transitionFinancingRelease,
  canonicalCampaignHash as hash,
  type FinancingReleasePorts,
  type FinancingReleaseTransaction,
} from "@oalo/application";
import type { FinancingReleaseRecord } from "@oalo/contracts";
import { FinancingReleasePrepareRequestSchema } from "@oalo/contracts";
import { chromium } from "@playwright/test";
import type { DatabasePool, SqlRequest } from "@oalo/db";
import * as databaseModule from "@oalo/db";
import { createDecipheriv, createHmac } from "node:crypto";
import { POST as exportedInquiryPost } from "../app/p/[publicationId]/inquiry/route.js";
import {
  parsePublicFinancingConfiguration,
  canonicalPublicFinancingRequest,
  resolvePublicPropertyMedia,
  createPublicFinancingRuntime,
  createNativePublicFinancingAdmission,
  handlePublicFinancingRequest,
} from "./financing-release-public-runtime.js";
import { createPublicFinancingOutputRenderer } from "./financing-release-render.js";
import { outputFixture } from "./financing-release-output-fixture.js";

const id = "00000000-0000-4000-8000-000000000001";
const origin = "https://reports.example.com";
const base = {
  OALO_APP_URL: origin,
  OALO_FINANCING_PUBLICATION_IDS_JSON: JSON.stringify([id]),
  OALO_FINANCING_PUBLIC_ENABLED: "true",
  OALO_FINANCING_PUBLIC_DATABASE_URL: "postgres://public:fixture@localhost/oalo_test_runtime",
  OALO_ENVIRONMENT: "test",
  OALO_FINANCING_INQUIRY_KEYRING_JSON: JSON.stringify({
    currentKeyId: "test",
    keys: { test: "11".repeat(32) },
  }),
  OALO_FINANCING_INQUIRY_HASH_KEY: "22".repeat(32),
  OALO_FINANCING_INQUIRY_NONCE_KEY: "33".repeat(32),
  OALO_R2_ACCOUNT_ID: "a".repeat(32),
  OALO_R2_ACCESS_KEY_ID: "fixtureaccesskey",
  OALO_R2_SECRET_ACCESS_KEY: "fixturesecretkeyfixturesecretkeyfixturesecretkey",
  OALO_R2_PRIVATE_BUCKET: "fixture-private",
  OALO_R2_PUBLIC_BUCKET: "fixture-public",
  OALO_R2_PUBLIC_BASE_URL: "https://assets.example.com",
};
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});
describe("public financing runtime authority", () => {
  it("requires explicit activation and publication selection", () => {
    expect(() =>
      parsePublicFinancingConfiguration({ ...base, OALO_FINANCING_PUBLIC_ENABLED: undefined }),
    ).toThrow();
    expect(() =>
      parsePublicFinancingConfiguration({ ...base, OALO_FINANCING_PUBLICATION_IDS_JSON: "[]" }),
    ).toThrow();
    expect(parsePublicFinancingConfiguration(base).publicationIds).toEqual([id]);
  });
  it.each(["http://reports.example.com", `${origin}/path`, `${origin}/`, `${origin}?q=1`])(
    "refuses noncanonical origin %s",
    (value) => {
      expect(() => parsePublicFinancingConfiguration({ ...base, OALO_APP_URL: value })).toThrow();
    },
  );
  it("requires independent crypto keys and a dedicated database", () => {
    expect(() =>
      parsePublicFinancingConfiguration({ ...base, OALO_FINANCING_PUBLIC_DATABASE_URL: undefined }),
    ).toThrow();
    expect(() =>
      parsePublicFinancingConfiguration({
        ...base,
        OALO_FINANCING_INQUIRY_HASH_KEY: base.OALO_FINANCING_INQUIRY_NONCE_KEY,
      }),
    ).toThrow();
    expect(() =>
      parsePublicFinancingConfiguration({ ...base, OALO_FINANCING_INQUIRY_KEYRING_JSON: "{}" }),
    ).toThrow();
  });
  it("canonicalizes an internal Next URL only after exact raw host authority", () => {
    const request = new Request(`http://localhost:3100/p/${id}`, {
      headers: { host: "reports.example.com" },
    });
    expect(
      canonicalPublicFinancingRequest(request, id, "", parsePublicFinancingConfiguration(base)).url,
    ).toBe(`${origin}/p/${id}`);
  });
  it.each([
    { url: `${origin}/p/${id}?q=1`, host: "reports.example.com" },
    { url: `${origin}/p/${id}`, host: "foreign.example.com" },
    { url: `https://foreign.example.com/p/${id}`, host: "reports.example.com" },
    { url: `${origin}/p/${id}/inquiry`, host: "reports.example.com" },
    { url: `${origin}/p/${id}`, host: "reports.example.com:443" },
  ])("refuses host/path/origin drift", ({ url, host }) => {
    expect(() =>
      canonicalPublicFinancingRequest(
        new Request(url, { headers: { host, "x-forwarded-host": "reports.example.com" } }),
        id,
        "",
        parsePublicFinancingConfiguration(base),
      ),
    ).toThrow();
  });
  it("refuses a publication outside the server selection", () => {
    const other = id.replace(/1$/u, "2");
    expect(() =>
      canonicalPublicFinancingRequest(
        new Request(`${origin}/p/${other}`, { headers: { host: "reports.example.com" } }),
        other,
        "",
        parsePublicFinancingConfiguration(base),
      ),
    ).toThrow();
  });
  it("resolves only exact immutable property source media", () => {
    const input = outputFixture(3, [
      { bytes: Uint8Array.from([1]), sha256: "a".repeat(64), mimeType: "image/png" },
    ]);
    const asset = input.source.authority.mediaAuthorizations[0]!;
    const result = resolvePublicPropertyMedia(input, asset);
    expect(result.objectKey).toBe(
      `locations/${input.source.sourceVersion.locationRef}/financing-media/${asset.assetRef}/${asset.sha256}.png`,
    );
    expect(() => resolvePublicPropertyMedia(input, { ...asset, sha256: "b".repeat(64) })).toThrow();
    expect(() => resolvePublicPropertyMedia(input, { ...asset, purpose: "lender-logo" })).toThrow();
  });
  it.each([
    { status: "admitted", allowed: true, retryAfterSeconds: 0, expectedRetry: 1 },
    { status: "limited", allowed: false, retryAfterSeconds: 86400, expectedRetry: 86400 },
  ])(
    "uses native durable $status admission with no raw client bytes in SQL",
    async ({ status, allowed, retryAfterSeconds, expectedRetry }) => {
      const queries: SqlRequest[] = [];
      const pool: DatabasePool = {
        connect: async () => ({
          execute: async (query) => {
            queries.push(query);
            return query.statementName === "financing-public-admission.admit.v1"
              ? { rows: [{ value: { status, allowed, retryAfterSeconds } }], rowCount: 1 }
              : { rows: [], rowCount: 0 };
          },
          release: async () => undefined,
        }),
      };
      const trusted = Buffer.from("synthetic-deployment-client");
      const resolver = vi.fn(async () => trusted);
      const callback = createNativePublicFinancingAdmission(
        { ...base, OALO_FINANCING_PUBLIC_CLIENT_HMAC_KEY: "44".repeat(32) },
        pool,
        resolver,
      );
      const request = new Request(`${origin}/p/${id}/inquiry`, {
        method: "POST",
        headers: { host: "reports.example.com", "x-forwarded-for": "visitor-controlled" },
      });
      expect(await callback(request, id, id)).toEqual({
        allowed,
        retryAfterSeconds: expectedRetry,
      });
      const wire = queries.find(
        (query) => query.statementName === "financing-public-admission.admit.v1",
      )!;
      expect(wire.values.slice(0, 3)).toEqual([id, origin, id]);
      expect(wire.values[3]).toMatch(/^[a-f0-9]{64}$/u);
      expect(JSON.stringify(wire.values)).not.toContain("synthetic-deployment-client");
      expect(JSON.stringify(wire.values)).not.toContain("visitor-controlled");
      expect(
        queries.some((query) => query.text === "set local role financing_public_runtime"),
      ).toBe(true);
    },
  );
  it("refuses missing/invalid trusted deployment identity and missing or reused HMAC key before SQL", async () => {
    const pool: DatabasePool = {
      connect: vi.fn(async () => {
        throw new Error("Must not acquire");
      }),
    };
    expect(() =>
      createNativePublicFinancingAdmission(base, pool, async () => Buffer.from("fixture")),
    ).toThrow();
    expect(() =>
      createNativePublicFinancingAdmission(
        { ...base, OALO_FINANCING_PUBLIC_CLIENT_HMAC_KEY: base.OALO_FINANCING_INQUIRY_NONCE_KEY },
        pool,
        async () => Buffer.from("fixture"),
      ),
    ).toThrow();
    for (const value of [
      undefined,
      new Uint8Array(),
      new Uint8Array(513),
      "visitor-forwarded-ip",
    ]) {
      const callback = createNativePublicFinancingAdmission(
        { ...base, OALO_FINANCING_PUBLIC_CLIENT_HMAC_KEY: "44".repeat(32) },
        pool,
        async () => value,
      );
      await expect(
        callback(
          new Request(`${origin}/p/${id}/inquiry`, {
            method: "POST",
            headers: { host: "reports.example.com" },
          }),
          id,
          id,
        ),
      ).rejects.toThrow();
    }
    expect(pool.connect).not.toHaveBeenCalled();
  });
  it("validates native admission after the existing HTTP form reader consumes the Request body", async () => {
    const execute = vi.fn(async (_query: SqlRequest) => ({
      rows: [{ value: { status: "admitted", allowed: true, retryAfterSeconds: 0 } }],
      rowCount: 1,
    }));
    const pool: DatabasePool = {
      connect: vi.fn(async () => ({ execute, release: async () => undefined })),
    };
    const callback = createNativePublicFinancingAdmission(
      { ...base, OALO_FINANCING_PUBLIC_CLIENT_HMAC_KEY: "44".repeat(32) },
      pool,
      async () => Uint8Array.from([1, 4, 192, 0, 2, 1]),
    );
    const request = new Request(`${origin}/p/${id}/inquiry`, {
      method: "POST",
      headers: { host: "reports.example.com" },
      body: "synthetic-consumed-form",
    });
    await request.text();
    expect(request.bodyUsed).toBe(true);
    expect(await callback(request, id, id)).toEqual({ allowed: true, retryAfterSeconds: 1 });
    const before = execute.mock.calls.length;
    request.headers.set("host", "foreign.example.com");
    await expect(callback(request, id, id)).rejects.toThrow();
    expect(execute).toHaveBeenCalledTimes(before);
  });
  it("binds the real capability repository, signed private R2 reads and native output parity", async () => {
    // Controlled SQL wire and HTTP provider boundaries, not PostgreSQL/R2 deployment proof.
    const input = outputFixture(1),
      source = input.source,
      authority = source.authority;
    let record: FinancingReleaseRecord | undefined;
    const artifacts = new Map<string, Uint8Array>();
    const renderer = createPublicFinancingOutputRenderer({
      readMedia: async () => {
        throw new Error("No fixture media");
      },
    });
    const tx: FinancingReleaseTransaction = {
      reserve: async () => ({ state: "new" }),
      load: async () => record,
      save: async (value) => {
        record = value;
      },
      assertEvidenceCurrent: async () => undefined,
      complete: async () => undefined,
      capture: async () => {
        throw new Error("No capture fixture");
      },
    };
    const fixturePorts: FinancingReleasePorts = {
      now: () => new Date(input.presentation.issuedAt),
      newReleaseRef: () => "release_runtime001",
      newPublicationId: () => input.publicationId,
      authorize: async () => undefined,
      resolve: async () => source,
      readMedia: async () => {
        throw new Error("No fixture media");
      },
      assertNormalizedMedia: async () => undefined,
      render: renderer.render,
      assertOutputParity: async () => undefined,
      putOutput: async (seal, bytes) => {
        artifacts.set(seal.sha256, bytes);
      },
      readOutput: async (seal) => artifacts.get(seal.sha256)!,
      transaction: async (_location, work) => work(tx),
      findPublication: async () => record,
    };
    const principal = {
      locationRef: source.sourceVersion.locationRef,
      actorRef: source.sourceVersion.createdBy,
    };
    const references = [
      "propertyVersionRef",
      "partnerVersionRef",
      "lenderIdentityVersionRef",
      "presetVersionRef",
      "disclosureVersionRef",
      "templateVersionRef",
      "routingProfileVersionRef",
      "consentVersionRef",
    ] as const;
    const prepared = await prepareFinancingRelease(
      FinancingReleasePrepareRequestSchema.parse({
        requestId: id,
        campaignRef: source.sourceVersion.campaignRef,
        campaignVersionRef: source.sourceVersion.campaignVersionRef,
        ...Object.fromEntries(references.map((key) => [key, authority[key]])),
        expectedEvidenceHash: hash(authority),
      }),
      principal,
      fixturePorts,
    );
    const command = (value: FinancingReleaseRecord, requestId: string) => ({
      requestId,
      releaseRef: value.snapshot.releaseRef,
      expectedRevision: value.revision,
      expectedBundleHash: value.snapshot.bundleHash,
      expectedEvidenceHash: value.snapshot.evidenceHash,
    });
    const approved = await transitionFinancingRelease(
      "approve",
      command(prepared, id.replace(/1$/u, "2")),
      principal,
      fixturePorts,
    );
    await transitionFinancingRelease(
      "publish",
      command(approved, id.replace(/1$/u, "3")),
      principal,
      fixturePorts,
    );
    const owner = {
      locationId: id,
      actorId: id.replace(/1$/u, "2"),
      correlationId: "correlation_runtime001",
      locationRef: principal.locationRef,
      releaseRef: prepared.snapshot.releaseRef,
    };
    let current = true;
    let admissionAllowed = true;
    const queries: SqlRequest[] = [];
    const pool: DatabasePool = {
      connect: async () => ({
        execute: async (query) => {
          queries.push(query);
          if (query.statementName === "transaction.read-context")
            return {
              rows: [
                {
                  location_id: owner.locationId,
                  actor_id: owner.actorId,
                  correlation_id: owner.correlationId,
                },
              ],
              rowCount: 1,
            };
          const value = query.text.includes("financing_release_public_context")
            ? owner
            : query.text.includes("financing_release_publication") ||
                query.text.includes("financing_release_load")
              ? record
              : query.text.includes("financing_release_source")
                ? source
                : query.statementName === "financing-public-admission.admit.v1"
                  ? {
                      status: admissionAllowed ? "admitted" : "limited",
                      allowed: admissionAllowed,
                      retryAfterSeconds: admissionAllowed ? 0 : 86400,
                    }
                  : query.statementName === "financing-release.capture.v1"
                    ? {
                        inquiryId: query.values[4],
                        publicationId: input.publicationId,
                        requestId: query.values[1],
                        acceptedAt: query.values[5],
                        expiresAt: query.values[6],
                        deliveryState: "pending",
                      }
                    : query.text.includes("financing_release_current")
                      ? current
                      : undefined;
          return value === undefined
            ? { rows: [], rowCount: 0 }
            : { rows: [{ value }], rowCount: 1 };
        },
        release: async () => undefined,
      }),
    };
    const provider = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      const target = new URL(String(url));
      expect(target.hostname).toBe(`${base.OALO_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`);
      expect(init?.method).toBe("GET");
      expect(target.searchParams.get("X-Amz-Signature")).toHaveLength(64);
      const seal = record!.snapshot.outputSeals.find((item) =>
        target.pathname.includes(item.sha256),
      )!;
      return new Response(Buffer.from(artifacts.get(seal.sha256)!), {
        headers: { "content-type": seal.mimeType, "content-length": String(seal.byteSize) },
      });
    });
    vi.stubGlobal("fetch", provider);
    const configured = {
      ...base,
      OALO_APP_URL: authority.origin.canonicalOrigin,
      OALO_FINANCING_PUBLICATION_IDS_JSON: JSON.stringify([input.publicationId]),
    };
    const http = createPublicFinancingRuntime(configured, {
      pool,
      admitInquiry: async () => {
        throw new Error("Admission unbound");
      },
    });
    const request = (suffix = "", method = "GET") =>
      new Request(input.canonicalUrl + suffix, {
        method,
        headers: { host: new URL(input.canonicalUrl).host },
      });
    const launches = vi.spyOn(chromium, "launch");
    const coldStarted = performance.now();
    const response = await http.read(request(), input.publicationId);
    const coldMilliseconds = Math.round(performance.now() - coldStarted);
    expect(response.status).toBe(200);
    expect(await response.text()).toContain("6.250%");
    expect(response.headers.get("content-security-policy")).toContain("font-src data:");
    expect(response.headers.get("set-cookie")).toContain("HttpOnly; SameSite=Strict");
    expect(
      queries
        .filter((item) => item.text.startsWith("set local role"))
        .every((item) => item.text === "set local role financing_public_runtime"),
    ).toBe(true);
    expect(queries.some((item) => item.statementName === "financing-release.current.v1")).toBe(
      true,
    );
    expect(queries.some((item) => item.text === "set local role financing_public_runtime")).toBe(
      true,
    );
    const coldLaunches = launches.mock.calls.length;
    const warmStarted = performance.now();
    const head = await http.read(request("", "HEAD"), input.publicationId);
    const warmMilliseconds = Math.round(performance.now() - warmStarted);
    console.info(
      JSON.stringify({
        diagnostic: "native-public-parity",
        coldMilliseconds,
        warmMilliseconds,
        coldLaunches,
        warmAdditionalLaunches: launches.mock.calls.length - coldLaunches,
      }),
    );
    expect(head.status).toBe(200);
    expect(await head.text()).toBe("");
    expect(launches.mock.calls.length).toBe(coldLaunches);
    const pdf = await http.read(request("/report.pdf"), input.publicationId, "/report.pdf");
    expect(pdf.status).toBe(200);
    expect(
      Buffer.from(await pdf.arrayBuffer())
        .subarray(0, 5)
        .toString(),
    ).toBe("%PDF-");
    // Existing controlled pool/R2 boundaries, actual exported POST and native classes.
    // This is not a configured production server, ingress or PostgreSQL/provider proof.
    const nativeEnvironment = {
      ...configured,
      OALO_ENVIRONMENT: "preview",
      OALO_FINANCING_PUBLIC_CLIENT_HMAC_KEY: "44".repeat(32),
      OALO_FINANCING_CLIENT_IDENTITY_PROFILE: "vercel-direct-v1",
      OALO_FINANCING_VERCEL_PROJECT_ID: "prj_FixtureOwnedProject",
      OALO_FINANCING_VERCEL_ENVIRONMENT: "preview",
      VERCEL: "1",
      VERCEL_PROJECT_ID: "prj_FixtureOwnedProject",
      VERCEL_ENV: "preview",
    };
    for (const [key, value] of Object.entries(nativeEnvironment)) vi.stubEnv(key, value);
    const makePool = vi
      .spyOn(databaseModule, "createPostgresPool")
      .mockReturnValue(pool as ReturnType<typeof databaseModule.createPostgresPool>);
    const cookie = response.headers.get("set-cookie")!.split(";")[0]!;
    const post = (extra: Record<string, string> = {}, fields: Record<string, string> = {}) =>
      new Request(input.canonicalUrl + "/inquiry", {
        method: "POST",
        headers: {
          host: new URL(input.canonicalUrl).host,
          origin: authority.origin.canonicalOrigin,
          "content-type": "application/x-www-form-urlencoded",
          cookie,
          "x-vercel-forwarded-for": "192.0.2.1",
          ...extra,
        },
        body: new URLSearchParams({
          firstName: "Synthetic",
          email: "synthetic@example.com",
          consent: "true",
          honeypot: "",
          intent: "property-information",
          ...fields,
        }),
      });
    const submit = (request: Request) =>
      exportedInquiryPost(request, {
        params: Promise.resolve({ publicationId: input.publicationId }),
      });
    const accepted = await submit(post());
    const admissionQuery = queries.find(
      (query) => query.statementName === "financing-public-admission.admit.v1",
    );
    expect(admissionQuery).toBeDefined();
    expect(accepted.status).toBe(202);
    expect(await accepted.text()).toBe("Your request was saved. Delivery is pending.");
    expect(accepted.headers.get("content-security-policy")).toContain("script-src 'none'");
    expect(accepted.headers.get("cache-control")).toContain("no-store");
    expect(makePool).toHaveBeenCalledWith(
      expect.objectContaining({
        deploymentEnvironment: "preview",
        sslMode: "verify-full",
        applicationName: "oalo-financing-public-runtime",
      }),
    );
    const expectedClientHash = createHmac("sha256", Buffer.from("44".repeat(32), "hex"))
      .update("financing-public-client:v1\n")
      .update(input.publicationId)
      .update("\n")
      .update(Uint8Array.from([1, 4, 192, 0, 2, 1]))
      .digest("hex");
    expect(admissionQuery!.values[3]).toBe(expectedClientHash);
    const capture = queries.find(
      (query) => query.statementName === "financing-release.capture.v1",
    )!;
    expect(capture.values[1]).toBe(admissionQuery!.values[2]);
    expect(capture.values[2]).toMatch(/^[a-f0-9]{64}$/u);
    const [version, keyId, iv, tag, ciphertext] = String(capture.values[3]).split(".");
    expect([version, keyId]).toEqual(["v1", "test"]);
    const decrypt = createDecipheriv(
      "aes-256-gcm",
      Buffer.from("11".repeat(32), "hex"),
      Buffer.from(iv!, "base64url"),
    );
    decrypt.setAAD(
      Buffer.from(
        `financing-inquiry-v1:${record!.snapshot.locationRef}:${input.publicationId}:${capture.values[1]}`,
      ),
    );
    decrypt.setAuthTag(Buffer.from(tag!, "base64url"));
    const decoded = JSON.parse(
      Buffer.concat([
        decrypt.update(Buffer.from(ciphertext!, "base64url")),
        decrypt.final(),
      ]).toString("utf8"),
    ) as { request: { email: string }; attribution: { highlevelLocationRef: string } };
    expect(decoded.request.email).toBe("synthetic@example.com");
    expect(decoded.attribution.highlevelLocationRef).toBe(authority.highlevelLocationRef);
    expect(JSON.stringify(capture.values)).not.toContain("synthetic@example.com");
    expect(JSON.stringify(admissionQuery!.values)).not.toContain("192.0.2.1");
    admissionAllowed = false;
    const beforeLimited = queries.filter(
      (query) => query.statementName === "financing-release.capture.v1",
    ).length;
    const nextRead = await http.read(request(), input.publicationId);
    expect(nextRead.status).toBe(200);
    const limited = await submit(
      post({ cookie: nextRead.headers.get("set-cookie")!.split(";")[0]! }),
    );
    expect(limited.status).toBe(429);
    expect(limited.headers.get("retry-after")).toBe("86400");
    expect(
      queries.filter((query) => query.statementName === "financing-release.capture.v1"),
    ).toHaveLength(beforeLimited);
    admissionAllowed = true;
    for (const [request, expectedStatus] of [
      [post({ origin: "https://foreign.example.com" }), 403],
      [post({ cookie: "" }), 403],
      [post({}, { locationId: id }), 400],
      [post({ "x-vercel-forwarded-for": "192.0.2.1,198.51.100.1" }), 503],
    ] as const) {
      const beforeAdmission = queries.filter(
        (query) => query.statementName === "financing-public-admission.admit.v1",
      ).length;
      expect((await submit(request)).status).toBe(expectedStatus);
      expect(
        queries.filter((query) => query.statementName === "financing-public-admission.admit.v1"),
      ).toHaveLength(beforeAdmission);
      expect(
        queries.filter((query) => query.statementName === "financing-release.capture.v1"),
      ).toHaveLength(beforeLimited);
    }
    const beforeConfigRefusal = queries.length;
    for (const change of [
      { OALO_FINANCING_CLIENT_IDENTITY_PROFILE: undefined },
      { VERCEL: "0" },
      { OALO_FINANCING_PUBLIC_CLIENT_HMAC_KEY: undefined },
      { VERCEL_PROJECT_ID: "prj_OtherProject" },
      { OALO_FINANCING_PUBLIC_ENABLED: "false" },
      { OALO_FINANCING_PUBLICATION_IDS_JSON: JSON.stringify([id]) },
      { OALO_FINANCING_CLIENT_IDENTITY_PROFILE: "external-proxy" },
      { VERCEL_ENV: "production" },
    ]) {
      expect(
        (
          await handlePublicFinancingRequest(post(), input.publicationId, "/inquiry", {
            ...nativeEnvironment,
            ...change,
          })
        ).status,
      ).toBe(503);
    }
    expect(queries).toHaveLength(beforeConfigRefusal);
    expect(makePool).toHaveBeenCalledTimes(1);
    const previousManifestHash = source.sourceVersion.manifestHash;
    const beforeDriftReads = provider.mock.calls.length;
    source.sourceVersion.manifestHash = "b".repeat(64);
    expect((await http.read(request(), input.publicationId)).status).toBe(404);
    expect(provider.mock.calls.length).toBe(beforeDriftReads);
    source.sourceVersion.manifestHash = previousManifestHash;
    const siteSeal = record!.snapshot.outputSeals.find((seal) => seal.kind === "site")!;
    const originalSite = artifacts.get(siteSeal.sha256)!;
    artifacts.set(siteSeal.sha256, new Uint8Array(originalSite.length).fill(65));
    expect((await http.read(request(), input.publicationId)).status).toBe(404);
    expect(launches.mock.calls.length).toBe(coldLaunches);
    artifacts.set(siteSeal.sha256, originalSite);
    const nativeNow = performance.now.bind(performance);
    vi.spyOn(performance, "now").mockImplementation(() => nativeNow() + 60001);
    launches.mockRejectedValueOnce(new Error("Synthetic verifier unavailable"));
    expect((await http.read(request(), input.publicationId)).status).toBe(404);
    const afterFailure = launches.mock.calls.length;
    expect((await http.read(request(), input.publicationId)).status).toBe(200);
    expect(launches.mock.calls.length - afterFailure).toBe(2);
    current = false;
    expect((await http.read(request(), input.publicationId)).status).toBe(404);
    const beforeRevokedCapture = queries.filter(
      (query) => query.statementName === "financing-release.capture.v1",
    ).length;
    expect((await submit(post())).status).toBe(404);
    expect(
      queries.filter((query) => query.statementName === "financing-release.capture.v1"),
    ).toHaveLength(beforeRevokedCapture);
  }, 30000);
});
