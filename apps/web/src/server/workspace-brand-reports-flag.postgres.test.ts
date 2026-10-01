import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { POST } from "../app/api/workspace/preferences/route.js";
import { resetCampaignDatabasePoolForTests } from "./campaign-persistence-runtime.js";
import {
  applyRouteEnvironment,
  browserRequest,
  createRouteTestPool,
  csrfSecretFor,
  issueSession,
  routeEnvironment,
  seedActor,
  seedLocation,
  REVIEW_HOST,
  REVIEW_ORIGIN,
  type IssuedSession,
} from "./campaign-route-postgres-support.js";
import { loadWorkspacePageData } from "./workspace-page-data.js";

/**
 * PRD-008b 008B-AC-007, the half that needs a database.
 *
 * `/brand` shows the signed-in person's own saved branding whether or not the homeowner reports
 * flag is on, so the read behind it and the save beside it have to work the same way in both
 * states. The page's data loader is what the page calls, and the preferences route is what the
 * editor posts to; both are driven here with the headers a browser sends. The second case in each
 * state is the other half of the security note: a session in another workspace reads nothing of
 * this one's branding, so dropping the flag from the page did not widen who can read what.
 */

const PATH = "/api/workspace/preferences";

const BRAND = {
  name: "Flag Test Officer",
  company: "Flag Test Lending",
  email: "officer@example.test",
  phone: "555-0100",
  nmls: "123456",
  companyNmls: "234567",
  tagline: "Saved without any reports flag.",
};

const readAs = (session: IssuedSession) =>
  new Request(`${REVIEW_ORIGIN}${PATH}`, {
    headers: { cookie: session.cookieHeader, host: REVIEW_HOST },
  });

/** An empty value is "unset" to the code under test, which only ever compares against "enabled". */
describe.each([
  ["set", "enabled"],
  ["unset", ""],
])("saved branding with OALO_HOMEOWNER_REPORTS %s", (_state, flag) => {
  const environment = routeEnvironment({
    OALO_HOMEOWNER_REPORTS: flag,
    OALO_HOMEOWNER_LIVE_DATA: "disabled",
    OALO_HOMEOWNER_GHL_CONNECTIONS_JSON: "",
    OALO_HOMEOWNER_ALLOWED_LOCATION_IDS: "",
  });
  const pool = createRouteTestPool();
  let owner: IssuedSession;
  let outsider: IssuedSession;
  let restore: () => void;
  let csrf: Uint8Array;

  beforeAll(async () => {
    restore = applyRouteEnvironment(environment);
    csrf = csrfSecretFor(environment);
    const location = await seedLocation(pool, `Brand flag ${flag || "unset"} location`);
    const other = await seedLocation(pool, `Brand flag ${flag || "unset"} other location`);
    owner = await issueSession(
      pool,
      location,
      await seedActor(pool, location, {
        displayName: "Brand flag owner",
        bindingRole: "location_admin",
        sessionRole: "location_admin",
      }),
    );
    outsider = await issueSession(
      pool,
      other,
      await seedActor(pool, other, {
        displayName: "Brand flag outsider",
        bindingRole: "location_admin",
        sessionRole: "location_admin",
      }),
    );
  });

  afterAll(async () => {
    await resetCampaignDatabasePoolForTests();
    await pool.close();
    restore();
  });

  it("persists a save and reads it back for the person who made it", async () => {
    const saved = await POST(
      browserRequest({
        path: PATH,
        body: { key: "brand", expectedRevision: null, value: BRAND },
        session: owner,
        csrfServerSecret: csrf,
      }),
    );
    expect(saved.status).toBe(200);

    const page = await loadWorkspacePageData(readAs(owner), "profile", environment);

    expect(page.preferences.brand?.value).toEqual(BRAND);
    expect(page.defaultBrand).toEqual(BRAND);
    expect(page.reportsEnabled).toBe(flag === "enabled");
  });

  it("shows another workspace nothing of it", async () => {
    const page = await loadWorkspacePageData(readAs(outsider), "profile", environment);

    expect(page.preferences.brand).toBeNull();
    expect(page.defaultBrand.company).not.toBe(BRAND.company);
  });
});
