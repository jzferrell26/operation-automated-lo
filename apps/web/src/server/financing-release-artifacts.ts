import "server-only";
import { z } from "zod";
import {
  canonicalCampaignHash as hash,
  type FinancingReleasePorts,
  type FinancingReleaseRenderInput,
} from "@oalo/application";
import {
  FinancingReleaseOutputSealSchema,
  FinancingPublicMediaAuthorizationSchema,
  OpaqueReferenceSchema,
  type FinancingReleaseOutputSeal,
} from "@oalo/contracts";
import {
  createR2ObjectStoreClient,
  privateArtifactKey,
  type R2ObjectStoreDependencies,
  type R2FetchTransport,
} from "@oalo/storage";
import { raceWithAbort } from "@oalo/config";
import {
  FINANCING_PUBLIC_RENDERER,
  FinancingOutputError,
  outputAssert,
  outputDigest,
  validateFinancingOutputInput,
} from "./financing-release-html.js";

const Config = z
  .object({
    accountId: z.string().regex(/^[a-f0-9]{32}$/u),
    accessKeyId: z.string(),
    secretAccessKey: z.string(),
    privateBucket: z.string(),
    publicBucket: z.string(),
    publicBaseUrl: z.url({ protocol: /^https$/u }),
    requestTimeoutMs: z.number().int().min(1).max(60000).default(15000),
  })
  .strict();
const MediaLocator = z
  .object({
    locationRef: OpaqueReferenceSchema,
    assetRef: OpaqueReferenceSchema,
    objectKey: z.string().min(1).max(1024),
    sha256: z.string().regex(/^[a-f0-9]{64}$/u),
    mimeType: z.enum(["image/png", "image/jpeg"]),
    byteSize: z.number().int().min(1).max(2097152),
  })
  .strict();
export interface FinancingArtifactDependencies extends R2ObjectStoreDependencies {
  /** Resolve only a current server-owned private media record admitted for this source.
   * This is required for identity uploads as well as legacy private property media. */
  readonly resolveMedia: (
    asset: Parameters<FinancingReleasePorts["readMedia"]>[0],
  ) => Promise<unknown>;
}
/** Private R2 storage for one resolved immutable source. The factory is internal and accepts
 * server-resolved input, never an anonymous request's claimed owner or object key. Eligibility
 * still belongs to the application before a public response. No public bucket copy is made. */
