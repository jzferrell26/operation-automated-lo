import { describe, expect, it } from "vitest";
import { FUNNELS } from "./catalog.js";
import { FunnelFieldsSchema, FunnelSaveSchema, safeDestination } from "./model.js";
import { eventLabel, googleCalendarLink, previewCalendar } from "./calendar.js";
import { webinarEmbed } from "./video.js";
import { findVocabularyHits } from "../../copy/forbidden-vocabulary.js";
import { FUNNEL_COPY } from "../../copy/funnel-messages.js";

describe("five fixed, field-only funnel journeys", () => {
  it("has the owner's exact five outcomes and fourteen designed pages", () => {
    expect(FUNNELS.map((item) => item.kind)).toEqual([
      "live-webinar",
      "on-demand",
      "buyer",
      "refinance",
      "lead-magnet",
    ]);
    expect(FUNNELS.reduce((sum, item) => sum + item.steps.length, 0)).toBe(14);
    expect(FUNNELS[0]?.steps.map((step) => step.id)).toEqual(["landing", "confirmation"]);
    expect(FUNNELS[1]?.steps.map((step) => step.id)).toEqual(["landing", "watch", "book"]);
    expect(FUNNELS[4]?.steps.map((step) => step.id)).toEqual(["landing", "book", "thanks"]);
  });
  it.each(FUNNELS)(
    "$kind starts with usable original fields and no invented media/proof",
    (funnel) => {
      expect(FunnelFieldsSchema.safeParse(funnel.defaults).success).toBe(true);
      expect(funnel.defaults.heroPhoto).toBeNull();
      expect(funnel.defaults.hostPhoto).toBeNull();
      expect(funnel.defaults.mediaPermissionConfirmed).toBe(false);
      for (const value of Object.values(funnel.defaults))
        if (typeof value === "string") expect(findVocabularyHits(value)).toEqual([]);
      expect(JSON.stringify(funnel.defaults)).not.toMatch(
        /lorem ipsum|testimonials|five.star|guaranteed savings/iu,
      );
    },
  );
  it("forbids caller identity, layout changes, arbitrary embeds and publication commands", () => {
    const input = {
      kind: "buyer",
      templateVersion: "1.0.0",
      fields: FUNNELS[2]!.defaults,
      expectedRevision: null,
      requestId: "00000000-0000-4000-8000-000000000011",
    };
    for (const change of [
      { brand: { name: "other" } },
      { userId: "other" },
      { locationRef: "other" },
      { published: true },
      { layout: "custom" },
      { html: "<script>1</script>" },
    ])
      expect(FunnelSaveSchema.safeParse({ ...input, ...change }).success).toBe(false);
    expect(
      FunnelSaveSchema.safeParse({ ...input, fields: { ...input.fields, sections: [] } }).success,
    ).toBe(false);
    expect(
      FunnelFieldsSchema.safeParse({
        ...input.fields,
        heroPhoto: { dataUrl: "data:image/svg+xml;base64,abc", alt: "x" },
      }).success,
    ).toBe(false);
  });
  it("keeps all new interface language inside the existing user vocabulary", () => {
    for (const value of Object.values(FUNNEL_COPY)) expect(findVocabularyHits(value)).toEqual([]);
  });
  it.each([
    "http://site.com",
    "javascript:alert(1)",
    "https://user:pass@site.com",
    "https://127.0.0.1/",
    "https://localhost/",
    "https://service.local/",
    "https://site.com:444/",
    "https://site.com/\nsecret",
    "data:text/html,x",
  ])("rejects unsafe destination %s", (url) => expect(safeDestination(url)).toBe(false));
  it("accepts ordinary explicit HTTPS destinations and blanks", () => {
    expect(safeDestination("https://calendar.company.com/booking/first-step?from=funnel")).toBe(
      true,
    );
    expect(safeDestination("")).toBe(true);
  });
});

describe("calendar and video destinations", () => {
  const fields = {
    ...FUNNELS[0]!.defaults,
    eventStartsAt: "2030-03-12T18:00:00-05:00",
    eventDurationMinutes: 45,
    offerTitle: "Home; plans, questions\nBEGIN:VEVENT",
  };
  const now = Date.parse("2029-01-01T00:00:00Z");
  it("preserves the actual instant, duration and preview marking without attendee data", () => {
    const ics = previewCalendar(fields, now)!;
    expect(ics).toContain("DTSTART:20300312T230000Z");
    expect(ics).toContain("DTEND:20300312T234500Z");
    expect(ics).toContain("SUMMARY:[PREVIEW] Home\\; plans\\, questions\\nBEGIN:VEVENT");
    expect(ics.match(/\r\nBEGIN:VEVENT\r\n/gu)).toHaveLength(1);
    expect(ics).not.toMatch(/ATTENDEE|mailto:/u);
    expect(eventLabel(fields)).toContain("America/Chicago");
    const url = new URL(googleCalendarLink(fields, now)!);
    expect(url.hostname).toBe("calendar.google.com");
    expect(url.searchParams.get("dates")).toBe("20300312T230000Z/20300312T234500Z");
  });
  it("refuses missing or past events, not an always-resetting countdown", () => {
    expect(previewCalendar({ ...fields, eventStartsAt: "" }, now)).toBeNull();
    expect(previewCalendar(fields, Date.parse("2031-01-01"))).toBeNull();
  });
  it("folds calendar text without splitting Unicode codepoints", () => {
    const result = previewCalendar({ ...fields, offerTitle: "é🏠".repeat(45) }, now)!;
    for (const line of result.split("\r\n"))
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    expect(result).not.toContain("�");
  });
  it("builds only exact allowlisted player locations", () => {
    expect(webinarEmbed("https://youtu.be/abcdefghijk")).toBe(
      "https://www.youtube-nocookie.com/embed/abcdefghijk?autoplay=1&rel=0",
    );
    expect(webinarEmbed("https://www.youtube.com/watch?v=abcdefghijk")).toContain(
      "youtube-nocookie.com",
    );
    expect(webinarEmbed("https://vimeo.com/123456789")).toBe(
      "https://player.vimeo.com/video/123456789?autoplay=1&dnt=1",
    );
    for (const url of [
      "https://youtube.com.evil.com/watch?v=abcdefghijk",
      "https://youtu.be/a<script>",
      "https://site.com/embed/1",
      "javascript:alert(1)",
    ])
      expect(webinarEmbed(url)).toBeNull();
  });
});
