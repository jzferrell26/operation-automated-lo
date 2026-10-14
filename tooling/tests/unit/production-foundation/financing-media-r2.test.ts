import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import {
  createR2ObjectStoreClient,
  financingMediaKey,
  type R2FetchTransport,
} from "../../../../packages/storage/src/index.js";
import type { FinancingMediaRecord } from "@oalo/contracts";
const bytes = new Uint8Array([1, 2, 3, 4]),
  digest = createHash("sha256").update(bytes).digest("hex");
const record: FinancingMediaRecord = {
  locationRef: "location_sample0001",
  mediaRef: `media_${"a".repeat(32)}`,
  createdBy: "actor_sample0001",
  requestId: "00000000-0000-4000-8000-000000000001",
  requestHash: "b".repeat(64),
  sourceSha256: "c".repeat(64),
  sha256: digest,
  mimeType: "image/png",
  byteSize: 4,
  width: 400,
  height: 400,
  normalizationVersion: "1.0.0",
  metadataRetained: false,
  rights: {
    schemaVersion: 1,
    basis: "owned",
    confirmed: true,
    attestedBy: "actor_sample0001",
    attestedAt: "2026-10-13T12:00:00.000Z",
    scope: "tenant-private-financing",
  },
  createdAt: "2026-10-13T12:00:00.000Z",
};
const config = {
  accountId: "a".repeat(32),
  accessKeyId: "accessKey_01Production",
  secretAccessKey: "s".repeat(48),
  privateBucket: "oalo-private-media",
  publicBucket: "oalo-public-output",
  publicBaseUrl: "https://assets.example.invalid/",
  requestTimeoutMs: 100,
};
describe("R2 private financing media extensions", () => {
  it("signs confined private immutable PUT/HEAD and bounded GET without altering artifact APIs", async () => {
    const fetch = vi.fn<R2FetchTransport>(async (_url, init) => ({
      status: 200,
      headers: new Headers({ "x-amz-meta-sha256": digest, "content-length": "4" }),
      ...(init.method === "GET"
        ? {
            body: new ReadableStream({
              start(c) {
                c.enqueue(bytes);
                c.close();
              },
            }),
          }
        : {}),
    }));
    const client = createR2ObjectStoreClient(config, { fetch });
    await client.putPrivateMedia(record, bytes);
    expect(await client.readPrivateMedia(record)).toEqual(bytes);
    expect(fetch.mock.calls.map(([, init]) => init.method)).toEqual(["PUT", "HEAD", "GET"]);
    for (const [url, init] of fetch.mock.calls) {
      expect(url).toContain(`/oalo-private-media/${financingMediaKey(record)}`);
      expect(init.headers.authorization).toMatch(/^AWS4-HMAC-SHA256/u);
      expect(url).not.toContain("public-output");
    }
    expect(fetch.mock.calls[0]?.[1].headers["if-none-match"]).toBe("*");
  });
  it("cancels streamed overflow and refuses corrupt bytes or unsafe records", async () => {
    let cancelled = false;
    const client = createR2ObjectStoreClient(config, {
      fetch: async () => ({
        status: 200,
        headers: new Headers(),
        body: new ReadableStream({
          start(c) {
            c.enqueue(new Uint8Array(5));
          },
          cancel() {
            cancelled = true;
          },
        }),
      }),
    });
    await expect(client.readPrivateMedia(record)).rejects.toThrow();
    expect(cancelled).toBe(true);
    await expect(client.putPrivateMedia(record, new Uint8Array(4))).rejects.toThrow();
    expect(() => financingMediaKey({ ...record, locationRef: "../escape" })).toThrow();
  });
  it("replays only after metadata matches and cancels an indefinitely stalled GET", async () => {
    const fetch: R2FetchTransport = async (_url, init) => ({
      status: init.method === "PUT" ? 412 : 200,
      headers: new Headers({ "x-amz-meta-sha256": "0".repeat(64), "content-length": "4" }),
      body: new ReadableStream({}),
    });
    const client = createR2ObjectStoreClient({ ...config, requestTimeoutMs: 10 }, { fetch });
    await expect(client.putPrivateMedia(record, bytes)).rejects.toThrow();
    await expect(client.readPrivateMedia(record)).rejects.toThrow();
  });
});
