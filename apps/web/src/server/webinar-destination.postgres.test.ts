import { randomUUID } from "node:crypto";
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import type { AuthenticatedPrincipal } from "@oalo/application";
import type { SqlScalar } from "@oalo/db";
import { withMigrationOwnerTransaction } from "../../../../packages/db/test/route-seeding-bridge.js";
import { FUNNELS } from "../features/funnels/catalog.js";
import { salesDefaults } from "../features/funnels/sales-content.js";
import { publicationStore } from "./funnel-public-store.js";
import { resetCampaignDatabasePoolForTests } from "./campaign-persistence-runtime.js";
import {
  applyRouteEnvironment,
  createRouteTestPool,
  issueSession,
  principalForSession,
  revokeSession,
  seedActor,
  seedLocation,
  routeEnvironment,
  type IssuedSession,
} from "./campaign-route-postgres-support.js";
import {
  listOwnWebinarChoices,
  resolveOwnWebinarDestination,
  resolveCampaignWebinarChoice,
  readCampaignWebinarLabels,
} from "./webinar-destination.js";

const environment = routeEnvironment({
  OALO_FUNNEL_PUBLICATION: "enabled",
  OALO_FUNNEL_DATA_KEY: Buffer.alloc(32, 3).toString("base64url"),
});
const pool = createRouteTestPool();
let restore: () => void,
  creator: Readonly<AuthenticatedPrincipal>,
  reviewer: Readonly<AuthenticatedPrincipal>,
  outsider: Readonly<AuthenticatedPrincipal>,
  reviewerSession: IssuedSession;
let publicationId: string,
  ownCampaignRef: string,
  ownVersionRef: string,
  mismatchVersionRef: string;