export function createFinancingReleaseArtifactStore(
  rawInput: FinancingReleaseRenderInput,
  rawConfig: unknown,
  dependencies: FinancingArtifactDependencies,
): Pick<FinancingReleasePorts, "readMedia" | "putOutput" | "readOutput"> {
  const input = validateFinancingOutputInput(rawInput),
    config = Config.parse(rawConfig),
    client = createR2ObjectStoreClient(config, dependencies),
    version = input.source.sourceVersion;
  const now = dependencies.now ?? (() => new Date());
  const transport: R2FetchTransport =
    dependencies.fetch ??
    ((url, init) =>
      fetch(url, {
        method: init.method,
        headers: init.headers,
        signal: init.signal,
        redirect: "error",
        ...(init.body === undefined
          ? {}
          : { body: typeof init.body === "string" ? init.body : Buffer.from(init.body) }),
      }));
  function sealFor(raw: FinancingReleaseOutputSeal) {
    const seal = FinancingReleaseOutputSealSchema.parse(raw);
    outputAssert(
      seal.rendererVersion === FINANCING_PUBLIC_RENDERER &&
        seal.artifactRef ===
          `artifact_${outputDigest(`${hash(input)}:${seal.kind}:${FINANCING_PUBLIC_RENDERER}`).slice(0, 32)}`,
      "INVALID",
    );
    const key = privateArtifactKey({
      locationRef: version.locationRef,
      campaignRef: version.campaignRef,
      campaignVersionRef: version.campaignVersionRef,
      artifactRef: seal.artifactRef,
      sha256: seal.sha256,
      extension: seal.kind === "site" ? "html" : "pdf",
    });
    return { seal, key };
  }
  async function read(
    key: string,
    mimeType: "text/html" | "application/pdf" | "image/jpeg" | "image/png",
    byteSize: number,
    sha256: string,
  ): Promise<Uint8Array> {
    outputAssert(
      key.startsWith(`locations/${version.locationRef}/`) &&
        key
          .split("/")
          .every((part) => /^[A-Za-z0-9._-]+$/u.test(part) && part !== "." && part !== ".."),
      "INVALID",
    );
    // The legacy download descriptor's MIME enum predates HTML. It is not sent on a GET or
    // used as an HTTP assertion. The actual response MIME below is checked independently.
    const request = {
      schemaVersion: 1 as const,
      direction: "download" as const,
      visibility: "private" as const,
      locationRef: version.locationRef,
      objectKey: key,
      contentType: mimeType === "text/html" ? ("application/pdf" as const) : mimeType,
      maximumBytes: byteSize,
      expectedSha256: sha256,
      expiresAt: new Date(now().getTime() + 60000).toISOString(),
    };
    const authorization = z
      .object({ authorization: z.string().min(24).max(512) })
      .passthrough()
      .parse(await client.authorizePrivateTransfer({ bucket: config.privateBucket, request }));
    const signed = client.createSignedPrivateTransfer({
      bucket: config.privateBucket,
      request,
      authorization: authorization.authorization,
    });
    const url = new URL(signed.url);
    outputAssert(
      url.protocol === "https:" &&
        url.hostname === `${config.accountId}.r2.cloudflarestorage.com` &&
        url.pathname === `/${config.privateBucket}/${key}` &&
        signed.method === "GET",
      "INVALID",
    );
    const signal = AbortSignal.timeout(config.requestTimeoutMs);
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    try {
      const response = await raceWithAbort(
        transport(signed.url, { method: "GET", headers: signed.requiredHeaders, signal }),
        signal,
      );
      outputAssert(
        response.status === 200 &&
          response.body &&
          response.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() === mimeType,
        "UNAVAILABLE",
      );
      const length = response.headers.get("content-length");
      outputAssert(length === null || (/^\d+$/u.test(length) && Number(length) === byteSize));
      reader = response.body.getReader();
      const bytes = new Uint8Array(byteSize);
      let offset = 0;
      while (true) {
        const chunk = await raceWithAbort(reader.read(), signal);
        if (chunk.done) break;
        outputAssert(chunk.value.byteLength + offset <= byteSize, "LIMIT");
        bytes.set(chunk.value, offset);
        offset += chunk.value.byteLength;
      }
      outputAssert(offset === byteSize && outputDigest(bytes) === sha256);
      return bytes;
    } catch (error) {
      if (error instanceof FinancingOutputError) throw error;
      throw new FinancingOutputError("UNAVAILABLE");
    } finally {
      if (reader) {
        // Cancellation failure cannot make rejected bytes usable. Await it without exposing
        // provider errors or replacing an integrity failure; always release the reader lock.
        await raceWithAbort(reader.cancel(), AbortSignal.timeout(1000)).catch(() => undefined);
        reader.releaseLock();
      }
    }
  }
  return Object.freeze({
    async readMedia(raw) {
      const asset = FinancingPublicMediaAuthorizationSchema.parse(raw);
      outputAssert(
        input.source.authority.mediaAuthorizations.some((a) => hash(a) === hash(asset)),
        "MEDIA",
      );
      const record = MediaLocator.parse(await dependencies.resolveMedia(asset));
      outputAssert(
        record.locationRef === version.locationRef &&
          record.assetRef === asset.assetRef &&
          record.sha256 === asset.sha256 &&
          record.mimeType === asset.mimeType &&
          record.byteSize === asset.byteSize,
        "MEDIA",
      );
      return read(record.objectKey, record.mimeType, record.byteSize, record.sha256);
    },
    async putOutput(raw, bytes) {
      const { seal, key } = sealFor(raw);
      outputAssert(bytes.byteLength === seal.byteSize && outputDigest(bytes) === seal.sha256);
      const stored = await client.store({
        artifactRef: seal.artifactRef,
        artifactType: seal.kind === "site" ? "public-page-projection" : "pdf",
        locationRef: version.locationRef,
        campaignRef: version.campaignRef,
        campaignVersionRef: version.campaignVersionRef,
        sha256: seal.sha256,
        mimeType: seal.mimeType,
        bytes: new Uint8Array(bytes),
      });
      outputAssert(stored === key);
      await read(key, seal.mimeType, seal.byteSize, seal.sha256);
    },
    async readOutput(raw) {
      const { seal, key } = sealFor(raw);
      return read(key, seal.mimeType, seal.byteSize, seal.sha256);
    },
  });
}
