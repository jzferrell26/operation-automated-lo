import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  leakedReviewStrings,
  reviewSurfaceText,
  userLanguageForbiddenStrings,
} from "../../../(authenticated)/review-surface-sweep.js";
import {
  SHARED_REPORT_UNAVAILABLE_BODY,
  SHARED_REPORT_UNAVAILABLE_TITLE,
} from "../../../../copy/shared-report-messages.js";
import {
  resetSharedReportBudgetsForTests,
  SHARED_REPORT_READS_PER_MINUTE,
} from "../../../../server/homeowners/share-throttle.js";
import SharedReportPage from "./page.js";
import SharedReportNotFound, { metadata } from "./not-found.js";

/**
 * PRD-008c. The page a homeowner sees when a shared report link cannot be shown.
 *
 * The review browser run found that `/home-report/<link>` answered with the framework's own 404,
 * thirty-odd characters of English that say nothing a homeowner can act on. This is the product's
 * page instead. What these cases pin is what it says, that it says it in the contract's vocabulary
 * (read through the same rendered sweep the signed-in screens are), that it carries nothing that
 * could tell a stranger which links exist, and that the report page really does send every link it
 * cannot show here.
 */

const lookup = vi.hoisted(() => ({ report: vi.fn() }));
vi.mock("@oalo/db", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@oalo/db")>()),
  readSharedHomeReport: lookup.report,
}));
vi.mock("../../../../server/campaign-persistence-runtime.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../../server/campaign-persistence-runtime.js")>()),
  campaignDatabasePool: () => ({}),
}));
vi.mock("next/navigation.js", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));
// The page reads the caller's address from the request, which a direct call has no scope for.
const incoming = vi.hoisted(() => ({ headers: new Headers() }));
vi.mock("next/headers.js", () => ({ headers: async () => incoming.headers }));

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("OALO_HOMEOWNER_REPORTS", "enabled");
  incoming.headers = new Headers();
  resetSharedReportBudgetsForTests();
});

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe("the page for a report link that cannot be shown", () => {
  it("says what is true and what the homeowner can do, in these words", () => {
    render(<SharedReportNotFound />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "This report link isn't available",
    );
    expect(
      screen.getByText(
        "The link may have expired, been turned off, or been copied incompletely. Ask the person who sent it to you for a new link.",
      ),
    ).toBeVisible();
    expect(SHARED_REPORT_UNAVAILABLE_TITLE).toBe("This report link isn't available");
    expect(SHARED_REPORT_UNAVAILABLE_BODY).toContain("Ask the person who sent it to you");
  });

  it("reads in the contract's vocabulary, through the rendered sweep", () => {
    const { container } = render(<SharedReportNotFound />);
    const surface = reviewSurfaceText(container);

    // The honest page is a heading and two sentences, which is more than the framework's default 404
    // and the review browser spec's floor for "rendered something to read".
    expect(surface.length).toBeGreaterThan(80);
    expect(leakedReviewStrings(surface, userLanguageForbiddenStrings())).toEqual([]);
  });

  it("offers nothing to follow or press, because its reader has no account to go back to", () => {
    const { container } = render(<SharedReportNotFound />);

    expect(container.querySelectorAll("h1")).toHaveLength(1);
    expect(container.querySelectorAll("a, button, input, form")).toHaveLength(0);
    expect(container.querySelector("[href]")).toBeNull();
  });

  it("takes nothing in, so it cannot say anything about which links exist", () => {
    expect(SharedReportNotFound.length).toBe(0);

    const first = render(<SharedReportNotFound />).container.innerHTML;
    cleanup();
    const second = render(<SharedReportNotFound />).container.innerHTML;

    expect(second).toBe(first);
  });

  it("keeps the report page's robots and referrer posture in its own markup", () => {
    expect(metadata.robots).toEqual({ index: false, follow: false, nocache: true });
    expect(metadata.referrer).toBe("no-referrer");
    expect(metadata.title).toBe("This report link isn't available");
  });
});

