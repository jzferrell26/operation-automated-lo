import "server-only";
import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import {
  assertFinancingReleaseEligible,
  captureFinancingInquiry,
  canonicalCampaignHash,
  FinancingReleaseError,
  type FinancingReleasePorts,
} from "@oalo/application";
import {
  FinancingReleaseInquiryRequestSchema,
  FinancingReleaseRecordSchema,
  FinancingReleaseResolvedSourceSchema,
  type FinancingReleaseRecord,
} from "@oalo/contracts";
import { publicMediaRef } from "./financing-release-html.js";

const HEADERS = Object.freeze({
  "cache-control": "private, no-store, max-age=0",
  "referrer-policy": "no-referrer",
  "x-content-type-options": "nosniff",
  "x-robots-tag": "noindex, nofollow, noarchive",
});
const NONCE_SECONDS = 900;
const Origin = z.url({ protocol: /^https$/u }).refine((value) => {
  const url = new URL(value);
  return url.origin === value && !url.username && !url.password;
});
const Nonce = z
  .object({
    version: z.literal(1),
    publicationId: z.uuid(),
    origin: Origin,
    requestId: z.uuid(),
    issuedAt: z.number().int().nonnegative(),
    expiresAt: z.number().int().positive(),
  })
  .strict();
type PublicRuntime = Readonly<{ canonicalOrigin: string; ports: FinancingReleasePorts }>;
export interface PublicFinancingHttpDependencies {
  /** Must independently resolve an exact current host/publication capability. A request's
   * Host, URL, body or forwarded headers are not an authority to choose a tenant. */
  readonly resolve: (request: Request, publicationId: string) => Promise<PublicRuntime>;
  readonly nonceKey: Uint8Array;
  /** A durable native rate/quota check, required before every inquiry capture. */
  readonly admitInquiry: (
    request: Request,
    publicationId: string,
    requestId: string,
  ) => Promise<unknown>;
  readonly newRequestId?: () => string;
}
class PublicHttpFailure extends Error {
  constructor(readonly status: number) {
    super("Public financing request unavailable.");
  }
}
function reject(status: number): never {
  throw new PublicHttpFailure(status);
}
const digest = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const unavailable = () =>
  new Response("This report is unavailable.", {
    status: 404,
    headers: { ...HEADERS, "content-type": "text/plain; charset=utf-8" },
  });
