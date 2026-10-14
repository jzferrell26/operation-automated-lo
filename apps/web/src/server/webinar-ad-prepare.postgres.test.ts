import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";
import { POST as preparePost } from "../app/api/campaigns/webinar-ads/route.js";
import { POST as approvePost } from "../app/api/campaigns/approve/route.js";
import { GET as reviewGet } from "../app/api/campaigns/webinar-ads/[campaignRef]/[campaignVersionRef]/route.js";
import { GET as artGet } from "../app/api/campaigns/webinar-ads/[campaignRef]/[campaignVersionRef]/[shape]/route.js";
import { GET as contextGet } from "../app/api/campaigns/webinar-ads/context/route.js";
import { WEBINAR_ADS } from "../features/webinar-ads/catalog.js";
import { FUNNELS } from "../features/funnels/catalog.js";
import { salesDefaults } from "../features/funnels/sales-content.js";
import { publicationStore } from "./funnel-public-store.js";
import { createCampaignPersistenceAdapter } from "./campaign-persistence-runtime.js";
import { handleWebinarAdPrepare } from "./webinar-ad-http.js";
import { resolveRuntimeCampaignCommandPorts } from "./runtime-authentication.js";
import {
  approvalPayload,
  browserRequest,
  closeApprovalSuite,
  issueSession,
  openApprovalSuite,
  principalForSession,
  routeEnvironment,
  saveTestBrandFor,
  seedActor,
  seedLocation,
  type ApprovalSuiteFixture,
  type IssuedSession,
} from "./campaign-route-postgres-support.js";

