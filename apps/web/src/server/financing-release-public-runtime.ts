import "server-only";
import { createHash } from "node:crypto";
import { z } from "zod";
import {
  canonicalCampaignHash as hash,
  FinancingReleaseError,
  type FinancingReleasePorts,
  type FinancingReleaseRenderInput,
} from "@oalo/application";
import {
  FinancingReleaseRecordSchema,
  FinancingReleaseResolvedSourceSchema,
  FinancingReleaseSnapshotSchema,
  FinancingPublicMediaAuthorizationSchema,
  type FinancingReleaseAuthority,
} from "@oalo/contracts";
import {
  createPostgresPool,
  PostgresPublicFinancingReleaseRepository,
  PostgresPublicFinancingInquiryAdmissionRepository,
  type DatabasePool,
} from "@oalo/db";
import { createFinancingReleaseArtifactStore } from "./financing-release-artifacts.js";
import { createPublicFinancingOutputRenderer } from "./financing-release-render.js";
import { FINANCING_PUBLIC_FONT_HASH, FINANCING_PUBLIC_RENDERER } from "./financing-release-html.js";
import {
  createPublicFinancingHttp,
  type PublicFinancingHttpDependencies,
} from "./financing-release-public-http.js";

const Key = z.string().regex(/^[a-f0-9]{64}$/u);
const Keyring = z
  .object({
    currentKeyId: z.string().regex(/^[A-Za-z0-9_-]{1,40}$/u),
    keys: z.record(z.string().regex(/^[A-Za-z0-9_-]{1,40}$/u), Key),
  })
  .strict();
const Environment = z.object({
  OALO_APP_URL: z
    .url({ protocol: /^https$/u })
    .refine(
      (value) =>
        new URL(value).origin === value && /^https:\/\/[a-z0-9.-]+(?::[0-9]+)?$/u.test(value),
    ),
  OALO_FINANCING_PUBLIC_ENABLED: z.literal("true"),
  OALO_FINANCING_PUBLICATION_IDS_JSON: z.string().max(100000),
  OALO_FINANCING_PUBLIC_DATABASE_URL: z.url({ protocol: /^postgres(?:ql)?$/u }),
  OALO_ENVIRONMENT: z.enum(["test", "preview", "staging", "production"]),
  OALO_FINANCING_INQUIRY_KEYRING_JSON: z.string().max(10000),
  OALO_FINANCING_INQUIRY_HASH_KEY: Key,
  OALO_FINANCING_INQUIRY_NONCE_KEY: Key,
  OALO_FINANCING_PUBLIC_CLIENT_HMAC_KEY: Key.optional(),
  OALO_R2_ACCOUNT_ID: z.string().regex(/^[a-f0-9]{32}$/u),
  OALO_R2_ACCESS_KEY_ID: z.string().min(1).max(512),
  OALO_R2_SECRET_ACCESS_KEY: z.string().min(32).max(512),
  OALO_R2_PRIVATE_BUCKET: z.string().regex(/^[a-z0-9][a-z0-9-]{1,62}$/u),
  OALO_R2_PUBLIC_BUCKET: z.string().regex(/^[a-z0-9][a-z0-9-]{1,62}$/u),
  OALO_R2_PUBLIC_BASE_URL: z.url({ protocol: /^https$/u }),
});
const unavailable = (): never => {
  throw new FinancingReleaseError("UNAVAILABLE", 503);
};
const REFUSAL_CSP =
  "default-src 'none'; script-src 'none'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; form-action 'none'";
