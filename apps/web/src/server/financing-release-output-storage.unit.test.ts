import { describe, it, expect, vi } from "vitest";
import { canonicalCampaignHash as hash } from "@oalo/application";
import type { FinancingReleaseOutputSeal } from "@oalo/contracts";
import type { R2FetchTransport } from "@oalo/storage";
import { outputFixture } from "./financing-release-output-fixture.js";
import { createFinancingReleaseArtifactStore } from "./financing-release-artifacts.js";
import { outputDigest, FINANCING_PUBLIC_RENDERER } from "./financing-release-html.js";
const config = {
  accountId: "a".repeat(32),
  accessKeyId: "accessKey_01Output",
  secretAccessKey: "s".repeat(48),
  privateBucket: "synthetic-private",
  publicBucket: "synthetic-public",
  publicBaseUrl: "https://assets.example.invalid/",
  requestTimeoutMs: 30,
};
function fixture(mode = "okay") {
  const input = outputFixture(),
    bytes = new TextEncoder().encode('<!doctype html><html lang="en"></html>');
  const seal: FinancingReleaseOutputSeal = {
    kind: "site",
    mimeType: "text/html",
    rendererVersion: FINANCING_PUBLIC_RENDERER,
    artifactRef: `artifact_${outputDigest(`${hash(input)}:site:${FINANCING_PUBLIC_RENDERER}`).slice(0, 32)}`,
    byteSize: bytes.length,
    sha256: outputDigest(bytes),
  };
  const fetch = vi.fn<R2FetchTransport>(async (url, init) => {
    expect(new URL(url).hostname).toBe(`${config.accountId}.r2.cloudflarestorage.com`);
    expect(new URL(url).pathname).toContain(
      `/${config.privateBucket}/locations/${input.source.sourceVersion.locationRef}/`,
    );
    if (init.method === "GET" && mode === "timeout") return new Promise(() => undefined);
    const body =
      mode === "corrupt"
        ? new Uint8Array(bytes.length).fill(65)
        : mode === "oversize"
          ? new Uint8Array(bytes.length + 1)
          : mode === "short"
            ? bytes.slice(1)
            : bytes;
    return {
      status: mode === "missing" ? 404 : 200,
      headers: new Headers({
        "content-type": mode === "mime" ? "application/pdf" : "text/html; charset=utf-8",
        "content-length": mode === "length" ? "1" : String(bytes.length),
        "x-amz-meta-sha256": seal.sha256,
      }),
      ...(init.method === "GET"
        ? {
            body: new ReadableStream({
              start(c) {
                c.enqueue(body);
                c.close();
              },
            }),
          }
        : {}),
    };
  });
  const store = createFinancingReleaseArtifactStore(input, config, {
    fetch,
    resolveMedia: async () => undefined,
  });
  return { input, bytes, seal, fetch, store };
}
describe("public financing private artifact storage", () => {
  it("uses immutable private PUT/HEAD and signed GET, independently verifying exact MIME/bytes/hash", async () => {
    const { bytes, seal, fetch, store } = fixture();
    await store.putOutput(seal, bytes);
    expect(await store.readOutput(seal)).toEqual(bytes);
    expect(fetch.mock.calls.map(([, i]) => i.method)).toEqual(["PUT", "HEAD", "GET", "GET"]);
    expect(fetch.mock.calls[0]![1].headers["if-none-match"]).toBe("*");
    expect(
      fetch.mock.calls
        .filter(([, i]) => i.method === "GET")
        .every(([u]) => new URL(u).searchParams.get("X-Amz-Signature")?.length === 64),
    ).toBe(true);
  });
  it.each(["corrupt", "oversize", "short", "mime", "length", "missing", "timeout"])(
    "fails closed on %s stored output",
    async (mode) => {
      const { seal, store } = fixture(mode);
      await expect(store.readOutput(seal)).rejects.toThrow();
    },
  );
  it("refuses foreign artifact binding and changed bytes before any write", async () => {
    const { bytes, seal, store, fetch } = fixture();
    await expect(
      store.putOutput({ ...seal, artifactRef: "artifact_foreign001" }, bytes),
    ).rejects.toThrow();
    await expect(store.putOutput(seal, new Uint8Array(bytes.length))).rejects.toThrow();
    expect(fetch).not.toHaveBeenCalled();
  });
  it("requires server-admitted exact media locator and denies traversal/foreign owner before GET", async () => {
    const data = new Uint8Array([1, 2, 3]),
      input = outputFixture(1, [
        { bytes: data, sha256: outputDigest(data), mimeType: "image/png" },
      ]),
      asset = input.source.authority.mediaAuthorizations[0]!;
    for (const changed of [
      { locationRef: "location_foreign001" },
      { assetRef: "media_foreign001" },
      { objectKey: `locations/${input.source.sourceVersion.locationRef}/../escape.png` },
      { mimeType: "image/jpeg" },
    ]) {
      const fetch = vi.fn<R2FetchTransport>();
      const store = createFinancingReleaseArtifactStore(input, config, {
        fetch,
        resolveMedia: async () => ({
          locationRef: input.source.sourceVersion.locationRef,
          assetRef: asset.assetRef,
          sha256: asset.sha256,
          mimeType: asset.mimeType,
          byteSize: asset.byteSize,
          objectKey: `locations/${input.source.sourceVersion.locationRef}/financing-media/${asset.assetRef}/${asset.sha256}.png`,
          ...changed,
        }),
      });
      await expect(store.readMedia(asset)).rejects.toThrow();
      expect(fetch).not.toHaveBeenCalled();
    }
  });
});
