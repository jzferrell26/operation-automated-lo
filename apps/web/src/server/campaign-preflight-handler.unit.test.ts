import { afterEach, describe, expect, it } from "vitest";

import {
  createDefaultCampaignCommandPorts,
  createLocalSyntheticPrincipal,
} from "./authenticated-principal.js";
import {
  LOCAL_SYNTHETIC_ENV,
  OPEN_HOUSE_DRAFT_INPUT,
  createTemporaryCampaignStore,
} from "./campaign-command-test-support.js";
import { handleCampaignPreflight } from "./campaign-preflight-handler.js";

const store = createTemporaryCampaignStore("oalo-preflight-");

afterEach(async () => {
  await store.restore();
});

function post(body: unknown, headers: HeadersInit = {}): Request {
  return new Request("https://app.operation-automated-lo.test/api/campaigns/preflight", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

describe("campaign preflight handler", () => {
  it("freezes a local synthetic draft from the verified principal", async () => {
    await store.enter();
    const response = await handleCampaignPreflight(
      post(OPEN_HOUSE_DRAFT_INPUT),
      store.env(),
      createDefaultCampaignCommandPorts(),
    );
    expect(response.status).toBe(200);
    const payload = (await response.json()) as {
      version: { locationRef: string; createdBy: string };
      state: string;
    };
    const principal = createLocalSyntheticPrincipal();
    expect(payload.version.locationRef).toBe(principal.locationRef);
    expect(payload.version.createdBy).toBe(principal.actorRef);
    expect(payload.state).toBe("awaiting_approval");
  });

  it("returns 400 when the body tries to supply a tenant field", async () => {
    await store.enter();
    const response = await handleCampaignPreflight(
      post({ ...OPEN_HOUSE_DRAFT_INPUT, locationRef: "location_otherTenant001" }),
      store.env(),
      createDefaultCampaignCommandPorts(),
    );
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: "INVALID_CAMPAIGN_DRAFT" });
  });

  it("returns 401 when review mode has no verified session", async () => {
    const response = await handleCampaignPreflight(
      post(OPEN_HOUSE_DRAFT_INPUT),
      {
        ...LOCAL_SYNTHETIC_ENV,
        OALO_ENVIRONMENT: "production",
        OALO_REVIEW_SURFACE: "authorized",
      },
      createDefaultCampaignCommandPorts(),
    );
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "UNAUTHENTICATED" });
  });

  it("returns 403 when staging cannot use local synthetic identity", async () => {
    const response = await handleCampaignPreflight(
      post(OPEN_HOUSE_DRAFT_INPUT),
      {
        OALO_ENVIRONMENT: "staging",
        OALO_PROVIDER_MODE: "stub",
        OALO_SYNTHETIC_DATA_ONLY: "true",
      },
      createDefaultCampaignCommandPorts(),
    );
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "WORKSPACE_UNAVAILABLE" });
  });

  it("returns 401 when cookie and bearer are both present", async () => {
    const response = await handleCampaignPreflight(
      post(OPEN_HOUSE_DRAFT_INPUT, {
        authorization: "Bearer aaa.bbb.ccc",
        cookie: "__Host-oalo_session=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      }),
      LOCAL_SYNTHETIC_ENV,
      createDefaultCampaignCommandPorts(),
    );
    expect(response.status).toBe(401);
  });
});
