import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";
import {
  createPrincipalBoundTenantContextAuthority,
  defineSqlContract,
  withTenantTransaction,
} from "@oalo/db";
import { PropertyPackageResponseSchema, type PropertyPackageRequest } from "@oalo/contracts";
import { POST as preparePost } from "../app/api/campaigns/property/route.js";
import { POST as packagePost } from "../app/api/campaigns/property/package/route.js";
import { GET as outputGet } from "../app/api/campaigns/property/package/[campaignRef]/[campaignVersionRef]/[output]/route.js";
import { POST as preferencesPost } from "../app/api/workspace/preferences/route.js";
import { PropertyCampaignSavedSchema } from "../features/property-campaigns/model.js";
import { SAVED_TEST_BRAND } from "./campaign-command-test-support.js";
import {
  createCampaignPersistenceAdapter,
  resetCampaignDatabasePoolForTests,
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
import { readWorkspacePreferences } from "./workspace-preferences.js";
import { propertyInput } from "./property-package.test-support.js";
import { createPropertyPackageStore } from "./property-package-store.js";
import { loadCampaignPage } from "./campaign-workspace-reads.js";
import { renderPropertyCampaignPackage } from "./property-package-render.js";

const environment = routeEnvironment();
const pool = createRouteTestPool();
let restore: () => void;
let csrf: Uint8Array;
let owner: IssuedSession, outsider: IssuedSession, viewer: IssuedSession, unbranded: IssuedSession;
const partnerId = randomUUID();
const partner = {
  id: partnerId,
  name: "Priya Package",
  company: "Example Partner Realty",
  email: "private-partner@example.invalid",
  phone: "555-010-9999",
};

function mutation(session: IssuedSession, path: string, body: unknown) {
  return browserRequest({ path, body, session, csrfServerSecret: csrf });
}
async function preference(key: "brand" | "partners", value: unknown) {
  const principal = await principalForSession(owner, environment);
  const current = await readWorkspacePreferences(principal, pool);
  const response = await preferencesPost(
    mutation(owner, "/api/workspace/preferences", {
      key,
      value,
      expectedRevision: (key === "brand" ? current.brand : current.partners)?.revision ?? null,
    }),
  );
  expect(response.status).toBe(200);
}

async function prepare(body = propertyInput({ partnerId }), session = owner) {
  const response = await preparePost(mutation(session, "/api/campaigns/property", body));
  expect(response.status).toBe(200);
  const saved = PropertyCampaignSavedSchema.parse(await response.json());
  const principal = await principalForSession(session, environment);
  const campaigns = createCampaignPersistenceAdapter(principal, environment).readRepository;
  const record = await campaigns.getByCampaignRef(saved.campaignRef);
  if (!record) throw new Error("Missing real database campaign");
  return {
    principal,
    campaigns,
    record,
    request: {
      campaignRef: record.version.campaignRef,
      campaignVersionRef: record.version.campaignVersionRef,
      sourceManifestHash: record.version.manifestHash,
    },
  };
}

function generate(
  request: PropertyPackageRequest,
  session = owner,
  overrides: Record<string, unknown> = {},
) {
  return packagePost(
    mutation(session, "/api/campaigns/property/package", { ...request, ...overrides }),
  );
}
function output(request: PropertyPackageRequest, type: string, session = owner) {
  return outputGet(
    new Request(`${environment.OALO_APP_URL}/api/campaigns/property/package/output`, {
      headers: { cookie: session.cookieHeader },
    }),
    {
      params: Promise.resolve({
        campaignRef: request.campaignRef,
        campaignVersionRef: request.campaignVersionRef,
        output: type,
      }),
    },
  );
}

const countContract = defineSqlContract({
  name: "test.property-package.count",
  access: "read",
  text: "select count(*)::integer as count from campaign.property_campaign_packages where campaign_version_ref=$1",
  decode: (row) => z.object({ count: z.number() }).parse(row).count,
});
async function packageCount(request: PropertyPackageRequest, session = owner) {
  const principal = await principalForSession(session, environment);
  const authority = createPrincipalBoundTenantContextAuthority(
    principal,
    "correlation_packageTest001",
  );
  return withTenantTransaction(
    pool,
    authority,
    async (tx) => (await tx.read(countContract, [request.campaignVersionRef]))[0],
  );
}

beforeAll(async () => {
  restore = applyRouteEnvironment(environment);
  csrf = csrfSecretFor(environment);
  const local = await seedLocation(pool, "Property package proof");
  const other = await seedLocation(pool, "Property package outsider");
  owner = await issueSession(
    pool,
    local,
    await seedActor(pool, local, {
      displayName: "Package owner",
      bindingRole: "location_admin",
      sessionRole: "location_admin",
    }),
  );
  viewer = await issueSession(
    pool,
    local,
    await seedActor(pool, local, {
      displayName: "Package viewer",
      bindingRole: "analyst",
      sessionRole: "viewer",
    }),
  );
  outsider = await issueSession(
    pool,
    other,
    await seedActor(pool, other, {
      displayName: "Package outsider",
      bindingRole: "location_admin",
      sessionRole: "location_admin",
    }),
  );
  unbranded = await issueSession(
    pool,
    local,
    await seedActor(pool, local, {
      displayName: "No saved brand",
      bindingRole: "creator",
      sessionRole: "campaign_creator",
    }),
  );
  await preference("brand", SAVED_TEST_BRAND);
  await preference("partners", { items: [partner] });
});
afterAll(async () => {
  await resetCampaignDatabasePoolForTests();
  await pool.close();
  restore?.();
});

describe("private property package through exported routes and real PostgreSQL", () => {
  it("reads actual saved brand/partner data, freezes the source, and retrieves all four files", async () => {
    const data = await prepare();
    const generated = await generate(data.request);
    expect(generated.status).toBe(200);
    const first = PropertyPackageResponseSchema.parse(await generated.json());
    expect(first.package.reviewOnly).toBe(true);
    expect(await packageCount(data.request)).toBe(1);
    const html = await (await output(data.request, "page")).text();
    expect(html).toContain(SAVED_TEST_BRAND.name);
    expect(html).toContain(partner.name);
    expect(html).not.toContain("Jordan Sample");
    expect(html).not.toContain(partner.email);
    expect(html).not.toContain(partner.phone);
    expect(html).toContain("NOT CONFIRMED");
    for (const type of ["page", "flyer", "qr", "copy"]) {
      const response = await output(data.request, type);
      expect(response.status).toBe(200);
      expect(response.headers.get("cache-control")).toContain("no-store");
    }
    await preference("brand", { ...SAVED_TEST_BRAND, name: "Changed After Generation" });
    expect(await (await generate(data.request)).json()).toEqual(first);
    expect(await (await output(data.request, "page")).text()).toBe(html);
    await preference("brand", SAVED_TEST_BRAND);
    const read = await loadCampaignPage(
      data.principal,
      data.request.campaignRef,
      undefined,
      environment,
    );
    expect(read).toMatchObject({ kind: "page", page: { packageState: { kind: "ready" } } });
  });

  it("has one first-committer package when two generation requests race", async () => {
    const data = await prepare();
    const responses = await Promise.all([generate(data.request), generate(data.request)]);
    expect(responses.map((response) => response.status)).toEqual([200, 200]);
    const bodies = await Promise.all(responses.map((response) => response.json()));
    expect(bodies[0]).toEqual(bodies[1]);
    expect(await packageCount(data.request)).toBe(1);
  });

  it("proves row-level tenant isolation in addition to API authorization", async () => {
    const data = await prepare();
    expect((await generate(data.request)).status).toBe(200);
    expect((await generate(data.request, outsider)).status).toBe(404);
    expect((await output(data.request, "page", outsider)).status).toBe(404);
    expect(await packageCount(data.request, outsider)).toBe(0);
    expect(
      await createPropertyPackageStore(
        await principalForSession(outsider, environment),
        environment,
      ).read(data.request.campaignVersionRef),
    ).toBeUndefined();
  });

  it("lets a workspace viewer review but not generate files", async () => {
    const data = await prepare();
    expect((await generate(data.request, viewer)).status).toBe(403);
    expect(await packageCount(data.request)).toBe(0);
    expect((await generate(data.request)).status).toBe(200);
    expect((await output(data.request, "page", viewer)).status).toBe(200);
  });

  it("refuses a viewer's direct database insert independently of the route permission check", async () => {
    const data = await prepare();
    const viewerPrincipal = await principalForSession(viewer, environment);
    const bundle = await renderPropertyCampaignPackage(
      data.record.version,
      environment.OALO_APP_URL,
      viewerPrincipal.actorRef,
      new Date().toISOString(),
    );
    const authority = createPrincipalBoundTenantContextAuthority(
      viewerPrincipal,
      "correlation_packageViewerInsert001",
    );
    const insert = defineSqlContract({
      name: "test.property-package.viewer-insert",
      access: "write",
      text: `insert into campaign.property_campaign_packages
        (location_id,campaign_version_ref,campaign_ref,source_manifest_hash,template_version,generated_by_actor_id,package)
        values (platform.current_location_id(),$1,$2,$3,$4,platform.current_actor_id(),$5::text::jsonb) returning package`,
      decode: () => true,
    });
    await expect(
      withTenantTransaction(pool, authority, (tx) =>
        tx.write(insert, [
          bundle.campaignVersionRef,
          bundle.campaignRef,
          bundle.sourceManifestHash,
          bundle.templateVersion,
          JSON.stringify(bundle),
        ]),
      ),
    ).rejects.toThrow(/row.level security/iu);
    expect(await packageCount(data.request)).toBe(0);
  });

  it("rejects stale hashes, copied authority, and bad CSRF before saving output", async () => {
    const data = await prepare();
    expect((await generate({ ...data.request, sourceManifestHash: "b".repeat(64) })).status).toBe(
      409,
    );
    expect((await generate(data.request, owner, { locationRef: "location_other001" })).status).toBe(
      400,
    );
    const bad = await packagePost(
      browserRequest({
        path: "/api/campaigns/property/package",
        body: data.request,
        session: owner,
        csrfServerSecret: csrf,
        overrides: { csrfToken: "invalid" },
      }),
    );
    expect(bad.status).toBe(401);
    expect(await packageCount(data.request)).toBe(0);
  });

  it("rejects an unknown partner and an actor without a saved brand in preparation", async () => {
    expect(
      (
        await preparePost(
          mutation(owner, "/api/campaigns/property", propertyInput({ partnerId: randomUUID() })),
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await preparePost(
          mutation(unbranded, "/api/campaigns/property", propertyInput({ partnerId })),
        )
      ).status,
    ).toBe(400);
  });

  it("preserves one preparation version for concurrent identical saves", async () => {
    const input = propertyInput({ partnerId });
    const responses = await Promise.all([
      preparePost(mutation(owner, "/api/campaigns/property", input)),
      preparePost(mutation(owner, "/api/campaigns/property", input)),
    ]);
    expect(responses.map((response) => response.status)).toEqual([200, 200]);
    const bodies = await Promise.all(responses.map((response) => response.json()));
    expect(bodies[0]).toEqual(bodies[1]);
    const saved = PropertyCampaignSavedSchema.parse(bodies[0]);
    const repository = createCampaignPersistenceAdapter(
      await principalForSession(owner, environment),
      environment,
    ).readRepository;
    expect(await repository.listVersionsOf(saved.campaignRef)).toHaveLength(1);
  });

  it("refuses concurrent reuse of a preparation key for different property details", async () => {
    const input = propertyInput({ partnerId });
    const responses = await Promise.all([
      preparePost(mutation(owner, "/api/campaigns/property", input)),
      preparePost(
        mutation(owner, "/api/campaigns/property", { ...input, address: "A different property" }),
      ),
    ]);
    expect(responses.map((response) => response.status).sort()).toEqual([200, 409]);
  });

  it("grants no UPDATE or DELETE access to stored draft packages", async () => {
    const data = await prepare();
    expect((await generate(data.request)).status).toBe(200);
    const authority = createPrincipalBoundTenantContextAuthority(
      data.principal,
      "correlation_packageMutation001",
    );
    for (const text of [
      "update campaign.property_campaign_packages set package=package where campaign_version_ref=$1 returning campaign_version_ref",
      "delete from campaign.property_campaign_packages where campaign_version_ref=$1 returning campaign_version_ref",
    ]) {
      const contract = defineSqlContract({
        name: "test.property-package.refused-mutation",
        access: "write",
        text,
        decode: () => true,
      });
      await expect(
        withTenantTransaction(pool, authority, (tx) =>
          tx.write(contract, [data.request.campaignVersionRef]),
        ),
      ).rejects.toThrow();
    }
    expect(await packageCount(data.request)).toBe(1);
  });
});