export function parsePublicFinancingConfiguration(raw: unknown) {
  try {
    const env = Environment.parse(raw);
    const publicationIds = z
      .array(z.uuid())
      .min(1)
      .max(1000)
      .parse(JSON.parse(env.OALO_FINANCING_PUBLICATION_IDS_JSON));
    const keyring = Keyring.parse(JSON.parse(env.OALO_FINANCING_INQUIRY_KEYRING_JSON));
    const keys = Object.fromEntries(
      Object.entries(keyring.keys).map(([id, key]) => [id, Buffer.from(key, "hex")]),
    );
    const allKeys = [
      ...Object.values(keyring.keys),
      env.OALO_FINANCING_INQUIRY_HASH_KEY,
      env.OALO_FINANCING_INQUIRY_NONCE_KEY,
      ...(env.OALO_FINANCING_PUBLIC_CLIENT_HMAC_KEY === undefined
        ? []
        : [env.OALO_FINANCING_PUBLIC_CLIENT_HMAC_KEY]),
    ];
    if (
      !keys[keyring.currentKeyId] ||
      Object.keys(keys).length > 10 ||
      new Set(allKeys).size !== allKeys.length ||
      new Set(publicationIds).size !== publicationIds.length
    )
      unavailable();
    return {
      env,
      publicationIds,
      crypto: {
        currentKeyId: keyring.currentKeyId,
        keys,
        requestHashKey: Buffer.from(env.OALO_FINANCING_INQUIRY_HASH_KEY, "hex"),
      },
      nonceKey: Buffer.from(env.OALO_FINANCING_INQUIRY_NONCE_KEY, "hex"),
      r2: {
        accountId: env.OALO_R2_ACCOUNT_ID,
        accessKeyId: env.OALO_R2_ACCESS_KEY_ID,
        secretAccessKey: env.OALO_R2_SECRET_ACCESS_KEY,
        privateBucket: env.OALO_R2_PRIVATE_BUCKET,
        publicBucket: env.OALO_R2_PUBLIC_BUCKET,
        publicBaseUrl: env.OALO_R2_PUBLIC_BASE_URL,
      },
    };
  } catch {
    return unavailable();
  } // Configuration failure exposes no values or parser details.
}
type Configuration = ReturnType<typeof parsePublicFinancingConfiguration>;
// Successful immutable output verification metadata only. No bytes, source records, visitor
// fields, ownership decisions or permission proofs are retained. No in-flight/failed promises.
const successfulParityUntil = new Map<string, number>();
const PARITY_CACHE_LIMIT = 32;
const PARITY_CACHE_MILLISECONDS = 60000;

/** Next may initialize the URL from its internal listener. Exact raw Host is required first.
 * Only loopback internal URLs can be rewritten; forwarded headers never choose an origin. */
export function canonicalPublicFinancingRequest(
  request: Request,
  id: string,
  resource: string,
  config: Configuration,
) {
  const canonical = new URL(config.env.OALO_APP_URL),
    url = new URL(request.url);
  if (
    !z.uuid().safeParse(id).success ||
    !config.publicationIds.includes(id) ||
    request.headers.get("host") !== canonical.host ||
    url.pathname !== `/p/${id}${resource}` ||
    url.search ||
    url.hash ||
    url.username ||
    url.password
  )
    unavailable();
  if (
    url.origin !== canonical.origin &&
    !(url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))
  )
    unavailable();
  return new Request(`${canonical.origin}${url.pathname}`, request);
}

/** Existing private property-media convention, after matching exact admitted immutable source.
 * No identity locator is invented and no unsupported image becomes a text-only substitution. */
export function resolvePublicPropertyMedia(
  input: FinancingReleaseRenderInput,
  raw: FinancingReleaseAuthority["mediaAuthorizations"][number],
) {
  const source = FinancingReleaseResolvedSourceSchema.parse(input.source),
    asset = FinancingPublicMediaAuthorizationSchema.parse(raw);
  const manifest = source.sourceVersion.manifest;
  const property =
    manifest.schemaVersion === 2
      ? manifest.property.media.find((item) => item.mediaRef === asset.assetRef)
      : undefined;
  if (
    asset.purpose !== "property" ||
    !property ||
    !source.authority.mediaAuthorizations.some((item) => hash(item) === hash(asset)) ||
    property.sha256 !== asset.sha256 ||
    property.mimeType !== asset.mimeType ||
    property.byteSize !== asset.byteSize ||
    property.normalizationVersion !== asset.normalizationVersion ||
    asset.authority.locationRef !== source.sourceVersion.locationRef ||
    asset.authority.contentHash !== asset.sha256
  )
    unavailable();
  return {
    locationRef: source.sourceVersion.locationRef,
    assetRef: asset.assetRef,
    objectKey: `locations/${source.sourceVersion.locationRef}/financing-media/${asset.assetRef}/${asset.sha256}.${asset.mimeType === "image/png" ? "png" : "jpg"}`,
    sha256: asset.sha256,
    mimeType: asset.mimeType,
    byteSize: asset.byteSize,
  };
}

export interface PublicFinancingRuntimeDependencies {
  readonly pool: DatabasePool;
  /** Must be native durable admission backed by a trusted deployment client identity resolver.
   * No cookie/request UUID, visitor header, in-memory limiter or unconditional allow fallback. */
  readonly admitInquiry: PublicFinancingHttpDependencies["admitInquiry"];
}

/** Concrete durable admission needs an independently qualified deployment-client resolver.
 * This module has no trusted visitor-header/IP policy and never derives one from Host or cookies. */