function cookieName(id: string) {
  return `__Secure-oalo_property_${createHash("sha256").update(id).digest("hex").slice(0, 20)}`;
}
function cookieValue(request: Request, name: string) {
  const values = (request.headers.get("cookie") ?? "")
    .split(";")
    .map((item) => item.trim())
    .filter((item) => item.startsWith(`${name}=`));
  if (values.length !== 1) return null;
  return values[0]!.slice(name.length + 1);
}
function htmlCsp(bytes: Uint8Array) {
  const html = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  const styles = [...html.matchAll(/<style>([\s\S]*?)<\/style>/gu)];
  if (styles.length !== 1) reject(404);
  const hash = createHash("sha256").update(styles[0]![1]!).digest("base64");
  return `default-src 'none'; base-uri 'none'; object-src 'none'; script-src 'none'; connect-src 'none'; frame-ancestors 'none'; form-action 'self'; img-src 'self'; font-src data:; style-src 'sha256-${hash}'`;
}
async function formInput(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) reject(400);
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      length += next.value.byteLength;
      if (length > 5000) {
        await reader.cancel();
        reject(413);
      }
      chunks.push(next.value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = Buffer.concat(chunks, length);
  const form = new URLSearchParams(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  const fields = ["firstName", "email", "intent", "honeypot", "consent"];
  if (
    [...form.keys()].some((key) => !fields.includes(key)) ||
    fields.some((key) => form.getAll(key).length !== 1)
  )
    reject(400);
  if (form.get("consent") !== "true") reject(400);
  return {
    firstName: form.get("firstName"),
    email: form.get("email"),
    intent: form.get("intent"),
    honeypot: form.get("honeypot"),
    consent: true,
  };
}

/** HTTP consumer of required concrete release ports. This factory supplies no memory adapter,
 * source admission, host authority, limiter or configured production default. */
export function createPublicFinancingHttp(dependencies: PublicFinancingHttpDependencies) {
  if (!(dependencies.nonceKey instanceof Uint8Array) || dependencies.nonceKey.byteLength !== 32)
    throw new Error("A configured public inquiry key is required.");
  const key = Buffer.from(dependencies.nonceKey);
  const sign = (payload: string) => createHmac("sha256", key).update(payload).digest("base64url");
  function readNonce(request: Request, id: string, origin: string, now: number) {
    try {
      const token = cookieValue(request, cookieName(id));
      if (!token || token.length > 1024 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$/u.test(token))
        return null;
      const [payload, signature] = token.split(".") as [string, string];
      const expected = Buffer.from(sign(payload), "base64url"),
        actual = Buffer.from(signature, "base64url");
      if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
      const value = Nonce.parse(JSON.parse(Buffer.from(payload, "base64url").toString("utf8")));
      if (
        value.publicationId !== id ||
        value.origin !== origin ||
        value.issuedAt > now ||
        value.expiresAt !== value.issuedAt + NONCE_SECONDS * 1000 ||
        value.expiresAt <= now
      )
        return null;
      return value;
    } catch {
      return null;
    } // Invalid visitor capability is a refusal, never a new identity.
  }
  async function runtime(request: Request, id: string, resource: string) {
    if (!z.uuid().safeParse(id).success) reject(404);
    const value = await dependencies.resolve(request, id);
    const origin = Origin.parse(value.canonicalOrigin);
    const url = new URL(request.url);
    if (url.origin !== origin || url.pathname !== `/p/${id}${resource}` || url.search || url.hash)
      reject(404);
    return { ...value, canonicalOrigin: origin };
  }
  async function current<T>(
    value: PublicRuntime,
    id: string,
    work: (record: FinancingReleaseRecord) => Promise<T>,
  ) {
    const initial = FinancingReleaseRecordSchema.parse(
      await value.ports.findPublication(id, value.canonicalOrigin),
    );
    if (
      initial.snapshot.publicationId !== id ||
      initial.snapshot.authority.origin.canonicalOrigin !== value.canonicalOrigin
    )
      reject(404);
    return value.ports.transaction(initial.snapshot.locationRef, async (tx) => {
      const record = await assertFinancingReleaseEligible(
        await tx.load(initial.snapshot.releaseRef),
        {
          locationRef: initial.snapshot.locationRef,
          actorRef: initial.snapshot.actorRef,
        },
        value.ports,
        "read",
      );
      if (
        record.snapshot.publicationId !== id ||
        record.snapshot.canonicalUrl !== `${value.canonicalOrigin}/p/${id}`
      )
        reject(404);
      await tx.assertEvidenceCurrent(record.snapshot, value.ports.now().toISOString());
      const result = await work(record);
      if (Date.parse(record.snapshot.validUntil) <= value.ports.now().getTime()) reject(404);
      await tx.assertEvidenceCurrent(record.snapshot, value.ports.now().toISOString());
      return result;
    });
  }
  async function read(request: Request, publicationId: string, resource = "") {
    try {
      if (request.method !== "GET" && request.method !== "HEAD") reject(404);
      if (
        resource !== "" &&
        resource !== "/report.pdf" &&
        !/^\/media\/[a-f0-9]{64}$/u.test(resource)
      )
        reject(404);
      const value = await runtime(request, publicationId, resource);
      return await current(value, publicationId, async (record) => {
        let bytes: Uint8Array, type: string;
        const headers = new Headers(HEADERS);
        if (resource.startsWith("/media/")) {
          const snapshot = record.snapshot;
          const source = await value.ports.resolve(
            { locationRef: snapshot.locationRef, actorRef: snapshot.actorRef },
            snapshot,
            "read",
          );
          const input = {
            source,
            presentation: snapshot.presentation,
            publicationId,
            canonicalUrl: snapshot.canonicalUrl,
            manifestHash: snapshot.manifestHash,
            evidenceHash: snapshot.evidenceHash,
          };
          // The same strict resolved-source schema used by eligibility validates the input.
          const parsed = FinancingReleaseResolvedSourceSchema.parse(source);
          if (
            canonicalCampaignHash(parsed.authority) !== snapshot.evidenceHash ||
            parsed.sourceVersion.manifestHash !== snapshot.manifestHash
          )
            reject(404);
          const index = snapshot.authority.mediaAuthorizations.findIndex(
            (_asset, i) => publicMediaRef({ ...input, source: parsed }, i) === resource.slice(7),
          );
          const asset = snapshot.authority.mediaAuthorizations[index];
          if (!asset) reject(404);
          bytes = await value.ports.readMedia(asset);
          type = asset.mimeType;
          if (bytes.byteLength !== asset.byteSize || digest(bytes) !== asset.sha256) reject(404);
          await value.ports.assertNormalizedMedia(asset, bytes);
        } else {
          const seal = record.snapshot.outputSeals.find(
            (item) => item.kind === (resource ? "pdf" : "site"),
          );
          if (!seal) reject(404);
          bytes = await value.ports.readOutput(seal);
          type = seal.mimeType;
          if (bytes.byteLength !== seal.byteSize || digest(bytes) !== seal.sha256) reject(404);
          headers.set(
            "content-security-policy",
            resource ? "default-src 'none'; frame-ancestors 'none'; sandbox" : htmlCsp(bytes),
          );
          if (resource)
            headers.set("content-disposition", 'attachment; filename="financing-comparison.pdf"');
          else if (request.method === "GET") {
            const now = value.ports.now().getTime();
            const nonce =
              readNonce(request, publicationId, value.canonicalOrigin, now) ??
              Nonce.parse({
                version: 1,
                publicationId,
                origin: value.canonicalOrigin,
                requestId: (dependencies.newRequestId ?? randomUUID)(),
                issuedAt: now,
                expiresAt: now + NONCE_SECONDS * 1000,
              });
            const payload = Buffer.from(JSON.stringify(nonce)).toString("base64url");
            headers.set(
              "set-cookie",
              `${cookieName(publicationId)}=${payload}.${sign(payload)}; Path=/p/${publicationId}; Secure; HttpOnly; SameSite=Strict; Max-Age=${Math.ceil((nonce.expiresAt - now) / 1000)}`,
            );
          }
        }
        headers.set("content-type", type);
        headers.set("content-length", String(bytes.byteLength));
        return new Response(request.method === "HEAD" ? null : Buffer.from(bytes), { headers });
      });
    } catch {
      return unavailable();
    } // No evidence or owner detail escapes anonymous denial.
  }
  async function inquiry(request: Request, publicationId: string) {
    try {
      if (request.method !== "POST") reject(405);
      const value = await runtime(request, publicationId, "/inquiry");
      if (request.headers.get("origin") !== value.canonicalOrigin) reject(403);
      if (
        request.headers.get("content-type")?.split(";")[0]?.trim() !==
        "application/x-www-form-urlencoded"
      )
        reject(415);
      const nonce = readNonce(
        request,
        publicationId,
        value.canonicalOrigin,
        value.ports.now().getTime(),
      );
      if (!nonce) reject(403);
      let input: z.infer<typeof FinancingReleaseInquiryRequestSchema>;
      try {
        input = FinancingReleaseInquiryRequestSchema.parse({
          ...(await formInput(request)),
          requestId: nonce.requestId,
        });
      } catch (error) {
        if (error instanceof PublicHttpFailure) throw error;
        reject(400);
      }
      let admission: { allowed: boolean; retryAfterSeconds: number };
      try {
        admission = z
          .object({ allowed: z.boolean(), retryAfterSeconds: z.number().int().min(1).max(86400) })
          .strict()
          .parse(await dependencies.admitInquiry(request, publicationId, nonce.requestId));
      } catch {
        reject(503);
      }
      if (!admission.allowed)
        return new Response("Please wait before trying again.", {
          status: 429,
          headers: { ...HEADERS, "retry-after": String(admission.retryAfterSeconds) },
        });
      const receipt = await captureFinancingInquiry(
        publicationId,
        value.canonicalOrigin,
        input,
        value.ports,
      );
      const messages = {
        pending: "Your request was saved. Delivery is pending.",
        in_progress: "Your request was saved. Delivery is in progress.",
        delivered: "Your request was delivered.",
        failed: "Your request was saved. Delivery could not be completed.",
        uncertain: "Your request was saved. Delivery needs review.",
        blocked: "Your request was saved. Delivery is paused.",
      } as const;
      return new Response(messages[receipt.deliveryState], {
        status: 202,
        headers: { ...HEADERS, "content-type": "text/plain; charset=utf-8" },
      });
    } catch (error) {
      if (error instanceof PublicHttpFailure)
        return new Response("The request could not be accepted.", {
          status: error.status,
          headers: { ...HEADERS, ...(error.status === 405 ? { allow: "POST" } : {}) },
        });
      if (error instanceof FinancingReleaseError) {
        if (error.code === "CONFLICT")
          return new Response("Your earlier request was saved. This change needs a new request.", {
            status: 409,
            headers: HEADERS,
          });
        if (error.code !== "UNAVAILABLE") return unavailable();
      }
      return new Response("The request is temporarily unavailable. Please try again.", {
        status: 503,
        headers: HEADERS,
      });
    }
  }
  return Object.freeze({ read, inquiry });
}
