import { beforeEach, describe, expect, it } from "vitest";
import {
  consumeSharedReportBudget,
  createAddressBudget,
  resetSharedReportBudgetsForTests,
  shareClientAddress,
  SHARED_REPORT_EVENTS_PER_MINUTE,
  SHARED_REPORT_READS_PER_MINUTE,
} from "./share-throttle.js";

/**
 * PRD-007 independent security review, finding M-1.
 *
 * The report page and its JSON endpoint answer anyone, and a well-shaped link costs a database
 * round trip sequence whether or not a report is behind it. These cases pin the per-address
 * allowance that backs the platform's own rate limiting: what it counts, when it forgets, how much
 * it will remember, and which callers it leaves alone.
 */

function headersFor(values: Record<string, string>): Headers {
  return new Headers(values);
}

describe("a per-address allowance", () => {
  it("allows its limit inside one window, then refuses with the seconds left", () => {
    let now = 1_000_000;
    const budget = createAddressBudget({ limit: 3, windowMs: 60_000, now: () => now });

    for (let used = 0; used < 3; used += 1)
      expect(budget.consume("203.0.113.7"), `use ${used + 1}`).toEqual({
        allowed: true,
        retryAfterSeconds: 0,
      });

    now += 10_500;
    expect(budget.consume("203.0.113.7")).toEqual({ allowed: false, retryAfterSeconds: 50 });
    expect(budget.consume("203.0.113.7").allowed).toBe(false);
  });

  it("starts a fresh window once the old one has passed", () => {
    let now = 0;
    const budget = createAddressBudget({ limit: 1, windowMs: 60_000, now: () => now });

    expect(budget.consume("203.0.113.7").allowed).toBe(true);
    expect(budget.consume("203.0.113.7").allowed).toBe(false);
    now = 59_999;
    expect(budget.consume("203.0.113.7").allowed).toBe(false);
    now = 60_000;
    expect(budget.consume("203.0.113.7").allowed).toBe(true);
  });

  it("counts each address on its own", () => {
    const budget = createAddressBudget({ limit: 1, windowMs: 60_000, now: () => 0 });

    expect(budget.consume("203.0.113.7").allowed).toBe(true);
    expect(budget.consume("203.0.113.7").allowed).toBe(false);
    expect(budget.consume("198.51.100.9").allowed).toBe(true);
  });

  it("never remembers more addresses than it was given room for", () => {
    let now = 0;
    const budget = createAddressBudget({
      limit: 1,
      windowMs: 60_000,
      maxAddresses: 3,
      now: () => now,
    });

    for (const address of ["a", "b", "c", "d", "e"]) {
      now += 1;
      budget.consume(address);
      expect(budget.size).toBeLessThanOrEqual(3);
    }
    // The newest callers are still counted; the oldest were forgotten to make room.
    expect(budget.consume("e").allowed).toBe(false);
    expect(budget.consume("a").allowed).toBe(true);
  });

  it("drops expired addresses before it drops live ones", () => {
    let now = 0;
    const budget = createAddressBudget({
      limit: 1,
      windowMs: 1_000,
      maxAddresses: 2,
      now: () => now,
    });

    budget.consume("old");
    now = 900;
    budget.consume("live");
    now = 1_100;
    budget.consume("new");

    expect(budget.size).toBe(2);
    expect(budget.consume("live").allowed).toBe(false);
  });
});

describe("the address a request came from", () => {
  it("reads the platform's own header first, then the standard forwarding headers", () => {
    expect(
      shareClientAddress(
        headersFor({
          "x-vercel-forwarded-for": "203.0.113.7",
          "x-forwarded-for": "198.51.100.9",
          "x-real-ip": "192.0.2.1",
        }),
      ),
    ).toBe("203.0.113.7");
    expect(shareClientAddress(headersFor({ "x-forwarded-for": "198.51.100.9, 10.0.0.1" }))).toBe(
      "198.51.100.9",
    );
    expect(shareClientAddress(headersFor({ "x-real-ip": "192.0.2.1" }))).toBe("192.0.2.1");
  });

  it("reads no address from a request that names none, or names an absurd one", () => {
    expect(shareClientAddress(headersFor({}))).toBeUndefined();
    expect(shareClientAddress(headersFor({ "x-forwarded-for": "   " }))).toBeUndefined();
    expect(shareClientAddress(headersFor({ "x-forwarded-for": "9".repeat(101) }))).toBeUndefined();
  });
});

describe("the allowance for a shared report", () => {
  beforeEach(() => resetSharedReportBudgetsForTests());

  const caller = headersFor({ "x-vercel-forwarded-for": "203.0.113.7" });

  it("lets a caller read its limit and refuses the next one", () => {
    for (let used = 0; used < SHARED_REPORT_READS_PER_MINUTE; used += 1)
      expect(consumeSharedReportBudget(caller, "read").allowed).toBe(true);

    const refused = consumeSharedReportBudget(caller, "read");
    expect(refused.allowed).toBe(false);
    expect(refused.retryAfterSeconds).toBeGreaterThan(0);
    expect(refused.retryAfterSeconds).toBeLessThanOrEqual(60);
  });

  it("holds explicit review requests to a smaller allowance than reads, counted separately", () => {
    expect(SHARED_REPORT_EVENTS_PER_MINUTE).toBeLessThan(SHARED_REPORT_READS_PER_MINUTE);
    for (let used = 0; used < SHARED_REPORT_EVENTS_PER_MINUTE; used += 1)
      expect(consumeSharedReportBudget(caller, "event").allowed).toBe(true);

    expect(consumeSharedReportBudget(caller, "event").allowed).toBe(false);
    expect(consumeSharedReportBudget(caller, "read").allowed).toBe(true);
  });

  it("does not count a request it cannot place, so a local run is never held back", () => {
    for (let used = 0; used < SHARED_REPORT_READS_PER_MINUTE * 3; used += 1)
      expect(consumeSharedReportBudget(headersFor({}), "read").allowed).toBe(true);
  });
});