export function createNativePublicFinancingAdmission(
  raw: unknown,
  pool: DatabasePool,
  resolveTrustedDeploymentClient: (request: Request) => Promise<unknown>,
): PublicFinancingHttpDependencies["admitInquiry"] {
  const config = parsePublicFinancingConfiguration(raw);
  if (
    !config.env.OALO_FINANCING_PUBLIC_CLIENT_HMAC_KEY ||
    typeof resolveTrustedDeploymentClient !== "function"
  )
    unavailable();
  const repository = new PostgresPublicFinancingInquiryAdmissionRepository(
    pool,
    Buffer.from(config.env.OALO_FINANCING_PUBLIC_CLIENT_HMAC_KEY!, "hex"),
  );
  return async (request, publicationId, requestId) => {
    canonicalPublicFinancingRequest(request, publicationId, "/inquiry", config);
    let trustedClientKey: Uint8Array;
    try {
      trustedClientKey = z
        .instanceof(Uint8Array)
        .refine((bytes) => bytes.byteLength > 0 && bytes.byteLength <= 512)
        .parse(await resolveTrustedDeploymentClient(request));
    } catch {
      return unavailable();
    } // Missing deployment authority is an unavailable service, not a visitor identity.
    const decision = await repository.admit({
      publicationId,
      canonicalOrigin: config.env.OALO_APP_URL,
      requestId,
      trustedClientKey,
    });
    return {
      allowed: decision.allowed,
      retryAfterSeconds: decision.allowed ? 1 : decision.retryAfterSeconds,
    };
  };
}
export function createNativePublicFinancingRuntime(
  raw: unknown,
  dependencies: Readonly<{
    pool: DatabasePool;
    resolveTrustedDeploymentClient: (request: Request) => Promise<unknown>;
  }>,
) {
  return createPublicFinancingRuntime(raw, {
    pool: dependencies.pool,
    admitInquiry: createNativePublicFinancingAdmission(
      raw,
      dependencies.pool,
      dependencies.resolveTrustedDeploymentClient,
    ),
  });
}
export function createPublicFinancingRuntime(
  raw: unknown,
  dependencies: PublicFinancingRuntimeDependencies,
) {
  const config = parsePublicFinancingConfiguration(raw);
  return createPublicFinancingHttp({
    nonceKey: config.nonceKey,
    admitInquiry: dependencies.admitInquiry,
    async resolve(request, id) {
      canonicalPublicFinancingRequest(
        request,
        id,
        new URL(request.url).pathname.slice(`/p/${id}`.length),
        config,
      );
      const repo = new PostgresPublicFinancingReleaseRepository(
        dependencies.pool,
        id,
        config.env.OALO_APP_URL,
        config.crypto,
      );
      const record = FinancingReleaseRecordSchema.parse(await repo.findPublication()),
        snapshot = record.snapshot;
      const source = FinancingReleaseResolvedSourceSchema.parse(
        await repo.resolveSource(
          snapshot.campaignRef,
          snapshot.campaignVersionRef,
          snapshot.evidenceHash,
        ),
      );
      if (
        snapshot.publicationId !== id ||
        snapshot.canonicalUrl !== `${config.env.OALO_APP_URL}/p/${id}` ||
        source.sourceVersion.locationRef !== snapshot.locationRef ||
        hash(source.authority) !== snapshot.evidenceHash ||
        source.sourceVersion.manifestHash !== snapshot.manifestHash
      )
        unavailable();
      if (!source.authority.lenderIdentity.textOnly || !source.authority.partnerIdentity.textOnly)
        unavailable();
      const input: FinancingReleaseRenderInput = {
        source,
        presentation: snapshot.presentation,
        publicationId: id,
        canonicalUrl: snapshot.canonicalUrl,
        manifestHash: snapshot.manifestHash,
        evidenceHash: snapshot.evidenceHash,
      };
      const store = createFinancingReleaseArtifactStore(input, config.r2, {
        resolveMedia: async (asset) => resolvePublicPropertyMedia(input, asset),
      });
      const renderer = createPublicFinancingOutputRenderer({ readMedia: store.readMedia });
      const ports: FinancingReleasePorts = {
        now: () => new Date(),
        newReleaseRef: unavailable,
        newPublicationId: unavailable,
        authorize: async () => unavailable(),
        resolve: async (principal, selection, stage) => {
          if (
            !["read", "capture"].includes(stage) ||
            principal.locationRef !== snapshot.locationRef ||
            principal.actorRef !== snapshot.actorRef ||
            !("releaseRef" in selection) ||
            selection.releaseRef !== snapshot.releaseRef ||
            selection.publicationId !== id
          )
            unavailable();
          const selected = FinancingReleaseSnapshotSchema.parse(selection);
          if (hash(selected) !== hash(snapshot)) unavailable();
          return repo.resolveSource(
            selected.campaignRef,
            selected.campaignVersionRef,
            selected.evidenceHash,
          );
        },
        ...store,
        ...renderer,
        render: async () => unavailable(),
        putOutput: async () => unavailable(),
        async assertOutputParity(rawInput, kind, bytes) {
          // Reuse only after the native locked capability rechecks current full evidence. The
          // application still resolves/validates source math, normalized media and output byte
          // hashes on every read, including a hit. The HTTP commit boundary rechecks it again.
          await repo.transaction(snapshot.locationRef, async (tx) => {
            await tx.assertEvidenceCurrent(snapshot, new Date().toISOString());
          });
          const key = hash({
            input: rawInput,
            kind,
            bytesHash: createHash("sha256").update(bytes).digest("hex"),
            renderer: FINANCING_PUBLIC_RENDERER,
            font: FINANCING_PUBLIC_FONT_HASH,
          });
          const now = performance.now();
          if ((successfulParityUntil.get(key) ?? 0) > now) return;
          successfulParityUntil.delete(key);
          await renderer.assertOutputParity(rawInput, kind, bytes);
          await repo.transaction(snapshot.locationRef, async (tx) => {
            await tx.assertEvidenceCurrent(snapshot, new Date().toISOString());
          });
          for (const [existing, until] of successfulParityUntil) {
            if (until <= performance.now()) successfulParityUntil.delete(existing);
          }
          if (successfulParityUntil.size >= PARITY_CACHE_LIMIT) {
            const oldest = successfulParityUntil.keys().next().value;
            if (oldest !== undefined) successfulParityUntil.delete(oldest);
          }
          successfulParityUntil.set(key, performance.now() + PARITY_CACHE_MILLISECONDS);
        },
        transaction: (location, work) => repo.transaction(location, work),
        findPublication: async (publicationId, origin) => {
          if (publicationId !== id || origin !== config.env.OALO_APP_URL) unavailable();
          return repo.findPublication();
        },
      };
      return { canonicalOrigin: config.env.OALO_APP_URL, ports };
    },
  });
}