describe("the report page, for a link it cannot show", () => {
  const goodShape = "b2".repeat(32);

  async function open(secret: string) {
    return SharedReportPage({ params: Promise.resolve({ secret }) });
  }

  it("sends a link that is not shaped like one here, without looking anything up", async () => {
    await expect(open("not-a-link")).rejects.toThrow("NEXT_NOT_FOUND");
    expect(lookup.report).not.toHaveBeenCalled();
  });

  it("sends every link here when the deployment has not enabled reports", async () => {
    vi.stubEnv("OALO_HOMEOWNER_REPORTS", "");

    await expect(open(goodShape)).rejects.toThrow("NEXT_NOT_FOUND");
    expect(lookup.report).not.toHaveBeenCalled();
  });

  it("sends a link with no live report behind it here, whatever the reason", async () => {
    lookup.report.mockResolvedValue(null);

    await expect(open(goodShape)).rejects.toThrow("NEXT_NOT_FOUND");
    await expect(open("0".repeat(64))).rejects.toThrow("NEXT_NOT_FOUND");
    expect(lookup.report).toHaveBeenCalledTimes(2);
  });
});

describe("the report page, for a caller that asks too often", () => {
  const goodShape = "b2".repeat(32);
  const caller = () => new Headers({ "x-vercel-forwarded-for": "203.0.113.7" });

  async function open(secret: string) {
    return SharedReportPage({ params: Promise.resolve({ secret }) });
  }

  it("sends a caller past its limit to the same page, without looking anything up", async () => {
    incoming.headers = caller();
    lookup.report.mockResolvedValue(null);
    for (let used = 0; used < SHARED_REPORT_READS_PER_MINUTE; used += 1)
      await expect(open(goodShape)).rejects.toThrow("NEXT_NOT_FOUND");
    expect(lookup.report).toHaveBeenCalledTimes(SHARED_REPORT_READS_PER_MINUTE);

    await expect(open(goodShape)).rejects.toThrow("NEXT_NOT_FOUND");
    await expect(open("0".repeat(64))).rejects.toThrow("NEXT_NOT_FOUND");

    expect(lookup.report).toHaveBeenCalledTimes(SHARED_REPORT_READS_PER_MINUTE);
  });

  it("keeps one caller's refusal from reaching a homeowner on another connection", async () => {
    incoming.headers = caller();
    lookup.report.mockResolvedValue(null);
    for (let used = 0; used <= SHARED_REPORT_READS_PER_MINUTE; used += 1)
      await open(goodShape).catch(() => undefined);

    incoming.headers = new Headers({ "x-vercel-forwarded-for": "198.51.100.9" });
    lookup.report.mockResolvedValue({ id: "hreport_other" });

    await expect(open(goodShape)).resolves.toBeTruthy();
  });

  it("does not spend an allowance on a link that is not shaped like one", async () => {
    incoming.headers = caller();
    lookup.report.mockResolvedValue({ id: "hreport_real" });
    for (let used = 0; used < SHARED_REPORT_READS_PER_MINUTE * 2; used += 1)
      await expect(open("not-a-link")).rejects.toThrow("NEXT_NOT_FOUND");

    await expect(open(goodShape)).resolves.toBeTruthy();
  });
});

describe("the report page, while another homeowner setting is mistyped", () => {
  const goodShape = "b2".repeat(32);

  async function open(secret: string) {
    return SharedReportPage({ params: Promise.resolve({ secret }) });
  }

  it("still shows a live link, because only the on-or-off setting decides whether it is answered", async () => {
    vi.stubEnv("OALO_HOMEOWNER_ALLOWED_LOCATION_IDS", "00000000-0000-4000-8000-00000000000");
    vi.stubEnv("OALO_HOMEOWNER_MONTHLY_LOOKUP_LIMIT", "many");
    lookup.report.mockResolvedValue({ id: "hreport_real" });

    await expect(open(goodShape)).resolves.toBeTruthy();
  });

  it("sends a link with no report behind it to the usual page rather than an error", async () => {
    vi.stubEnv("OALO_HOMEOWNER_ALLOWED_LOCATION_IDS", "00000000-0000-4000-8000-00000000000");
    lookup.report.mockResolvedValue(null);

    await expect(open(goodShape)).rejects.toThrow("NEXT_NOT_FOUND");
    expect(lookup.report).toHaveBeenCalledTimes(1);
  });
});
