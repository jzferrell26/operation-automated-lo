import { randomBytes, randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  publicFunnelConfig,
  encryptVisitor,
  decryptVisitor,
  receiptSecret,
  receiptHash,
  visitorHash,
} from "./funnel-public-store.js";
import { FunnelVisitorSchema } from "../features/funnels/visitor-model.js";
import { readPublicCookie, PUBLIC_COOKIE } from "./funnel-public-delivery.js";
import { FUNNELS } from "../features/funnels/catalog.js";
import { publicationBlockers, landingSnapshot } from "../features/funnels/publication-model.js";
import { salesDefaults } from "../features/funnels/sales-content.js";
import { googleCalendarLink, previewCalendar } from "../features/funnels/calendar.js";

const environment = {
  OALO_FUNNEL_PUBLICATION: "enabled",
  OALO_APP_URL: "https://example.org",
  OALO_FUNNEL_DATA_KEY: randomBytes(32).toString("base64url"),
};
const config = publicFunnelConfig(environment);
const input = () =>
  FunnelVisitorSchema.parse({
    requestId: randomUUID(),
    firstName: "Example",
    email: "Example@example.org",
    phone: "",
    goal: "learn",
    consent: true,
    website: "",
  });
describe("public request boundary", () => {
  it("encrypts contact details with a fresh nonce and binds them to publication and request", () => {
    const id = randomUUID(),
      visitor = input(),
      a = encryptVisitor(config, id, visitor),
      b = encryptVisitor(config, id, visitor);
    expect(a).not.toBe(b);
    expect(a).not.toContain("example.org");
    expect(decryptVisitor(config, id, visitor.requestId, a)).toEqual(visitor);
    expect(() => decryptVisitor(config, randomUUID(), visitor.requestId, a)).toThrow();
    expect(() => decryptVisitor(config, id, randomUUID(), a)).toThrow();
    expect(() => decryptVisitor(config, id, visitor.requestId, a.slice(0, -4) + "AAAA")).toThrow();
  });
  it("binds retry receipts and request hashes without serializing personal details in the receipt", () => {
    const id = randomUUID(),
      visitor = input();
    const secret = receiptSecret(config, id, visitor.requestId);
    expect(secret).toMatch(/^[a-f0-9]{64}$/u);
    expect(secret).not.toContain(visitor.email);
    expect(receiptSecret(config, id, visitor.requestId)).toBe(secret);
    expect(receiptSecret(config, randomUUID(), visitor.requestId)).not.toBe(secret);
    expect(visitorHash(config, id, visitor)).not.toBe(
      visitorHash(config, id, { ...visitor, email: "other@example.org" }),
    );
    expect(receiptHash(secret)).not.toBe(secret);
    expect(readPublicCookie(`${PUBLIC_COOKIE}=${secret}`)).toBe(secret);
    expect(readPublicCookie(`${PUBLIC_COOKIE}=${secret}; ${PUBLIC_COOKIE}=${secret}`)).toBeNull();
  });
  it("requires explicit feature enablement, a separate data key, and a safe canonical origin", () => {
    expect(
      publicFunnelConfig({ ...environment, OALO_FUNNEL_GHL_DELIVERY: "disabled" }).ghl,
    ).toBeUndefined();
    for (const overrides of [
      { OALO_FUNNEL_PUBLICATION: "disabled" },
      { OALO_FUNNEL_DATA_KEY: "" },
      { OALO_APP_URL: "http://example.org" },
      { OALO_APP_URL: "https://name:password@example.org" },
      { OALO_APP_URL: "https://example.org/path" },
    ])
      expect(() => publicFunnelConfig({ ...environment, ...overrides })).toThrow();
    expect(
      publicFunnelConfig({
        ...environment,
        OALO_ENVIRONMENT: "local",
        OALO_APP_URL: "http://127.0.0.1:3141",
      }).origin,
    ).toBe("http://127.0.0.1:3141");
  });
  it("does not accept a caller's location, implicit consent, or honeypot content", () => {
    for (const extra of [
      { locationId: randomUUID() },
      { consent: false },
      { website: "bot" },
      { email: "not-email" },
    ])
      expect(FunnelVisitorSchema.safeParse({ ...input(), ...extra }).success).toBe(false);
  });
  it("checks real event/resource links and permission before publication", () => {
    for (const funnel of FUNNELS)
      expect(publicationBlockers(funnel.kind, funnel.defaults).length).toBeGreaterThan(0);
    const live = structuredClone(FUNNELS[0]!.defaults);
    live.sales = { ...salesDefaults("live-webinar"), privacyUrl: "https://example.org/privacy" };
    live.eventStartsAt = "2030-10-12T18:00:00Z";
    live.webinarUrl = "https://example.org/join";
    expect(publicationBlockers("live-webinar", live, Date.parse("2030-10-01"))).toEqual([]);
    expect(publicationBlockers("live-webinar", live, Date.parse("2030-10-13"))).toContain(
      "Set a future webinar date and time.",
    );
    live.sales.quoteText = "Real text";
    expect(publicationBlockers("live-webinar", live).join()).toContain("client quote");
  });
  it("keeps webinar and resource URLs out of landing data until an accepted receipt exists", () => {
    const fields = {
      ...FUNNELS[0]!.defaults,
      webinarUrl: "https://example.org/private",
      videoUrl: "https://example.org/secret.mp4",
      resourceUrl: "https://example.org/guide.pdf",
      bookingUrl: "https://example.org/book",
    };
    const projected = landingSnapshot({
      kind: "live-webinar",
      fields,
      brand: {
        name: "Example",
        company: "Example lender",
        nmls: "123456",
        companyNmls: "123457",
        disclosure: "Example",
        colorPresetId: "navy",
      },
    });
    expect(projected.fields.webinarUrl).toBe("");
    expect(projected.fields.videoUrl).toBe("");
    expect(projected.fields.resourceUrl).toBe("");
    expect(fields.webinarUrl).toBe("https://example.org/private");
  });
  it("distinguishes an actual accepted registration calendar from a private preview", () => {
    const fields = {
        ...FUNNELS[0]!.defaults,
        eventStartsAt: "2030-10-12T18:00:00Z",
        webinarUrl: "https://example.org/join",
      },
      now = Date.parse("2030-10-01");
    expect(previewCalendar(fields, now)).toContain("[PREVIEW]");
    expect(previewCalendar(fields, now, true)).not.toContain("[PREVIEW]");
    expect(new URL(googleCalendarLink(fields, now, true)!).searchParams.get("location")).toBe(
      fields.webinarUrl,
    );
  });
});