let cached: { fingerprint: string; pool: ReturnType<typeof createPostgresPool> } | undefined;
function publicPool(config: Configuration) {
  const fingerprint = createHash("sha256")
    .update(config.env.OALO_FINANCING_PUBLIC_DATABASE_URL)
    .update(config.env.OALO_ENVIRONMENT)
    .digest("hex");
  if (cached && cached.fingerprint !== fingerprint) unavailable(); // Restart for credential rotation; no abandoned pools.
  if (!cached)
    cached = {
      fingerprint,
      pool: createPostgresPool({
        connectionString: config.env.OALO_FINANCING_PUBLIC_DATABASE_URL,
        deploymentEnvironment: config.env.OALO_ENVIRONMENT,
        poolingMode: "transaction",
        preparedStatements: false,
        sslMode: config.env.OALO_ENVIRONMENT === "test" ? "disable" : "verify-full",
        applicationName: "oalo-financing-public-runtime",
        maxConnections: 2,
      }),
    };
  return cached.pool;
}
/** Default native read composition. Native inquiry admission is deliberately unbound until the
 * separately reviewed database capability and trusted deployment client resolver are available. */
export async function handlePublicFinancingRequest(
  request: Request,
  id: string,
  resource = "",
  environment: unknown = process.env,
): Promise<Response> {
  try {
    const config = parsePublicFinancingConfiguration(environment);
    const canonical = canonicalPublicFinancingRequest(request, id, resource, config);
    if (resource === "/inquiry") unavailable(); // Native durable admission/deployment client authority is not yet bound.
    const http = createPublicFinancingRuntime(environment, {
      pool: publicPool(config),
      admitInquiry: async () => unavailable(),
    });
    const response = await http.read(canonical, id, resource);
    if (!response.headers.has("content-security-policy"))
      response.headers.set("content-security-policy", REFUSAL_CSP);
    return request.method === "HEAD"
      ? new Response(null, { status: response.status, headers: response.headers })
      : response;
  } catch {
    return new Response(
      request.method === "HEAD"
        ? null
        : resource === "/inquiry"
          ? "The request is temporarily unavailable. Please try again."
          : "This report is unavailable.",
      {
        status: resource === "/inquiry" ? 503 : 404,
        headers: {
          "cache-control": "private, no-store, max-age=0",
          "x-robots-tag": "noindex, nofollow, noarchive",
          "referrer-policy": "no-referrer",
          "x-content-type-options": "nosniff",
          "content-type": "text/plain; charset=utf-8",
          "content-security-policy": REFUSAL_CSP,
        },
      },
    );
  } // Sanitized fail-closed setup refusal; no plaintext/provider/config detail escapes.
}
