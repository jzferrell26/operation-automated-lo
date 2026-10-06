import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createTemporaryCampaignStore } from "./campaign-command-test-support.js";
import { handleFunnelPhoto, handleFunnelRead, handleFunnelSave } from "./funnel-http.js";
import {
  createLocalSyntheticPrincipal,
  createDefaultCampaignCommandPorts,
} from "./authenticated-principal.js";
import { createFunnelStore } from "./funnel-store.js";
import { FUNNELS } from "../features/funnels/catalog.js";
import { FunnelSaveResponseSchema, type FunnelSave } from "../features/funnels/model.js";

const temporary = createTemporaryCampaignStore("oalo-funnels-");
const ports = createDefaultCampaignCommandPorts();
const command = (): FunnelSave => ({
  kind: "buyer",
  templateVersion: "1.0.0",
  fields: structuredClone(FUNNELS[2]!.defaults),
  expectedRevision: null,
  requestId: randomUUID(),
});
const request = (body: unknown) =>
  new Request("https://app.operation-automated-lo.test/api/funnels", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
afterEach(async () => {
  await temporary.restore();
  vi.restoreAllMocks();
});
describe("actual private funnel save and read boundaries", () => {
  it("saves server branding and reloads all fields without a public side effect", async () => {
    await temporary.enter();
    const spy = vi.spyOn(globalThis, "fetch");
    const response = await handleFunnelSave(request(command()), temporary.env(), ports);
    expect(response.status).toBe(200);
    const { draft } = FunnelSaveResponseSchema.parse(await response.json());
    expect(draft.brand.name).toBe("Alex Morgan");
    expect(draft.publicationAuthorized).toBe(false);
    const read = await handleFunnelRead(
      new Request("https://app.operation-automated-lo.test/api/funnels"),
      temporary.env(),
      ports,
    );
    expect(await read.json()).toEqual({ drafts: [draft] });
    expect(read.headers.get("cache-control")).toContain("no-store");
    expect(spy).not.toHaveBeenCalled();
  });
  it("handles concurrent exact saves and rejects changed retries and stale tabs", async () => {
    await temporary.enter();
    const input = command();
    const responses = await Promise.all(
      Array.from({ length: 4 }, () => handleFunnelSave(request(input), temporary.env(), ports)),
    );
    const saved = await Promise.all(
      responses.map(async (result) => {
        expect(result.status).toBe(200);
        return FunnelSaveResponseSchema.parse(await result.json()).draft;
      }),
    );
    expect(new Set(saved.map((item) => item.revision)).size).toBe(1);
    expect(
      (
        await handleFunnelSave(
          request({ ...input, fields: { ...input.fields, headline: "Changed retry" } }),
          temporary.env(),
          ports,
        )
      ).status,
    ).toBe(409);
    expect(
      (
        await handleFunnelSave(
          request({
            ...input,
            requestId: randomUUID(),
            fields: { ...input.fields, headline: "Another tab" },
          }),
          temporary.env(),
          ports,
        )
      ).status,
    ).toBe(409);
    expect(
      (
        await handleFunnelSave(
          request({
            ...input,
            requestId: randomUUID(),
            expectedRevision: saved[0]!.revision,
            fields: { ...input.fields, headline: "Deliberate new wording" },
          }),
          temporary.env(),
          ports,
        )
      ).status,
    ).toBe(200);
  });
  it("keeps a different local actor and workspace out of the saved draft", async () => {
    await temporary.enter();
    await handleFunnelSave(request(command()), temporary.env(), ports);
    const other = createLocalSyntheticPrincipal({
      actorRef: "principal_someoneelse001",
      locationRef: "location_otherworkspace001",
    });
    expect(await createFunnelStore(other, temporary.env()).list()).toEqual([]);
  });
  it.each([
    { published: true },
    { brand: { name: "Other lender" } },
    { locationId: randomUUID() },
    { actorRef: "anyone" },
  ])("rejects injected authority %j", async (override) => {
    await temporary.enter();
    expect(
      (await handleFunnelSave(request({ ...command(), ...override }), temporary.env(), ports))
        .status,
    ).toBe(400);
  });
  it("refuses unauthenticated hosted reads and saves", async () => {
    const env = { OALO_ENVIRONMENT: "production", OALO_REVIEW_SURFACE: "authorized" };
    expect((await handleFunnelSave(request(command()), env, ports)).status).toBe(401);
    expect(
      (
        await handleFunnelRead(
          new Request("https://app.operation-automated-lo.test/api/funnels"),
          env,
          ports,
        )
      ).status,
    ).toBe(401);
  });
  it("does not trust a raster MIME label or permission checkbox as valid image bytes", async () => {
    await temporary.enter();
    expect(
      (
        await handleFunnelPhoto(
          request({
            data:
              "data:image/png;base64," +
              Buffer.from("<svg><script>bad()</script></svg>").toString("base64"),
            alt: "Invalid",
          }),
          temporary.env(),
          ports,
        )
      ).status,
    ).toBe(400);
    const input = command();
    input.fields.heroPhoto = {
      dataUrl: "data:image/webp;base64," + Buffer.from("not a photo").toString("base64"),
      alt: "Invalid",
    };
    input.fields.mediaPermissionConfirmed = true;
    expect((await handleFunnelSave(request(input), temporary.env(), ports)).status).toBe(400);
  });
  it("rejects oversize and non-JSON requests", async () => {
    await temporary.enter();
    expect(
      (await handleFunnelSave(request({ stuff: "x".repeat(910000) }), temporary.env(), ports))
        .status,
    ).toBe(413);
    expect(
      (
        await handleFunnelSave(
          new Request("https://app.operation-automated-lo.test/api/funnels", {
            method: "POST",
            body: "text",
          }),
          temporary.env(),
          ports,
        )
      ).status,
    ).toBe(415);
  });
});