const environment = routeEnvironment({
  OALO_FUNNEL_PUBLICATION: "enabled",
  OALO_FUNNEL_DATA_KEY: Buffer.alloc(32, 8).toString("base64url"),
});
const SavedSchema = z.object({
  campaignRef: z.string(),
  campaignVersionRef: z.string(),
  manifestHash: z.string(),
  preflightResultHash: z.string(),
  rowVersion: z.number(),
  duplicate: z.boolean(),
  providerEnabled: z.literal(false),
  effectiveEndsAt: z.string(),
});
let suite: ApprovalSuiteFixture, foreign: IssuedSession;
beforeAll(async () => {
  suite = await openApprovalSuite(environment, "Webinar producer real route");
  const other = await seedLocation(suite.pool, "Webinar producer foreign account");
  foreign = await issueSession(
    suite.pool,
    other,
    await seedActor(suite.pool, other, {
      displayName: "Other Loan Officer",
      bindingRole: "creator",
      sessionRole: "campaign_creator",
    }),
  );
  await saveTestBrandFor(foreign, environment);
});
afterAll(async () => {
  if (suite) await closeApprovalSuite(suite);
});
async function publication() {
  const principal = await principalForSession(suite.creatorSession, environment);
  return publicationStore(principal, environment).publish(
    {
      kind: "live-webinar",
      fields: {
        ...FUNNELS.find((item) => item.kind === "live-webinar")!.defaults,
        eventStartsAt: new Date(Date.now() + 7 * 86400000).toISOString(),
        webinarUrl: "https://example.org/private-webinar-join",
        sales: { ...salesDefaults("live-webinar"), privacyUrl: "https://example.org/privacy" },
      },
      brand: {
        name: "Casey Rivera",
        company: "Evergreen Example Lending",
        nmls: "123456",
        companyNmls: "234567",
        colorPresetId: "navy",
        disclosure: "Equal Housing Opportunity",
      },
    },
    randomUUID(),
  );
}
function body(publicationId: string) {
  return {
    requestId: randomUUID(),
    templateId: WEBINAR_ADS[0]!.id,
    templateVersion: 1,
    publicationId,
    headline: WEBINAR_ADS[0]!.headline,
    primaryText: WEBINAR_ADS[0]!.primaryText,
    endsOn: new Date(Date.now() + 20 * 86400000).toISOString().slice(0, 10),
    dailyBudgetDollars: 10,
    totalBudgetDollars: 100,
    places: ["TX"],
  };
}
function prepare(session: IssuedSession, value: unknown) {
  return preparePost(
    browserRequest({
      path: "/api/campaigns/webinar-ads",
      body: value,
      session,
      csrfServerSecret: suite.csrfServerSecret,
    }),
  );
}
function readRequest(session: IssuedSession) {
  const req = browserRequest({
    path: "/api/campaigns/webinar-ads/context",
    body: {},
    session,
    csrfServerSecret: suite.csrfServerSecret,
  });
  return new Request(req.url, { headers: req.headers });
}
describe("webinar producer, evidence and review through exported HTTP routes and real PostgreSQL", () => {
  it("saves, returns original exact retry, shows own choices and real title, exports PNGs and records a distinct authorized human", async () => {
    const published = await publication(),
      input = body(published.id);
    const response = await prepare(suite.creatorSession, input);
    expect(response.status).toBe(201);
    const saved = SavedSchema.parse(await response.json());
    expect(saved.effectiveEndsAt).toBe(published.snapshot.fields.eventStartsAt);
    const replay = await prepare(suite.creatorSession, input);
    expect(replay.status).toBe(200);
    expect(SavedSchema.parse(await replay.json())).toEqual({ ...saved, duplicate: true });
    const context = await contextGet(readRequest(suite.creatorSession));
    expect(context.status).toBe(200);
    const choices = z
      .object({
        destinations: z.array(
          z.object({ destination: z.object({ publicationId: z.string() }), title: z.string() }),
        ),
      })
      .parse(await context.json());
    expect(
      choices.destinations.some((choice) => choice.destination.publicationId === published.id),
    ).toBe(true);
    const params = { campaignRef: saved.campaignRef, campaignVersionRef: saved.campaignVersionRef };
    const review = await reviewGet(readRequest(suite.approverSession), {
      params: Promise.resolve(params),
    });
    expect(review.status).toBe(200);
    expect(await review.json()).toMatchObject({
      current: { available: true },
      publication: { title: published.snapshot.fields.headline },
      providerEnabled: false,
    });
    const art = await artGet(readRequest(suite.approverSession), {
      params: Promise.resolve({ ...params, shape: "tall" }),
    });
    expect(art.status).toBe(200);
    expect(art.headers.get("content-type")).toBe("image/png");
    const approval = await approvePost(
      browserRequest({
        path: "/api/campaigns/approve",
        body: approvalPayload(saved),
        session: suite.approverSession,
        csrfServerSecret: suite.csrfServerSecret,
      }),
    );
    expect(approval.status).toBe(200);
    const record = await createCampaignPersistenceAdapter(
      await principalForSession(suite.approverSession, environment),
      environment,
    ).readRepository.getByCampaignRef(saved.campaignRef);
    expect(record?.approval?.actorRef).toBe(
      (await principalForSession(suite.approverSession, environment)).actorRef,
    );
    expect(record?.version.manifest.blueprintId).toBe("webinar-ad");
  });
  it("refuses foreign publication and browser authority overrides with no saved campaign", async () => {
    const published = await publication();
    expect((await prepare(foreign, body(published.id))).status).toBe(404);
    expect(
      (
        await prepare(suite.creatorSession, {
          ...body(published.id),
          destinationUrl: "https://hostile.example",
        })
      ).status,
    ).toBe(400);
    const principal = await principalForSession(foreign, environment);
    expect(
      await createCampaignPersistenceAdapter(
        principal,
        environment,
      ).readRepository.listForLocation(),
    ).toEqual([]);
  });
  it("converges concurrent identical requests and rejects mismatched retries and stale edits", async () => {
    const published = await publication(),
      input = body(published.id);
    const [one, two] = await Promise.all([
      prepare(suite.creatorSession, input),
      prepare(suite.creatorSession, input),
    ]);
    expect([one.status, two.status].sort()).toEqual([200, 201]);
    const saved = SavedSchema.parse(await one.json());
    expect(SavedSchema.parse(await two.json()).campaignVersionRef).toBe(saved.campaignVersionRef);
    expect(
      (await prepare(suite.creatorSession, { ...input, headline: "Changed educational copy" }))
        .status,
    ).toBe(409);
    const edit = {
      ...input,
      requestId: randomUUID(),
      campaignRef: saved.campaignRef,
      expectedCampaignVersionRef: saved.campaignVersionRef,
    };
    expect((await prepare(suite.creatorSession, edit)).status).toBe(201);
    expect((await prepare(suite.creatorSession, { ...edit, requestId: randomUUID() })).status).toBe(
      409,
    );
    const principal = await principalForSession(suite.creatorSession, environment);
    expect(
      await createCampaignPersistenceAdapter(principal, environment).readRepository.listVersionsOf(
        saved.campaignRef,
      ),
    ).toHaveLength(2);
  });
  it("checks withdrawal before a committed approval retry while historic title and exact art stay readable", async () => {
    const published = await publication();
    const saved = SavedSchema.parse(
      await (await prepare(suite.creatorSession, body(published.id))).json(),
    );
    const payload = approvalPayload(saved);
    const approve = () =>
      approvePost(
        browserRequest({
          path: "/api/campaigns/approve",
          body: payload,
          session: suite.approverSession,
          csrfServerSecret: suite.csrfServerSecret,
        }),
      );
    expect((await approve()).status).toBe(200);
    await publicationStore(
      await principalForSession(suite.creatorSession, environment),
      environment,
    ).revoke(published.id);
    expect((await approve()).status).toBe(409);
    const params = { campaignRef: saved.campaignRef, campaignVersionRef: saved.campaignVersionRef };
    const review = await reviewGet(readRequest(suite.approverSession), {
      params: Promise.resolve(params),
    });
    expect(review.status).toBe(200);
    expect(await review.json()).toMatchObject({
      current: { available: false },
      publication: { title: published.snapshot.fields.headline },
    });
    expect(
      (
        await artGet(readRequest(suite.approverSession), {
          params: Promise.resolve({ ...params, shape: "square" }),
        })
      ).status,
    ).toBe(200);
    expect(
      (await reviewGet(readRequest(foreign), { params: Promise.resolve(params) })).status,
    ).toBe(404);
  });
  it("records no ready or approval evidence after a failed preflight transaction and recovers the same immutable version", async () => {
    const published = await publication(),
      input = body(published.id),
      principal = await principalForSession(suite.creatorSession, environment);
    const adapter = createCampaignPersistenceAdapter(principal, environment);
    const failed = await handleWebinarAdPrepare(
      browserRequest({
        path: "/api/campaigns/webinar-ads",
        body: input,
        session: suite.creatorSession,
        csrfServerSecret: suite.csrfServerSecret,
      }),
      environment,
      resolveRuntimeCampaignCommandPorts(environment),
      {
        adapter: () => ({
          ...adapter,
          persistDraft: async () => {
            throw new Error("simulated transaction interruption");
          },
        }),
      },
    );
    expect(failed.status).toBe(503);
    const incomplete = z
      .object({
        campaignRef: z.string(),
        campaignVersionRef: z.string(),
        incompleteSave: z.literal(true),
      })
      .parse(await failed.json());
    expect(await adapter.readRepository.getByCampaignRef(incomplete.campaignRef)).toBeUndefined();
    const review = await reviewGet(readRequest(suite.creatorSession), {
      params: Promise.resolve({
        campaignRef: incomplete.campaignRef,
        campaignVersionRef: incomplete.campaignVersionRef,
      }),
    });
    expect(review.status).toBe(200);
    expect(await review.json()).toMatchObject({
      incompleteSave: true,
      current: { available: false, error: "WEBINAR_SAVE_INCOMPLETE" },
    });
    const forbidden = await approvePost(
      browserRequest({
        path: "/api/campaigns/approve",
        body: {
          campaignRef: incomplete.campaignRef,
          decision: "approved",
          expectedCampaignVersionRef: incomplete.campaignVersionRef,
          expectedManifestHash: "a".repeat(64),
          expectedPreflightResultHash: "b".repeat(64),
          expectedRowVersion: 1,
        },
        session: suite.approverSession,
        csrfServerSecret: suite.csrfServerSecret,
      }),
    );
    expect(forbidden.status).toBe(404);
    const recovered = await prepare(suite.creatorSession, input);
    expect(recovered.status).toBe(200);
    expect(SavedSchema.parse(await recovered.json()).campaignVersionRef).toBe(
      incomplete.campaignVersionRef,
    );
    expect(await adapter.readRepository.listVersionsOf(incomplete.campaignRef)).toHaveLength(1);
  });
});
