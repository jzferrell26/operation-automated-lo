import { createHash } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

import type {
  ArtifactRecord,
  PublishedCampaignProjection,
  StorageTransferRequest,
} from "@oalo/contracts";
import {
  R2ObjectStoreConfigurationError,
  R2ObjectStoreError,
  createR2ObjectStoreClient,
  type R2FetchTransport,
  type R2HttpResponse,
} from "../../../../packages/storage/src/index.js";

const fixedNow = new Date("2026-07-21T18:00:00.000Z");
const secretAccessKey = "s".repeat(48);
const config = {
  accountId: "a".repeat(32),
  accessKeyId: "accessKey_01Production",
  secretAccessKey,
  privateBucket: "oalo-private-artifacts",
  publicBucket: "oalo-public-projections",
  publicBaseUrl: "https://assets.example.test/immutable/",
  requestTimeoutMs: 25,
};
const digest = "b".repeat(64);
const locationRef = "location_01TenantA";
const tenantNamespace = createHash("sha256").update(locationRef).digest("hex");
const publishedPrefix = `locations/${tenantNamespace}/campaigns/campaign_public_01/1/`;
const publishedKey = `${publishedPrefix}${digest}.pdf`;

function headers(values: Readonly<Record<string, string>> = {}) {
  const normalized = Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key.toLowerCase(), value]),
  );
  return { get: (name: string) => normalized[name.toLowerCase()] ?? null };
}

function response(
  status: number,
  responseHeaders: Readonly<Record<string, string>> = {},
): R2HttpResponse {
  return { status, headers: headers(responseHeaders) };
}

const artifact: ArtifactRecord = {
  schemaVersion: 1,
  artifactRef: "artifact_01Approved",
  artifactType: "pdf",
  locationRef,
  campaignRef: "campaign_01OpenHouse",
  campaignVersionRef: "version_01Approved",
  manifestRef: "manifest_01Approved",
  blueprintVersionRef: "blueprint_01Approved",
  profileVersions: {
    brand: "brand_01Approved",
    compliance: "compliance_01Approved",
    partner: "partner_01Approved",
    routing: "routing_01Approved",
  },
  rendererVersion: "1.0.0",
  browserVersion: "140.0.0",
  templateVersion: "1.0.0",
  fontHashes: ["f".repeat(64)],
  sha256: digest,
  mimeType: "application/pdf",
  byteSize: 64,
  pageCount: 1,
  storageKey:
    "locations/location_01TenantA/campaigns/campaign_01OpenHouse/versions/version_01Approved/artifact_01Approved/immutable.pdf",
  status: "ready",
  createdAt: fixedNow.toISOString(),
};

const projection: PublishedCampaignProjection = {
  schemaVersion: 1,
  publicCampaignId: "campaign_public_01",
  campaignVersionRef: artifact.campaignVersionRef,
  headline: "Approved open house",
  propertyAddress: "Approved public address",
  propertyDescription: "Approved public description",
  openHouseLabel: "Saturday",
  loanOfficerDisplayName: "Alex Morgan",
  realtorDisplayName: "Taylor Reed",
  disclosureBlocks: ["Approved disclosure"],
  callToActionLabel: "View details",
  artifactUrls: { pdf: `${config.publicBaseUrl}${publishedKey}` },
  consentDisclosureVersion: "disclosure_01Approved",
  activeFrom: fixedNow.toISOString(),
  activeUntil: "2026-07-28T18:00:00.000Z",
};

