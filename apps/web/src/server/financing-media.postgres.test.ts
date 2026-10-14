import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  createPrincipalBoundTenantContextAuthority,
  PostgresFinancingMediaRepository,
} from "@oalo/db";
import { financingMediaKey } from "@oalo/storage";
import { POST as uploadPost } from "../app/api/campaigns/property/financing/media/route.js";
import { GET as imageGet } from "../app/api/campaigns/property/financing/media/[mediaRef]/route.js";
import { POST as revokePost } from "../app/api/campaigns/property/financing/media/[mediaRef]/revoke/route.js";
import * as runtimeModule from "./financing-media-runtime.js";
import {
  resetCampaignDatabasePoolForTests,
  workspaceCorrelationReferenceFor,
} from "./campaign-persistence-runtime.js";
import {
  applyRouteEnvironment,
  browserRequest,
  createRouteTestPool,
  csrfSecretFor,
  issueSession,
  principalForSession,
  routeEnvironment,
  seedActor,
  seedLocation,
  type IssuedSession,
} from "./campaign-route-postgres-support.js";

const environment = routeEnvironment(),
  pool = createRouteTestPool();
let owner: IssuedSession,
  viewer: IssuedSession,
  outsider: IssuedSession,
  csrf: Uint8Array,
  restore: () => void;
const storedBytes = new Map<string, Uint8Array>();
let jpeg: Buffer;
function uploadRequest(session: IssuedSession, requestId = randomUUID()) {
  const authorized = browserRequest({
    path: "/api/campaigns/property/financing/media",
    body: null,
    session,
    csrfServerSecret: csrf,
  });
  const headers = new Headers(authorized.headers);
  headers.set("Content-Type", "image/jpeg");
  headers.set("X-OALO-Media-Request-Id", requestId);
  headers.set("X-OALO-Media-Rights-Basis", "owned");
  headers.set("X-OALO-Media-Rights-Confirmed", "true");
  return new Request(authorized.url, {
    method: "POST",
    headers,
    body: Uint8Array.from(jpeg).buffer,
  });
}
const readRequest = (session: IssuedSession) =>
  new Request(`${environment.OALO_APP_URL}/api/campaigns/property/financing/media`, {
    headers: { cookie: session.cookieHeader },
  });
const params = (mediaRef: string) => ({ params: Promise.resolve({ mediaRef }) });
beforeAll(async () => {
  restore = applyRouteEnvironment(environment);
  csrf = csrfSecretFor(environment);
  const a = await seedLocation(pool, "Financing media isolated A"),
    b = await seedLocation(pool, "Financing media isolated B");
  owner = await issueSession(
    pool,
    a,
    await seedActor(pool, a, {
      displayName: "Media creator",
      bindingRole: "creator",
      sessionRole: "campaign_creator",
    }),
  );
  viewer = await issueSession(
    pool,
    a,
    await seedActor(pool, a, {
      displayName: "Media reader",
      bindingRole: "analyst",
      sessionRole: "viewer",
    }),
  );
  outsider = await issueSession(
    pool,
    b,
    await seedActor(pool, b, {
      displayName: "Foreign creator",
      bindingRole: "creator",
      sessionRole: "campaign_creator",
    }),
  );
  jpeg = await sharp({
    create: { width: 800, height: 600, channels: 3, background: { r: 30, g: 130, b: 70 } },
  })
    .jpeg()
    .toBuffer();
  // Only byte storage is substituted; metadata, tenant RLS, sessions and real routes remain real.
  vi.spyOn(runtimeModule, "createFinancingMediaRuntime").mockImplementation((principal) => ({
    repository: new PostgresFinancingMediaRepository(
      pool,
      createPrincipalBoundTenantContextAuthority(
        principal,
        workspaceCorrelationReferenceFor(principal),
      ),
      principal,
    ),
    bytes: {
      async putImmutable(record, bytes) {
        const key = financingMediaKey(record);
        if (!storedBytes.has(key)) storedBytes.set(key, Uint8Array.from(bytes));
      },
      async read(record) {
        const bytes = storedBytes.get(financingMediaKey(record));
        if (!bytes) throw new Error("Missing test bytes");
        return bytes;
      },
    },
  }));
});
afterAll(async () => {
  vi.restoreAllMocks();
  restore?.();
  await resetCampaignDatabasePoolForTests();
  await pool.close();
});
describe("financing media on actual PostgreSQL and exported routes", () => {
  it("commits concurrent exact requests once, preserves attestation, rejects changed rights", async () => {
    const id = randomUUID();
    const responses = await Promise.all([
      uploadPost(uploadRequest(owner, id)),
      uploadPost(uploadRequest(owner, id)),
    ]);
    expect(responses.every((r) => [200, 201].includes(r.status))).toBe(true);
    const a = await responses[0]!.json(),
      b = await responses[1]!.json();
    expect(a).toEqual(b);
    const retry = await uploadPost(uploadRequest(owner, id));
    expect(retry.status).toBe(200);
    expect(await retry.json()).toEqual(a);
    const changed = uploadRequest(owner, id);
    changed.headers.set("X-OALO-Media-Rights-Basis", "licensed");
    expect((await uploadPost(changed)).status).toBe(409);
    const principal = await principalForSession(owner, environment);
    const repo = new PostgresFinancingMediaRepository(
      pool,
      createPrincipalBoundTenantContextAuthority(
        principal,
        workspaceCorrelationReferenceFor(principal),
      ),
      principal,
    );
    expect((await repo.find(a.mediaRef))?.record.rights).toEqual(a.rights);
  });
  it("allows tenant readers, hides foreign references and denies reader mutations/CSRF", async () => {
    const saved = await (await uploadPost(uploadRequest(owner))).json();
    expect((await imageGet(readRequest(viewer), params(saved.mediaRef))).status).toBe(200);
    expect((await imageGet(readRequest(outsider), params(saved.mediaRef))).status).toBe(404);
    expect((await uploadPost(uploadRequest(viewer))).status).toBe(403);
    const invalid = uploadRequest(owner);
    invalid.headers.delete("x-csrf-token");
    expect((await uploadPost(invalid)).status).toBe(401);
    const revoke = browserRequest({
      path: "/api/campaigns/property/financing/media",
      body: null,
      session: viewer,
      csrfServerSecret: csrf,
    });
    expect(
      (
        await revokePost(
          new Request(revoke.url, { method: "POST", headers: revoke.headers }),
          params(saved.mediaRef),
        )
      ).status,
    ).toBe(403);
  });
  it("appends revocation once and denies all subsequent reads", async () => {
    const saved = await (await uploadPost(uploadRequest(owner))).json();
    const make = () => {
      const r = browserRequest({
        path: "/api/campaigns/property/financing/media",
        body: null,
        session: owner,
        csrfServerSecret: csrf,
      });
      return new Request(r.url, { method: "POST", headers: r.headers });
    };
    const first = await revokePost(make(), params(saved.mediaRef));
    expect(first.status).toBe(200);
    const second = await revokePost(make(), params(saved.mediaRef));
    expect(await second.json()).toEqual(await first.json());
    expect((await imageGet(readRequest(owner), params(saved.mediaRef))).status).toBe(410);
  });
});
