import { mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { runInNewContext } from "node:vm";
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createFilesystemFinancingMediaStore, financingMediaKey } from "@oalo/storage";
import { FinancingPropertyFactsSchema, FinancingPropertyMediaSchema } from "@oalo/contracts";
import { SharpImageNormalizationAdapter } from "@oalo/rendering";
import { singleActorSessionFixture } from "./signed-session.test-support.js";
import { createLocalSyntheticPrincipal } from "./authenticated-principal.js";
import { LOCAL_SYNTHETIC_ENV } from "./campaign-command-test-support.js";
import { financingPorts } from "./financing.test-support.js";
import {
  handleFinancingMediaUpload,
  handleFinancingMediaRead,
  handleFinancingMediaRevoke,
  readBoundedFinancingMediaBody,
} from "./financing-media-http.js";
import {
  uploadFinancingMedia,
  readFinancingMedia,
  resolveFinancingMedia,
  resolveFinancingMediaPlacements,
  verifyFinancingMediaBytes,
} from "./financing-media-service.js";
import { createFinancingMediaRuntime } from "./financing-media-runtime.js";

let root: string;
const principal = createLocalSyntheticPrincipal();
const input = () => ({
  requestId: randomUUID(),
  declaredMimeType: "image/jpeg",
  rightsBasis: "owned",
  rightsConfirmed: true,
});
const image = (format: "jpeg" | "png" = "jpeg", width = 600, height = 400) =>
  sharp({ create: { width, height, channels: 3, background: { r: 37, g: 142, b: 88 } } })
    [format]()
    .toBuffer();