describe("Cloudflare R2 object-store client", () => {
  it("probes both configured buckets with signed bounded HEAD requests", async () => {
    const calls: Array<{
      readonly url: string;
      readonly init: Parameters<R2FetchTransport>[1];
    }> = [];
    const client = createR2ObjectStoreClient(config, {
      fetch: vi.fn(async (url, init) => {
        calls.push({ url, init });
        return response(200);
      }),
      now: () => fixedNow,
    });

    await expect(client.probe()).resolves.toEqual({ status: "ready" });
    expect(calls.map(({ init }) => init.method)).toEqual(["HEAD", "HEAD"]);
    expect(calls.map(({ url }) => new URL(url).pathname)).toEqual([
      `/${config.privateBucket}`,
      `/${config.publicBucket}`,
    ]);
    expect(calls.every(({ init }) => init.body === undefined)).toBe(true);
    expect(
      calls.every(
        ({ init }) => init.headers.authorization?.startsWith("AWS4-HMAC-SHA256") === true,
      ),
    ).toBe(true);
    expect(JSON.stringify(calls)).not.toContain(secretAccessKey);
  });

  it("classifies a failed bucket probe without exposing credentials", async () => {
    const client = createR2ObjectStoreClient(config, {
      fetch: vi.fn(async () => response(403)),
      now: () => fixedNow,
    });

    const result = await client.probe();

    expect(result).toEqual({ status: "unavailable", classification: "unauthorized" });
    expect(JSON.stringify(result)).not.toContain(secretAccessKey);
  });

  it("honors caller cancellation even when the transport does not settle", async () => {
    const controller = new AbortController();
    controller.abort(new Error("cancelled"));
    const client = createR2ObjectStoreClient(config, {
      fetch: async () => new Promise<R2HttpResponse>(() => undefined),
      now: () => fixedNow,
    });

    await expect(client.probe(controller.signal)).resolves.toEqual({
      status: "unavailable",
      classification: "timeout",
    });
  });

  it("stores exact rendered bytes privately with deterministic metadata", async () => {
    const bytes = new TextEncoder().encode("%PDF-1.4\n%%EOF\n");
    const byteSha256 = createHash("sha256").update(bytes).digest("hex");
    const calls: Array<Parameters<R2FetchTransport>[1]> = [];
    const fetchTransport: R2FetchTransport = vi.fn(async (_url, init) => {
      calls.push(init);
      return init.method === "PUT"
        ? response(201)
        : response(200, {
            "content-length": String(bytes.byteLength),
            "x-amz-meta-sha256": byteSha256,
          });
    });
    const client = createR2ObjectStoreClient(config, {
      fetch: fetchTransport,
      now: () => fixedNow,
    });

    const objectKey = await client.store({
      artifactRef: artifact.artifactRef,
      artifactType: artifact.artifactType,
      locationRef: artifact.locationRef,
      campaignRef: artifact.campaignRef,
      campaignVersionRef: artifact.campaignVersionRef,
      sha256: byteSha256,
      mimeType: artifact.mimeType,
      bytes,
    });

    expect(objectKey).toMatch(
      /^locations\/location_01TenantA\/campaigns\/campaign_01OpenHouse\/versions\/version_01Approved\/artifact_01Approved\/[a-f0-9]{64}\.pdf$/u,
    );
    expect(calls.map((call) => call.method)).toEqual(["PUT", "HEAD"]);
    expect(calls[0]?.body).toEqual(bytes);
    expect(calls[0]?.headers["if-none-match"]).toBe("*");
    expect(calls[0]?.headers["x-amz-meta-sha256"]).toBe(byteSha256);
  });

  it("issues an opaque exact-transfer authorization and resolves it to a SigV4 URL", async () => {
    const client = createR2ObjectStoreClient(config, { now: () => fixedNow });
    const request: StorageTransferRequest = {
      schemaVersion: 1,
      direction: "upload",
      visibility: "private",
      locationRef: artifact.locationRef,
      objectKey: artifact.storageKey,
      contentType: "application/pdf",
      maximumBytes: 1_000,
      expectedSha256: artifact.sha256,
      expiresAt: "2026-07-21T18:05:00.000Z",
    };

    const receipt = await client.authorizePrivateTransfer({
      bucket: config.privateBucket,
      request,
    });
    expect(receipt).toMatchObject({
      bucket: config.privateBucket,
      visibility: "private",
      publicReadUrl: null,
      publicBucketPath: null,
      expiresAt: request.expiresAt,
    });
    expect(receipt).not.toContain(secretAccessKey);

    const signed = client.createSignedPrivateTransfer({
      bucket: config.privateBucket,
      request,
      authorization: (receipt as { authorization: string }).authorization,
    });
    expect(signed).toMatchObject({
      method: "PUT",
      maximumBytes: request.maximumBytes,
      expectedSha256: request.expectedSha256,
      expiresAt: request.expiresAt,
      requiredHeaders: {
        "content-type": "application/pdf",
        "x-amz-meta-sha256": artifact.sha256,
      },
    });
    expect(signed.url).toContain(`${config.accountId}.r2.cloudflarestorage.com`);
    expect(signed.url).toContain("X-Amz-Algorithm=AWS4-HMAC-SHA256");
    expect(signed.url).toContain("X-Amz-Expires=300");
    expect(signed.url).not.toContain(secretAccessKey);
  });

  it("signs an immutable conditional copy and verifies destination metadata", async () => {
    const calls: Array<Parameters<R2FetchTransport>[1]> = [];
    const fetchTransport: R2FetchTransport = vi.fn(async (_url, init) => {
      calls.push(init);
      if (init.method === "PUT") return response(200);
      return response(200, {
        "content-length": String(artifact.byteSize),
        "x-amz-meta-sha256": artifact.sha256,
      });
    });
    const client = createR2ObjectStoreClient(config, {
      fetch: fetchTransport,
      now: () => fixedNow,
    });

    const receipt = await client.copyApprovedPrivateArtifact({
      privateBucket: config.privateBucket,
      publicBucket: config.publicBucket,
      artifact,
      publishedKey,
    });

    expect(receipt).toMatchObject({
      sourceBucket: config.privateBucket,
      destinationBucket: config.publicBucket,
      destinationKey: publishedKey,
      immutableUrl: `${config.publicBaseUrl}${publishedKey}`,
      sha256: artifact.sha256,
    });
    expect(calls.map((call) => call.method)).toEqual(["PUT", "HEAD"]);
    expect(calls[0]?.headers["cf-copy-destination-if-none-match"]).toBe("*");
    expect(calls[0]?.headers["x-amz-copy-source"]).toContain(config.privateBucket);
    expect(
      calls.every((call) => call.headers.authorization?.startsWith("AWS4-HMAC-SHA256") === true),
    ).toBe(true);
    expect(JSON.stringify(calls)).not.toContain(secretAccessKey);
  });

  it("quarantines attempted public keys idempotently, including missing keys", async () => {
    const statuses = [204, 404];
    const fetchTransport: R2FetchTransport = vi.fn(async () => response(statuses.shift() ?? 204));
    const client = createR2ObjectStoreClient(config, {
      fetch: fetchTransport,
      now: () => fixedNow,
    });
    const secondKey = `${publishedPrefix}${"c".repeat(64)}.png`;

    const evidence = await client.quarantinePartialPublication({
      publicBucket: config.publicBucket,
      locationRef,
      publicCampaignId: projection.publicCampaignId,
      campaignVersionRef: projection.campaignVersionRef,
      publishedVersion: 1,
      attemptedKeys: [publishedKey, secondKey],
      idempotencyKey: "d".repeat(64),
      problemCode: "PUBLICATION_PARTIAL_FAILURE",
    });

    expect(evidence).toEqual({
      status: "quarantined",
      publicBucket: config.publicBucket,
      locationRef,
      publicCampaignId: projection.publicCampaignId,
      campaignVersionRef: projection.campaignVersionRef,
      publishedVersion: 1,
      quarantinedKeys: [secondKey, publishedKey].toSorted(),
      idempotencyKey: "d".repeat(64),
      problemCode: "PUBLICATION_PARTIAL_FAILURE",
    });
    expect(fetchTransport).toHaveBeenCalledTimes(2);
  });

  it("withdraws exact public objects and writes a create-only immutable audit record", async () => {
    const calls: Array<Parameters<R2FetchTransport>[1]> = [];
    const fetchTransport: R2FetchTransport = vi.fn(async (_url, init) => {
      calls.push(init);
      return response(init.method === "DELETE" ? 204 : 201);
    });
    const client = createR2ObjectStoreClient(config, {
      fetch: fetchTransport,
      now: () => fixedNow,
    });
    const record = {
      schemaVersion: 1 as const,
      withdrawalRef: "withdrawal_01Approved",
      publicCampaignId: projection.publicCampaignId,
      campaignVersionRef: projection.campaignVersionRef,
      actorRef: "operator_01Approved",
      projection,
      withdrawnAt: fixedNow.toISOString(),
    };

    const evidence = await client.withdrawExactProjectionAndAppendImmutableAudit({
      projection,
      record,
    });

    expect(evidence).toMatchObject({
      immutable: true,
      publicCampaignId: projection.publicCampaignId,
      campaignVersionRef: projection.campaignVersionRef,
    });
    expect(calls.map((call) => call.method)).toEqual(["DELETE", "PUT"]);
    expect(calls[1]?.headers["if-none-match"]).toBe("*");
    expect(calls[1]?.headers["x-amz-meta-record-sha256"]).toMatch(/^[a-f0-9]{64}$/u);
  });

  it("classifies provider status and timeout failures without leaking credentials", async () => {
    const denied = createR2ObjectStoreClient(config, {
      fetch: async () => response(429),
      now: () => fixedNow,
    });
    await expect(
      denied.quarantinePartialPublication({
        publicBucket: config.publicBucket,
        locationRef,
        publicCampaignId: projection.publicCampaignId,
        campaignVersionRef: projection.campaignVersionRef,
        publishedVersion: 1,
        attemptedKeys: [publishedKey],
        idempotencyKey: "e".repeat(64),
        problemCode: "PUBLICATION_PARTIAL_FAILURE",
      }),
    ).rejects.toMatchObject({ classification: "rate_limited", status: 429 });

    const timeoutFetch: R2FetchTransport = async (_url, init) =>
      new Promise<R2HttpResponse>((_resolve, reject) => {
        const abort = (): void => {
          const error = new Error("aborted");
          error.name = "AbortError";
          reject(error);
        };
        if (init.signal.aborted) abort();
        else init.signal.addEventListener("abort", abort, { once: true });
      });
    const timedOut = createR2ObjectStoreClient(
      { ...config, requestTimeoutMs: 1 },
      { fetch: timeoutFetch, now: () => fixedNow },
    );
    let thrown: unknown;
    try {
      await timedOut.quarantinePartialPublication({
        publicBucket: config.publicBucket,
        locationRef,
        publicCampaignId: projection.publicCampaignId,
        campaignVersionRef: projection.campaignVersionRef,
        publishedVersion: 1,
        attemptedKeys: [publishedKey],
        idempotencyKey: "f".repeat(64),
        problemCode: "PUBLICATION_PARTIAL_FAILURE",
      });
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(R2ObjectStoreError);
    expect(thrown).toMatchObject({ classification: "timeout" });
    expect(String(thrown)).not.toContain(secretAccessKey);
  });

  it("fails invalid secret configuration closed without echoing the secret", () => {
    let thrown: unknown;
    try {
      createR2ObjectStoreClient({ ...config, secretAccessKey: "invalid secret" });
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(R2ObjectStoreConfigurationError);
    expect(String(thrown)).not.toContain("invalid secret");
  });
});
