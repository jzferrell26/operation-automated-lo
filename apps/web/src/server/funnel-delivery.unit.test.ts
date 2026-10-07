import { randomBytes, randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { tryFunnelDelivery } from "./funnel-public-delivery.js";
import { encryptVisitor, publicFunnelConfig } from "./funnel-public-store.js";
import { runFunnelRetention } from "./funnel-retention.js";
import type { FunnelVisitor } from "../features/funnels/visitor-model.js";

const mock = vi.hoisted(() => ({ capability: vi.fn(), connect: vi.fn() }));
vi.mock("./campaign-persistence-runtime.js", () => ({
  campaignDatabasePool: () => ({ connect: mock.connect }),
}));
vi.mock("./funnel-public-store.js", async () => {
  const original = await vi.importActual<typeof import("./funnel-public-store.js")>(
    "./funnel-public-store.js",
  );
  return { ...original, funnelCapability: mock.capability };
});

const id = randomUUID(),
  requestId = randomUUID(),
  location = randomUUID();
const base = {
  OALO_APP_URL: "https://example.org",
  OALO_FUNNEL_PUBLICATION: "enabled",
  OALO_FUNNEL_DATA_KEY: randomBytes(32).toString("base64url"),
};
const configured = {
  ...base,
  OALO_FUNNEL_GHL_DELIVERY: "enabled",
  OALO_FUNNEL_GHL_CONNECTIONS_JSON: JSON.stringify({
    [location]: { locationId: "exampleLocation123", accessToken: "synthetic-test-token-not-live" },
  }),
};
const visitor: FunnelVisitor = {
  requestId,
  firstName: "Example",
  email: "test@example.org",
  phone: "+15555550100",
  goal: "learn",
  consent: true,
  website: "",
};
beforeEach(() => {
  mock.capability.mockReset();
  mock.connect.mockReset();
  mock.capability
    .mockResolvedValueOnce({
      locationId: location,
      ghlLocationId: "exampleLocation123",
      cipher: encryptVisitor(publicFunnelConfig(base), id, visitor),
    })
    .mockResolvedValue(true);
});
afterEach(() => vi.restoreAllMocks());

describe("optional funnel CRM delivery", () => {
  it("performs no database claim or network operation without both explicit delivery inputs", async () => {
    const network = vi.fn<typeof fetch>();
    for (const env of [base, { ...base, OALO_FUNNEL_GHL_DELIVERY: "enabled" }]) {
      await tryFunnelDelivery(id, requestId, "receipt", env, network);
    }
    expect(mock.capability).not.toHaveBeenCalled();
    expect(network).not.toHaveBeenCalled();
  });
  it("does not deliver into a location that disagrees with the saved platform binding", async () => {
    mock.capability
      .mockReset()
      .mockResolvedValueOnce({
        locationId: location,
        ghlLocationId: "anotherLocation123",
        cipher: "unused",
      })
      .mockResolvedValue(true);
    const network = vi.fn<typeof fetch>();
    await tryFunnelDelivery(id, requestId, "receipt", configured, network);
    expect(network).not.toHaveBeenCalled();
    expect(mock.capability).toHaveBeenLastCalledWith(expect.anything(), "finish", [
      id,
      requestId,
      "receipt",
      "pending",
      null,
    ]);
  });
  it("uses the fixed v3 contact endpoint without changing DND, tags, phone or workflows", async () => {
    const network = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        contact: { id: "contact123", locationId: "exampleLocation123", email: visitor.email },
      }),
    );
    await tryFunnelDelivery(id, requestId, "receipt", configured, network);
    expect(network).toHaveBeenCalledTimes(1);
    const [url, request] = network.mock.calls[0]!;
    expect(url).toBe("https://services.leadconnectorhq.com/contacts/upsert");
    expect(request).toMatchObject({
      method: "POST",
      redirect: "error",
      cache: "no-store",
      headers: { Version: "v3" },
    });
    expect(JSON.parse(String(request?.body))).toEqual({
      locationId: "exampleLocation123",
      firstName: visitor.firstName,
      email: visitor.email,
      source: `AutomatedLO funnel ${id}`,
      createNewIfDuplicateAllowed: false,
    });
    expect(mock.capability).toHaveBeenLastCalledWith(expect.anything(), "finish", [
      id,
      requestId,
      "receipt",
      "delivered",
      "contact123",
    ]);
  });
  it("refuses to label a mismatched provider response delivered", async () => {
    const network = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        contact: { id: "contact123", locationId: "otherLocation123", email: visitor.email },
      }),
    );
    await tryFunnelDelivery(id, requestId, "receipt", configured, network);
    expect(mock.capability).toHaveBeenLastCalledWith(expect.anything(), "finish", [
      id,
      requestId,
      "receipt",
      "uncertain",
      null,
    ]);
  });
  it("does not retry a timed-out external write or resend a claim already consumed", async () => {
    const network = vi.fn<typeof fetch>().mockRejectedValue(new Error("timeout"));
    await tryFunnelDelivery(id, requestId, "receipt", configured, network);
    expect(network).toHaveBeenCalledTimes(1);
    expect(mock.capability).toHaveBeenLastCalledWith(expect.anything(), "finish", [
      id,
      requestId,
      "receipt",
      "uncertain",
      null,
    ]);
    mock.capability.mockResolvedValue(null);
    await tryFunnelDelivery(id, requestId, "receipt", configured, network);
    expect(network).toHaveBeenCalledTimes(1);
  });
});

describe("funnel retention while public collection is disabled", () => {
  it("returns a sanitized refusal when the database is unavailable", async () => {
    mock.connect.mockRejectedValue(new Error("connection contains private configuration"));
    const secret = randomBytes(32).toString("base64url");
    const response = await runFunnelRetention(
      new Request("https://example.org/api/jobs/funnel-inquiries", {
        headers: { authorization: `Bearer ${secret}` },
      }),
      { CRON_SECRET: secret },
    );
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "RETENTION_UNAVAILABLE" });
  });
  it("still deletes expired ciphertext through the scheduler boundary without decrypting it", async () => {
    const execute = vi.fn().mockResolvedValue({ rows: [{ removed: 3 }] });
    const release = vi.fn();
    mock.connect.mockResolvedValue({ execute, release });
    const secret = randomBytes(32).toString("base64url");
    const response = await runFunnelRetention(
      new Request("https://example.org/api/jobs/funnel-inquiries", {
        headers: { authorization: `Bearer ${secret}` },
      }),
      { CRON_SECRET: secret, OALO_FUNNEL_PUBLICATION: "disabled" },
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ removed: 3 });
    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({ text: "set local role scheduler_runtime" }),
    );
    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({
        text: "select campaign.purge_expired_funnel_inquiries() as removed",
      }),
    );
    expect(release).toHaveBeenCalledTimes(1);
  });
  it("does not connect to the database on missing or invalid scheduler authorization", async () => {
    const response = await runFunnelRetention(
      new Request("https://example.org/api/jobs/funnel-inquiries"),
      {
        CRON_SECRET: randomBytes(32).toString("base64url"),
      },
    );
    expect(response.status).toBe(401);
    expect(mock.connect).not.toHaveBeenCalled();
  });
});