const hash = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
function runtime() {
  const store = createFilesystemFinancingMediaStore(root, {
    locationRef: principal.locationRef,
    actorRef: principal.actorRef,
  });
  return { repository: store, bytes: store };
}
function request(bytes: Uint8Array, overrides: Record<string, string> = {}) {
  return new Request(
    "https://app.operation-automated-lo.test/api/campaigns/property/financing/media",
    {
      method: "POST",
      headers: {
        "Content-Type": "image/jpeg",
        "X-OALO-Media-Request-Id": randomUUID(),
        "X-OALO-Media-Rights-Basis": "owned",
        "X-OALO-Media-Rights-Confirmed": "true",
        ...overrides,
      },
      body: Uint8Array.from(bytes).buffer,
    },
  );
}
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "oalo-media-"));
});
afterEach(async () => {
  await rm(root, { recursive: true, force: true });
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});
describe("private financing image boundary", () => {
  it("accepts native process.env at the actual runtime composition boundary", async () => {
    vi.stubEnv("OALO_ENVIRONMENT", "local");
    vi.stubEnv("OALO_PROVIDER_MODE", "stub");
    vi.stubEnv("OALO_SYNTHETIC_DATA_ONLY", "true");
    vi.stubEnv("OALO_REVIEW_SURFACE", undefined);
    vi.stubEnv("OALO_LOCAL_CAMPAIGN_STORE", join(root, "comparisons.json"));
    const port = createFinancingMediaRuntime(principal, process.env);
    const result = await uploadFinancingMedia(input(), await image(), principal, port);
    expect((await readFinancingMedia(result.record.mediaRef, port)).record).toEqual(result.record);
  });
  it("sanitizes malformed owned runtime configuration as unavailable503", async () => {
    for (const config of [
      { ...LOCAL_SYNTHETIC_ENV, OALO_LOCAL_CAMPAIGN_STORE: 7 },
      { ...LOCAL_SYNTHETIC_ENV, OALO_R2_ACCESS_KEY_ID: false },
      { ...LOCAL_SYNTHETIC_ENV, OALO_REVIEW_SURFACE: "authorized" },
    ]) {
      const result = await handleFinancingMediaUpload(
        request(await image()),
        LOCAL_SYNTHETIC_ENV,
        financingPorts(),
        (p) => createFinancingMediaRuntime(p, config),
      );
      expect(result.status).toBe(503);
      expect(await result.json()).toEqual({ error: "FINANCING_MEDIA_UNAVAILABLE" });
    }
  });
  it("verifies normalized image bytes from a distinct server JavaScript realm", async () => {
    const port = runtime();
    const saved = await uploadFinancingMedia(input(), await image(), principal, port);
    const normalized = await port.bytes.read(saved.record);
    const foreign: Uint8Array = runInNewContext("new Uint8Array(source)", { source: normalized });
    expect(foreign instanceof Uint8Array).toBe(false);
    await expect(
      verifyFinancingMediaBytes(saved.record, {
        putImmutable: port.bytes.putImmutable,
        read: async () => foreign,
      }),
    ).resolves.toBe(foreign);
  });
  it("rejects signed reader roles and disallowed browser origins before constructing storage", async () => {
    for (const role of ["viewer", "campaign_approver", "location_admin"] as const) {
      const actor = createLocalSyntheticPrincipal({
        role,
        actorRef: "principal_mediaactor001",
        locationRef: "location_mediatenant001",
        installationRef: "installation_media001",
      });
      const fixture = singleActorSessionFixture(actor);
      const headers = new Headers(fixture.headersFor(actor.actorRef));
      if (role === "location_admin") headers.set("origin", "https://outside.example.invalid");
      const req = request(await image());
      headers.forEach((value, key) => req.headers.set(key, value));
      const factory = vi.fn(() => runtime());
      expect(
        (await handleFinancingMediaUpload(req, LOCAL_SYNTHETIC_ENV, fixture.ports, factory)).status,
      ).toBe(role === "location_admin" ? 401 : 403);
      expect(factory).not.toHaveBeenCalled();
    }
  });
  it("caps expensive normalization at two concurrent images and releases the guard", async () => {
    const original = new SharpImageNormalizationAdapter().decodeAndReencode;
    let entered = 0,
      release: () => void = () => {},
      started: () => void = () => {};
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    const both = new Promise<void>((resolve) => {
      started = resolve;
    });
    vi.spyOn(SharpImageNormalizationAdapter.prototype, "decodeAndReencode").mockImplementation(
      async (value) => {
        entered++;
        if (entered === 2) started();
        await held;
        return original(value);
      },
    );
    const bytes = await image(),
      port = runtime();
    const pending = [
      uploadFinancingMedia(input(), bytes, principal, port),
      uploadFinancingMedia(input(), bytes, principal, port),
    ];
    await both;
    try {
      await expect(uploadFinancingMedia(input(), bytes, principal, port)).rejects.toMatchObject({
        status: 429,
      });
    } finally {
      release();
    }
    await Promise.all(pending);
    expect((await uploadFinancingMedia(input(), bytes, principal, port)).record.mediaRef).toMatch(
      /^media_/u,
    );
  });
  it("rejects PNG animation chunks that a first-frame decoder might otherwise accept", async () => {
    const source = await image("png");
    const animation = Buffer.alloc(20);
    animation.writeUInt32BE(8, 0);
    animation.write("acTL", 4, "ascii");
    animation.writeUInt32BE(2, 8);
    let crc = 0xffffffff;
    for (const byte of animation.subarray(4, 16)) {
      crc ^= byte;
      for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
    animation.writeUInt32BE((crc ^ 0xffffffff) >>> 0, 16);
    const png = Buffer.concat([source.subarray(0, 33), animation, source.subarray(33)]);
    await expect(
      uploadFinancingMedia(
        { ...input(), declaredMimeType: "image/png" },
        png,
        principal,
        runtime(),
      ),
    ).rejects.toMatchObject({ status: 400 });
  });
  it.each(["jpeg", "png"] as const)(
    "decodes and stores actual %s, strips metadata and checks normalized readback",
    async (format) => {
      const bytes = await sharp(await image(format))
        .withMetadata({ exif: { IFD0: { Artist: "Synthetic fixture" } } })
        .toBuffer();
      const runtimePort = runtime();
      const result = await uploadFinancingMedia(
        { ...input(), declaredMimeType: `image/${format}` },
        bytes,
        principal,
        runtimePort,
      );
      const read = await readFinancingMedia(result.record.mediaRef, runtimePort);
      expect(hash(read.bytes)).toBe(result.record.sha256);
      expect(read.record.byteSize).toBe(read.bytes.length);
      expect((await sharp(read.bytes).metadata()).exif).toBeUndefined();
      expect(read.record.rights.attestedBy).toBe(principal.actorRef);
    },
  );
  it("replays the original attestation, rejects changed bytes/rights and converges concurrent exact uploads", async () => {
    const bytes = await image();
    const values = input();
    const port = runtime();
    const outcomes = await Promise.all([
      uploadFinancingMedia(values, bytes, principal, port),
      uploadFinancingMedia(values, bytes, principal, port),
    ]);
    expect(outcomes[0]?.record).toEqual(outcomes[1]?.record);
    const replay = await uploadFinancingMedia(
      values,
      bytes,
      principal,
      port,
      () => new Date("2090-01-01"),
    );
    expect(replay.replayed).toBe(true);
    expect(replay.record).toEqual(outcomes[0]?.record);
    await expect(
      uploadFinancingMedia({ ...values, rightsBasis: "licensed" }, bytes, principal, port),
    ).rejects.toMatchObject({ status: 409 });
    await expect(
      uploadFinancingMedia(values, await image("jpeg", 700), principal, port),
    ).rejects.toMatchObject({ status: 409 });
  });
  it("refuses malformed, mismatched, undersized and oversized dimensions before normalization", async () => {
    for (const bytes of [
      Buffer.from("not-an-image"),
      await image("png"),
      await image("jpeg", 399),
      await image("jpeg", 6001),
    ]) {
      await expect(
        uploadFinancingMedia(input(), bytes, principal, runtime()),
      ).rejects.toMatchObject({ code: "FINANCING_MEDIA_INVALID" });
    }
    await expect(
      uploadFinancingMedia(input(), await image("jpeg", 4000, 4000), principal, runtime()),
    ).rejects.toMatchObject({ status: 400 });
  });
  it("stores no ready record after failed byte readback and fails corrupted saved bytes", async () => {
    const port = runtime(),
      bytes = await image(),
      values = input();
    const commit = vi.spyOn(port.repository, "commitReady");
    await expect(
      uploadFinancingMedia(values, bytes, principal, {
        repository: port.repository,
        bytes: { putImmutable: async () => {}, read: async () => new Uint8Array([1]) },
      }),
    ).rejects.toMatchObject({ status: 422 });
    expect(commit).not.toHaveBeenCalled();
    const saved = await uploadFinancingMedia(values, bytes, principal, port);
    await writeFile(join(root, financingMediaKey(saved.record)), Buffer.from("corrupt"));
    await expect(readFinancingMedia(saved.record.mediaRef, port)).rejects.toMatchObject({
      status: 422,
    });
  });
  it("rechecks frozen snapshots, missing v2 arrays, foreign refs and append-only revocation", async () => {
    const port = runtime(),
      saved = await uploadFinancingMedia(input(), await image(), principal, port);
    const snapshots = await resolveFinancingMediaPlacements(
      [{ mediaRef: saved.record.mediaRef, altText: "Front of the example property" }],
      port.repository,
      port.bytes,
    );
    expect(
      await resolveFinancingMedia(
        { manifest: { schemaVersion: 1, property: {} } },
        port.repository,
        port.bytes,
      ),
    ).toEqual([]);
    await expect(
      resolveFinancingMedia(
        { manifest: { schemaVersion: 2, property: {} } },
        port.repository,
        port.bytes,
      ),
    ).rejects.toThrow();
    const resolved = await resolveFinancingMedia(
      { manifest: { schemaVersion: 2, property: { media: snapshots } } },
      port.repository,
      port.bytes,
    );
    expect(hash(resolved[0]!.bytes)).toBe(saved.record.sha256);
    await expect(
      resolveFinancingMedia(
        {
          manifest: {
            schemaVersion: 2,
            property: { media: [{ ...snapshots[0], sha256: "a".repeat(64) }] },
          },
        },
        port.repository,
        port.bytes,
      ),
    ).rejects.toMatchObject({ status: 422 });
    const foreign = createFilesystemFinancingMediaStore(root, {
      locationRef: "location_foreign0001",
      actorRef: principal.actorRef,
    });
    expect(await foreign.find(saved.record.mediaRef)).toBeUndefined();
    const revocation = await port.repository.revoke(saved.record.mediaRef);
    expect(await port.repository.revoke(saved.record.mediaRef)).toEqual(revocation);
    await expect(
      resolveFinancingMedia(
        { manifest: { schemaVersion: 2, property: { media: snapshots } } },
        port.repository,
        port.bytes,
      ),
    ).rejects.toMatchObject({ status: 410 });
  });
  it("refuses symlink ancestors and caller-supplied path references", async () => {
    const outer = await mkdtemp(join(tmpdir(), "oalo-outside-"));
    try {
      await symlink(
        outer,
        join(root, "locations"),
        process.platform === "win32" ? "junction" : "dir",
      );
      await expect(
        uploadFinancingMedia(input(), await image(), principal, runtime()),
      ).rejects.toThrow();
    } finally {
      await rm(outer, { recursive: true, force: true });
    }
    await expect(runtime().repository.find("../../escape")).rejects.toThrow();
  });
  it("bounds streams without Content-Length, cancels overflow and rejects missing rights", async () => {
    let cancelled = false;
    const stream = new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(new Uint8Array(3));
      },
      cancel() {
        cancelled = true;
      },
    });
    const oversized = new Request("https://example.invalid", {
      method: "POST",
      body: stream,
      duplex: "half",
    } as RequestInit);
    await expect(readBoundedFinancingMediaBody(oversized, 2)).rejects.toMatchObject({
      status: 413,
    });
    expect(cancelled).toBe(true);
    const missing = request(await image(), { "X-OALO-Media-Rights-Confirmed": "false" });
    const refused = await handleFinancingMediaUpload(
      missing,
      LOCAL_SYNTHETIC_ENV,
      financingPorts(),
      () => runtime(),
    );
    expect(refused.status).toBe(400);
    expect(await refused.json()).toEqual({ error: "FINANCING_MEDIA_INVALID" });
    expect(
      (
        await handleFinancingMediaUpload(
          request(await image(), { "Content-Type": "image/svg+xml" }),
          LOCAL_SYNTHETIC_ENV,
          financingPorts(),
          () => runtime(),
        )
      ).status,
    ).toBe(415);
  });
  it("returns only opaque metadata, exact replay200, private bytes and idempotent revoke", async () => {
    const bytes = await image(),
      headers = { "X-OALO-Media-Request-Id": randomUUID() },
      port = runtime();
    const first = await handleFinancingMediaUpload(
      request(bytes, headers),
      LOCAL_SYNTHETIC_ENV,
      financingPorts(),
      () => port,
    );
    expect(first.status).toBe(201);
    const metadata = await first.json();
    expect(Object.keys(metadata).sort()).toEqual(
      [
        "byteSize",
        "height",
        "mediaRef",
        "metadataRetained",
        "mimeType",
        "normalizationVersion",
        "rights",
        "sha256",
        "width",
      ].sort(),
    );
    expect(
      (
        await handleFinancingMediaUpload(
          request(bytes, headers),
          LOCAL_SYNTHETIC_ENV,
          financingPorts(),
          () => port,
        )
      ).status,
    ).toBe(200);
    const read = await handleFinancingMediaRead(
      new Request("https://example.invalid"),
      metadata.mediaRef,
      LOCAL_SYNTHETIC_ENV,
      financingPorts(),
      () => port,
    );
    expect(read.status).toBe(200);
    expect(read.headers.get("cache-control")).toContain("no-store");
    expect(hash(new Uint8Array(await read.arrayBuffer()))).toBe(metadata.sha256);
    const revoke = () =>
      handleFinancingMediaRevoke(
        new Request("https://example.invalid", { method: "POST" }),
        metadata.mediaRef,
        LOCAL_SYNTHETIC_ENV,
        financingPorts(),
        () => port,
      );
    expect(await (await revoke()).json()).toEqual(await (await revoke()).json());
    expect(
      (
        await handleFinancingMediaRead(
          new Request("https://example.invalid"),
          metadata.mediaRef,
          LOCAL_SYNTHETIC_ENV,
          financingPorts(),
          () => port,
        )
      ).status,
    ).toBe(410);
  });
  it("never falls back to filesystem for a connected-account environment", () => {
    expect(() =>
      createFinancingMediaRuntime(principal, {
        ...LOCAL_SYNTHETIC_ENV,
        OALO_ENVIRONMENT: "production",
      }),
    ).toThrow();
  });
  it("retains required nullable facts and rejects forged/duplicate placements", () => {
    const facts = {
      listPriceMinor: null,
      bedrooms: null,
      bathroomsHundredths: null,
      floorAreaSqFt: null,
      confirmed: true,
    };
    expect(FinancingPropertyFactsSchema.parse(facts)).toEqual(facts);
    expect(FinancingPropertyFactsSchema.safeParse({ ...facts, listPriceMinor: 0 }).success).toBe(
      false,
    );
    expect(
      FinancingPropertyFactsSchema.safeParse({ ...facts, url: "https://outside.invalid" }).success,
    ).toBe(false);
    expect(
      FinancingPropertyMediaSchema.safeParse(Array.from({ length: 7 }, () => ({}))).success,
    ).toBe(false);
  });
});
