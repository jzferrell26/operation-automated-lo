// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  WEBINAR_PENDING_KEY,
  clearPendingWebinarSave,
  readPendingWebinarSave,
  retainPendingWebinarSave,
} from "./pending-save.js";
import type { WebinarRequest } from "./preparation-model.js";
const request: WebinarRequest = {
  requestId: "00000000-0000-4000-8000-000000000901",
  templateId: "webinar-first-home-plan",
  templateVersion: 1,
  publicationId: "00000000-0000-4000-8000-000000000902",
  headline: "Prepare your buying plan",
  primaryText: "Explore the steps in an educational webinar.",
  endsOn: "2030-06-12",
  dailyBudgetDollars: 25,
  totalBudgetDollars: 350,
  places: ["Austin, TX", "Texas"],
};
afterEach(() => {
  vi.restoreAllMocks();
  window.sessionStorage.clear();
});
describe("bounded tab retry boundary", () => {
  it("retains one exact validated transport request and never normalizes its places into the server output shape", () => {
    expect(retainPendingWebinarSave(request)).toBe(true);
    expect(readPendingWebinarSave()).toEqual({ kind: "stored", request });
    expect(JSON.parse(window.sessionStorage.getItem(WEBINAR_PENDING_KEY)!)).toEqual(request);
    expect(clearPendingWebinarSave()).toBe(true);
    expect(readPendingWebinarSave()).toEqual({ kind: "none" });
  });
  it.each(["brand", "principal", "reviewer", "approval", "sourceSnapshot", "destinationUrl"])(
    "rejects injected %s evidence without retaining a request",
    (key) => {
      window.sessionStorage.setItem(
        WEBINAR_PENDING_KEY,
        JSON.stringify({ ...request, [key]: "untrusted" }),
      );
      expect(readPendingWebinarSave()).toEqual({ kind: "invalid" });
    },
  );
  it.each(["{", "x".repeat(8193)])("refuses malformed or oversized retained content", (body) => {
    window.sessionStorage.setItem(WEBINAR_PENDING_KEY, body);
    expect(readPendingWebinarSave()).toEqual({ kind: "invalid" });
  });
  it("refuses unsupported targeting and unpaired existing-version references", () => {
    window.sessionStorage.setItem(
      WEBINAR_PENDING_KEY,
      JSON.stringify({ ...request, places: ["90210"] }),
    );
    expect(readPendingWebinarSave()).toEqual({ kind: "invalid" });
    window.sessionStorage.setItem(
      WEBINAR_PENDING_KEY,
      JSON.stringify({ ...request, campaignRef: "campaign_example001" }),
    );
    expect(readPendingWebinarSave()).toEqual({ kind: "invalid" });
  });
  it("reports blocked browser storage without claiming a retained request", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("Blocked", "SecurityError");
    });
    expect(readPendingWebinarSave()).toEqual({ kind: "unavailable" });
    expect(retainPendingWebinarSave(request)).toBe(false);
  });
});