async function ownerQuery(text: string, values: readonly SqlScalar[] = []) {
  return withMigrationOwnerTransaction(pool, (connection) =>
    connection.execute({
      statementName: "test.webinar-destination.seed",
      text,
      values,
      preparedStatementMode: "unnamed",
    }),
  );
}
beforeAll(async () => {
  restore = applyRouteEnvironment(environment);
  const tenant = await seedLocation(pool, "Webinar destination native authority"),
    foreign = await seedLocation(pool, "Webinar other workspace");
  const creatorSession = await issueSession(
    pool,
    tenant,
    await seedActor(pool, tenant, {
      displayName: "Creator Example",
      bindingRole: "creator",
      sessionRole: "campaign_creator",
    }),
  );
  reviewerSession = await issueSession(
    pool,
    tenant,
    await seedActor(pool, tenant, {
      displayName: "Reviewer Example",
      bindingRole: "approver",
      sessionRole: "campaign_approver",
    }),
  );
  const foreignSession = await issueSession(
    pool,
    foreign,
    await seedActor(pool, foreign, {
      displayName: "Foreign Example",
      bindingRole: "creator",
      sessionRole: "campaign_creator",
    }),
  );
  creator = await principalForSession(creatorSession, environment);
  reviewer = await principalForSession(reviewerSession, environment);
  outsider = await principalForSession(foreignSession, environment);
  const defaults = FUNNELS.find((funnel) => funnel.kind === "live-webinar")!.defaults;
  const published = await publicationStore(creator, environment).publish(
    {
      kind: "live-webinar",
      fields: {
        ...defaults,
        eventStartsAt: new Date(Date.now() + 7 * 86400000).toISOString(),
        webinarUrl: "https://example.org/private-join",
        sales: { ...salesDefaults("live-webinar"), privacyUrl: "https://example.org/privacy" },
      },
      brand: {
        name: "Creator Example",
        company: "Example Lending",
        nmls: "12345",
        companyNmls: "67890",
        colorPresetId: "navy",
        disclosure: "Equal Housing Opportunity",
      },
    },
    randomUUID(),
  );
  publicationId = published.id;
  const destination = await resolveOwnWebinarDestination(creator, publicationId, environment);
  const id = randomUUID();
  ownCampaignRef = `campaign_${id.replaceAll("-", "")}`;
  ownVersionRef = `version_${randomUUID().replaceAll("-", "")}`;
  mismatchVersionRef = `version_${randomUUID().replaceAll("-", "")}`;
  await ownerQuery(
    "insert into campaign.campaigns(id,location_id,campaign_ref,created_by_actor_id,status) values($1::uuid,$2::uuid,$3,$4::uuid,'draft')",
    [id, creator.locationId, ownCampaignRef, creator.actorId],
  );
  for (const [ref, number, publisherActorRef] of [
    [ownVersionRef, 1, creator.actorRef],
    [mismatchVersionRef, 2, reviewer.actorRef],
  ] as const) {
    await ownerQuery(
      "insert into campaign.campaign_versions(location_id,campaign_id,campaign_ref,campaign_version_ref,version_no,location_ref,input_versions,manifest,manifest_hash,created_by_actor_id,created_by_actor_ref) values($1::uuid,$2::uuid,$3,$4,$5,$6,'{}'::jsonb,$7::text::jsonb,$8,$9::uuid,$10)",
      [
        creator.locationId,
        id,
        ownCampaignRef,
        ref,
        number,
        creator.locationRef,
        JSON.stringify({
          blueprintId: "webinar-ad",
          destination: { ...destination, publisherActorRef },
        }),
        "a".repeat(64),
        creator.actorId,
        creator.actorRef,
      ],
    );
  }
});
afterAll(async () => {
  restore?.();
  await resetCampaignDatabasePoolForTests();
  await pool.close();
});
describe("actual database webinar publication ownership and first-party sessions", () => {
  it("resolves own publication and readable title, not gated URLs", async () => {
    const choices = await listOwnWebinarChoices(creator, environment);
    expect(choices).toHaveLength(1);
    expect(choices[0]?.destination.publicationId).toBe(publicationId);
    expect(choices[0]?.title).toBeTruthy();
    expect(JSON.stringify(choices)).not.toContain("private-join");
  });
  it("distinct tenant reviewer can resolve only an anchored immutable version", async () => {
    const choice = await resolveCampaignWebinarChoice(
      reviewer,
      ownCampaignRef,
      ownVersionRef,
      environment,
    );
    expect(choice.destination.publisherActorRef).toBe(creator.actorRef);
    expect(await listOwnWebinarChoices(reviewer, environment)).toEqual([]);
    await expect(
      resolveOwnWebinarDestination(reviewer, publicationId, environment),
    ).rejects.toThrow("DESTINATION_NOT_ACCESSIBLE");
    await expect(
      resolveCampaignWebinarChoice(reviewer, ownCampaignRef, mismatchVersionRef, environment),
    ).rejects.toThrow("DESTINATION_CHANGED");
  });
  it("refuses cross-tenant lookup and unknown version without granting enumeration", async () => {
    await expect(
      resolveOwnWebinarDestination(outsider, publicationId, environment),
    ).rejects.toThrow("DESTINATION_NOT_ACCESSIBLE");
    await expect(
      resolveCampaignWebinarChoice(outsider, ownCampaignRef, ownVersionRef, environment),
    ).rejects.toThrow("DESTINATION_CHANGED");
    await expect(
      resolveCampaignWebinarChoice(reviewer, ownCampaignRef, "version_missing01", environment),
    ).rejects.toThrow("DESTINATION_CHANGED");
  });
  it("rechecks exact session ownership, role version and synthetic refusal", async () => {
    await expect(
      resolveCampaignWebinarChoice(
        { ...reviewer, sessionId: creator.sessionId },
        ownCampaignRef,
        ownVersionRef,
        environment,
      ),
    ).rejects.toThrow("DESTINATION_CHANGED");
    await expect(
      resolveCampaignWebinarChoice(
        { ...reviewer, roleVersion: 1 },
        ownCampaignRef,
        ownVersionRef,
        environment,
      ),
    ).rejects.toThrow("DESTINATION_CHANGED");
    await expect(
      resolveOwnWebinarDestination(
        { ...creator, authenticationMode: "local_synthetic" },
        publicationId,
        environment,
      ),
    ).rejects.toThrow("DESTINATION_NOT_ACCESSIBLE");
  });
  it("refuses unavailable public capability even with a previously resolved principal", async () => {
    await publicationStore(creator, environment).revoke(publicationId);
    await expect(
      resolveCampaignWebinarChoice(reviewer, ownCampaignRef, ownVersionRef, environment),
    ).rejects.toThrow("DESTINATION_CHANGED");
    await expect(resolveOwnWebinarDestination(creator, publicationId, environment)).rejects.toThrow(
      "DESTINATION_NOT_ACCESSIBLE",
    );
    const labels = await readCampaignWebinarLabels(
      reviewer,
      ownCampaignRef,
      ownVersionRef,
      environment,
    );
    expect(Object.keys(labels).sort()).toEqual(["learningSummary", "snapshotHash", "title"]);
    expect(JSON.stringify(labels)).not.toContain("private-join");
    await expect(
      readCampaignWebinarLabels(outsider, ownCampaignRef, ownVersionRef, environment),
    ).rejects.toThrow("DESTINATION_NOT_ACCESSIBLE");
    await ownerQuery("update campaign.funnel_publications set active=true where id=$1::uuid", [
      publicationId,
    ]);
  });
  it("refuses an actual revoked first-party session rather than trusting stale principal", async () => {
    await revokeSession(pool, reviewerSession);
    await expect(
      readCampaignWebinarLabels(reviewer, ownCampaignRef, ownVersionRef, environment),
    ).rejects.toThrow("DESTINATION_NOT_ACCESSIBLE");
    await expect(
      resolveCampaignWebinarChoice(reviewer, ownCampaignRef, ownVersionRef, environment),
    ).rejects.toThrow("DESTINATION_CHANGED");
  });
});
