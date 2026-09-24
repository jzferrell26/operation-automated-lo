import { randomUUID } from "node:crypto";
import { beforeAll, afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import type { SqlScalar } from "@oalo/db";
import { GET, POST } from "../app/api/workspace/preferences/route.js";
import {
  WorkspacePreferencesSchema,
  emptyWorkspacePreferences,
  type WorkspacePreferences,
} from "../features/workspace/model.js";
import { loadWorkspacePageData } from "./workspace-page-data.js";
import { readWorkspacePreferences, saveWorkspacePreference } from "./workspace-preferences.js";
import {
  applyRouteEnvironment,
  browserRequest,
  createRouteTestPool,
  csrfSecretFor,
  issueSession,
  principalForSession,
  revokeSession,
  routeEnvironment,
  seedActor,
  seedLocation,
  REVIEW_HOST,
  REVIEW_ORIGIN,
  type IssuedSession,
  type BrowserRequestOverrides,
} from "./campaign-route-postgres-support.js";
import { resetCampaignDatabasePoolForTests } from "./campaign-persistence-runtime.js";

const environment = routeEnvironment({
  OALO_HOMEOWNER_REPORTS: "enabled",
  OALO_HOMEOWNER_LIVE_DATA: "disabled",
  OALO_HOMEOWNER_GHL_CONNECTIONS_JSON: "",
  OALO_HOMEOWNER_ALLOWED_LOCATION_IDS: "",
});
const pool = createRouteTestPool();
const path = "/api/workspace/preferences";
let owner: IssuedSession, teammate: IssuedSession, outsider: IssuedSession, viewer: IssuedSession;
let restore: () => void;
let csrf: Uint8Array;
const Brand = {
  name: "Workspace Test Officer",
  company: "Workspace Test Lending",
  email: "officer@example.test",
  phone: "555-0100",
  nmls: "123456",
  companyNmls: "234567",
  tagline: "Your next property conversation.",
};
const envelope = z.object({ preferences: WorkspacePreferencesSchema });
const read = (session: IssuedSession) =>
  new Request(`${REVIEW_ORIGIN}${path}`, {
    headers: { cookie: session.cookieHeader, host: REVIEW_HOST },
  });
const write = (body: unknown, session = owner, overrides: BrowserRequestOverrides = {}) =>
  browserRequest({ path, body, session, csrfServerSecret: csrf, overrides });
const prefs = async (session = owner): Promise<WorkspacePreferences> =>
  envelope.parse(await (await GET(read(session))).json()).preferences;
async function fixtureQuery(text: string, values: readonly SqlScalar[] = []) {
  const connection = await pool.connect();
  const execute = (sql: string, args: readonly SqlScalar[] = []) =>
    connection.execute({
      statementName: "workspace.fixture",
      text: sql,
      values: args,
      preparedStatementMode: "unnamed",
    });
  try {
    await execute("begin");
    await execute("set local role migration_owner");
    const result = await execute(text, values);
    await execute("commit");
    return result.rows;
  } catch (error) {
    await execute("rollback");
    throw error;
  } finally {
    await connection.release();
  }
}
beforeAll(async () => {
  restore = applyRouteEnvironment(environment);
  csrf = csrfSecretFor(environment);
  const location = await seedLocation(pool, "Personal workspace settings test");
  const other = await seedLocation(pool, "Isolated settings workspace test");
  owner = await issueSession(
    pool,
    location,
    await seedActor(pool, location, {
      displayName: "Settings owner",
      bindingRole: "location_admin",
      sessionRole: "location_admin",
    }),
  );
  teammate = await issueSession(
    pool,
    location,
    await seedActor(pool, location, {
      displayName: "Settings teammate",
      bindingRole: "creator",
      sessionRole: "campaign_creator",
    }),
  );
  viewer = await issueSession(
    pool,
    location,
    await seedActor(pool, location, {
      displayName: "Settings viewer",
      bindingRole: "analyst",
      sessionRole: "viewer",
    }),
  );
  outsider = await issueSession(
    pool,
    other,
    await seedActor(pool, other, {
      displayName: "Settings outsider",
      bindingRole: "location_admin",
      sessionRole: "location_admin",
    }),
  );
});
afterEach(() => vi.restoreAllMocks());
afterAll(async () => {
  await resetCampaignDatabasePoolForTests();
  await pool.close();
  restore();
});

describe.sequential("authenticated personal workspace preferences", () => {
  it("requires session, origin and CSRF and refuses role or key injection before writing", async () => {
    const command = { key: "brand", expectedRevision: null, value: Brand };
    expect((await GET(new Request(`${REVIEW_ORIGIN}${path}`))).status).toBe(401);
    expect((await POST(write(command, owner, { csrfToken: null }))).status).toBe(401);
    expect(
      (await POST(write(command, owner, { origin: "https://outsider.example.test" }))).status,
    ).toBe(401);
    expect((await POST(write(command, viewer))).status).toBe(403);
    for (const body of [
      { ...command, userId: randomUUID() },
      { ...command, locationId: randomUUID() },
      { ...command, key: "setup_profile.v1" },
      { ...command, key: "__proto__" },
    ])
      expect((await POST(write(body))).status).toBe(400);
    expect(await prefs()).toEqual(emptyWorkspacePreferences());
  });
  it("saves real branding, replays an exact retry, and never exposes it to another user or tenant", async () => {
    const fetcher = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("No provider request is permitted"));
    const command = { key: "brand", expectedRevision: null, value: Brand };
    const response = await POST(write(command));
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    const first = envelope.parse(await response.json()).preferences;
    expect(first.brand?.value).toEqual(Brand);
    const replay = await POST(write(command));
    expect(replay.status).toBe(200);
    expect(envelope.parse(await replay.json()).preferences.brand?.revision).toBe(
      first.brand?.revision,
    );
    expect((await prefs()).brand).toEqual(first.brand);
    for (const session of [teammate, outsider, viewer])
      expect(await prefs(session)).toEqual(emptyWorkspacePreferences());
    const stolenRevision = await POST(
      write(
        {
          key: "brand",
          expectedRevision: first.brand?.revision,
          value: { ...Brand, name: "Unrelated edit" },
        },
        teammate,
      ),
    );
    expect(stolenRevision.status).toBe(409);
    expect(
      (
        await POST(
          write(
            {
              key: "brand",
              expectedRevision: null,
              value: { ...Brand, name: "Teammate identity" },
            },
            teammate,
          ),
        )
      ).status,
    ).toBe(200);
    expect((await prefs()).brand?.value.name).toBe(Brand.name);
    expect((await prefs(teammate)).brand?.value.name).toBe("Teammate identity");
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("serializes competing edits and preserves the winning revision", async () => {
    const before = await prefs();
    const results = await Promise.all(
      ["First edit", "Second edit"].map((tagline) =>
        POST(
          write({
            key: "brand",
            expectedRevision: before.brand?.revision,
            value: { ...Brand, tagline },
          }),
        ),
      ),
    );
    expect(results.map((result) => result.status).sort()).toEqual([200, 409]);
    const accepted = results.find((response) => response.status === 200)!;
    const winning = envelope.parse(await accepted.json()).preferences;
    expect((await prefs()).brand).toEqual(winning.brand);
    expect(
      (
        await POST(
          write({
            key: "brand",
            expectedRevision: before.brand?.revision,
            value: { ...Brand, tagline: "stale edit" },
          }),
        )
      ).status,
    ).toBe(409);
    expect((await prefs()).brand).toEqual(winning.brand);
  });
  it("keeps message channels and partner edits independent, and removes only the requested partner", async () => {
    const first = {
      id: randomUUID(),
      name: "Partner One",
      company: "First Realty",
      email: "one@example.test",
      phone: "",
    };
    const second = {
      id: randomUUID(),
      name: "Partner Two",
      company: "Second Realty",
      email: "two@example.test",
      phone: "",
    };
    expect(
      (
        await POST(
          write({ key: "partners", expectedRevision: null, value: { items: [first, second] } }),
        )
      ).status,
    ).toBe(200);
    for (const key of ["invitation_email", "invitation_sms"]) {
      expect(
        (
          await POST(
            write({
              key,
              expectedRevision: null,
              value: {
                subject: key.endsWith("email") ? "Invitation" : "",
                body: `Saved ${key} wording`,
              },
            }),
          )
        ).status,
      ).toBe(200);
    }
    const saved = await prefs();
    expect(saved.messages.invitation_email?.value.body).toBe("Saved invitation_email wording");
    expect(saved.messages.invitation_sms?.value.body).toBe("Saved invitation_sms wording");
    expect(
      (
        await POST(
          write({
            key: "partners",
            expectedRevision: saved.partners?.revision,
            value: { items: [{ ...second, company: "Updated Realty" }] },
          }),
        )
      ).status,
    ).toBe(200);
    const after = await prefs();
    expect(after.partners?.value.items).toEqual([{ ...second, company: "Updated Realty" }]);
    expect(after.messages).toEqual(saved.messages);
    expect((await prefs(teammate)).partners).toBeNull();
    expect((await prefs(outsider)).messages).toEqual({});
  });
  it("rejects oversized, malformed and contradictory settings without replacing the saved record", async () => {
    const before = await prefs();
    const long = {
      id: randomUUID(),
      name: "長".repeat(120),
      company: "社".repeat(160),
      email: "",
      phone: "",
    };
    const huge = { items: Array.from({ length: 25 }, () => ({ ...long, id: randomUUID() })) };
    expect(
      (
        await POST(
          write({ key: "partners", expectedRevision: before.partners?.revision, value: huge }),
        )
      ).status,
    ).toBe(413);
    expect(
      (
        await POST(
          write({
            key: "partners",
            expectedRevision: before.partners?.revision,
            value: { items: [long, long] },
          }),
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await POST(
          write({
            key: "invitation_email",
            expectedRevision: null,
            value: { subject: "", body: "x".repeat(40001) },
          }),
        )
      ).status,
    ).toBe(413);
    expect(await prefs()).toEqual(before);
  });
  it("loads actual page data and personal report defaults without calling a provider", async () => {
    const fetcher = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("No external read is permitted"));
    const profile = await loadWorkspacePageData(read(owner), "profile", environment);
    expect(profile.defaultBrand).toEqual((await prefs()).brand?.value);
    expect(profile.identity.name).toBe("Settings owner");
    const marketing = await loadWorkspacePageData(read(owner), "marketing", environment);
    expect(marketing.campaigns).toEqual([]);
    expect(marketing.properties).toEqual([]);
    expect(marketing.valuationConfigured).toBe(false);
    const unrelated = await loadWorkspacePageData(read(teammate), "profile", environment);
    expect(unrelated.defaultBrand.name).toBe("Teammate identity");
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("refuses support access even before taking a database connection", async () => {
    const principal = await principalForSession(owner, environment);
    const deniedPool = { connect: vi.fn().mockRejectedValue(new Error("Should not connect")) };
    const support = { ...principal, role: "platform_support" as const };
    await expect(readWorkspacePreferences(support, deniedPool)).rejects.toMatchObject({
      code: "WORKSPACE_ACCESS_DENIED",
    });
    await expect(
      saveWorkspacePreference(
        support,
        { key: "brand", expectedRevision: null, value: Brand },
        deniedPool,
      ),
    ).rejects.toMatchObject({ code: "WORKSPACE_ACCESS_DENIED" });
    expect(deniedPool.connect).not.toHaveBeenCalled();
  });
  it("does not erase a malformed saved record while reporting that it cannot be opened", async () => {
    const principal = await principalForSession(teammate, environment);
    const saved = (await prefs(teammate)).brand;
    const corrupt = { revision: "invalid", value: { privateField: "fixture-only" } };
    const update =
      "update platform.user_preferences set value=$3::text::jsonb where location_id=$1::uuid and user_id=$2::uuid and key='workspace.brand.v1'";
    await fixtureQuery(update, [principal.locationId, principal.actorId, JSON.stringify(corrupt)]);
    try {
      const response = await GET(read(teammate));
      expect(response.status).toBe(503);
      expect(await response.json()).toMatchObject({ error: "WORKSPACE_PREFERENCES_UNAVAILABLE" });
      const refused = await POST(
        write({ key: "brand", expectedRevision: saved?.revision, value: Brand }, teammate),
      );
      expect(refused.status).toBe(503);
      const rows = await fixtureQuery(
        "select value from platform.user_preferences where location_id=$1::uuid and user_id=$2::uuid and key='workspace.brand.v1'",
        [principal.locationId, principal.actorId],
      );
      expect(z.object({ value: z.unknown() }).parse(rows[0]).value).toEqual(corrupt);
    } finally {
      await fixtureQuery(update, [principal.locationId, principal.actorId, JSON.stringify(saved)]);
    }
  });
  it("refuses revoked sessions", async () => {
    await revokeSession(pool, outsider);
    expect((await GET(read(outsider))).status).toBe(401);
  });
});
