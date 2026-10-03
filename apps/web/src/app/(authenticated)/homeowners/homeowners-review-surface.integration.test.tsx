import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { HomeWorkspace } from "@oalo/contracts";
import {
  liveWorkspace,
  sampleSavedProperty,
  sampleSavedReport,
  stubDialogLayout,
} from "../../../features/homeowners/home-workspace.test-support.js";
import { homeError } from "../../../server/homeowners/http.js";
import { useReviewModeEnvironment } from "../review-mode-test-support.js";
import {
  leakedReviewStrings,
  reviewSurfaceText,
  userLanguageForbiddenStrings,
} from "../review-surface-sweep.js";
import SharedReportPage from "../../(public)/home-report/[secret]/page.js";
import HomeownersPage, { metadata as homeownersMetadata } from "./page.js";
import NewHomeownerReportPage, { metadata as newReportMetadata } from "./new/page.js";
import HomeownerReportPage, { metadata as reportMetadata } from "./[propertyId]/page.js";

/**
 * PRD-008c 008C-AC-006: the rendered sweep over the homeowner report screens.
 *
 * The six review-surface suites sweep the screens that read a fixture. The homeowner screens read
 * the server instead, so what a loan officer sees there is whatever the server sends, which is how
 * two administrator sentences reached them without the source guard noticing (008C-AC-001). This
 * suite renders the four things a person can open, as the real pages build them: the management
 * list, the create flow at each of its three steps, the report detail with every dialog it can
 * open, and the shared report page a homeowner receives. Each one is read the way the other suites
 * read a page, through `reviewSurfaceText` against `userLanguageForbiddenStrings`, so a banned word
 * or a code in text, an accessible name, or a description fails here.
 *
 * It runs in review mode. The pages themselves take the signed-in brand from the session, which a
 * component test has none of, so that one read is stubbed; every other module is the real one, and
 * the refusals are the real `homeError`.
 *
 * The browser-level counterpart, which reads the same screens off a running review deployment, is
 * `tests/browser/review/homeowner-language-sweep.spec.ts`.
 */

const mocked = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  push: vi.fn(),
  sharedReport: vi.fn(),
}));
vi.mock("../../../features/http/internal-api.js", () => ({
  getInternalJson: mocked.get,
  postInternalJson: mocked.post,
}));
vi.mock("next/navigation.js", () => ({
  useRouter: () => ({ push: mocked.push }),
  notFound: () => {
    throw new Error("The page was not found.");
  },
}));
// The shared report page reads the caller's address from the request, which a direct call has no scope for.
vi.mock("next/headers.js", () => ({ headers: async () => new Headers() }));
vi.mock("../../../server/homeowners/page-brand.js", () => ({
  homePageBrand: async () => ({
    name: "Casey Example",
    company: "Example Lending",
    email: "casey@example.test",
    phone: "",
    nmls: "123456",
    companyNmls: "",
    tagline: "A clear next step.",
  }),
}));
vi.mock("@oalo/db", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@oalo/db")>()),
  readSharedHomeReport: mocked.sharedReport,
}));
vi.mock("../../../server/campaign-persistence-runtime.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../server/campaign-persistence-runtime.js")>()),
  campaignDatabasePool: () => ({}),
}));

useReviewModeEnvironment();

const property = sampleSavedProperty();
let workspace: HomeWorkspace;
let delivery: { status: string; detailCode: string | null } | null;

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("OALO_HOMEOWNER_REPORTS", "enabled");
  stubDialogLayout();
  workspace = liveWorkspace([property]);
  delivery = null;
  mocked.get.mockImplementation(async (path: string) =>
    Response.json(path.includes("/reports/") ? { delivery } : workspace),
  );
  mocked.post.mockResolvedValue(Response.json({ message: "Action saved." }));
  mocked.sharedReport.mockResolvedValue(sampleSavedReport());
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

/**
 * The one identifier these pages carry, and why the sweep lets it through.
 *
 * The link that opens a report is `/homeowners/<property id>`, and the rendered guard reads any
 * `word_word` in an address as a code, so the id would be reported on every page that links to a
 * property. It is a route key: it reaches the address bar and nothing a person reads, no sentence,
 * heading, or accessible name shows it, and the route has to be keyed by something. The allowance is
 * scoped the way the fixture sweep scopes one, to this exact value in this exact position, so the
 * same id appearing anywhere else on a page, as a word or in another attribute, is still reported.
 */
function withoutRouteKeys(surface: string): string {
  return surface.replaceAll(`/homeowners/${property.id}`, "/homeowners/this-property");
}

/** What a person can read on the page right now, held to the contract's whole vocabulary. */
function expectCleanSurface(minimumLength = 200): void {
  const surface = withoutRouteKeys(reviewSurfaceText(document.body));
  expect(surface.length, "the sweep read a page, not an empty shell").toBeGreaterThan(
    minimumLength,
  );
  expect(surface, "the route key is only ever in a link's address").not.toContain(property.id);
  expect(leakedReviewStrings(surface, userLanguageForbiddenStrings())).toEqual([]);
}

async function openList() {
  render(await HomeownersPage());
  await screen.findByRole("heading", { name: "Homeowner reports", level: 1 });
  return userEvent.setup();
}

async function openCreate() {
  render(await NewHomeownerReportPage());
  await screen.findByRole("heading", { name: "Create a homeowner report", level: 1 });
  return userEvent.setup();
}

async function openDetail(id = property.id) {
  render(await HomeownerReportPage({ params: Promise.resolve({ propertyId: id }) }));
  return userEvent.setup();
}

describe("the homeowner report management screen in review mode", () => {
  it("reads in the contract's vocabulary with saved reports, and with its help dialog open", async () => {
    const user = await openList();
    await screen.findByText("Pat Homeowner", { exact: false });
    expectCleanSurface();

    await user.click(screen.getByRole("button", { name: "How it works" }));
    await screen.findByRole("dialog", { name: "A clear path from property to conversation" });
    expectCleanSurface();
  });

  it.each([
    ["is empty", () => liveWorkspace([], { lookupsThisMonth: 0 })],
    [
      "has no valuation connection yet",
      () => liveWorkspace([], { valuationConnected: false, ghlConnected: false }),
    ],
    ["belongs to a viewer", () => liveWorkspace([property], { canWrite: false })],
  ] as const)("reads in the contract's vocabulary when the workspace %s", async (_case, build) => {
    workspace = build();

    await openList();
    await screen.findByRole("heading", { name: "Homeowner reports", level: 1 });

    expectCleanSurface();
  });

  it("reads in the contract's vocabulary when the server cannot open the workspace", async () => {
    mocked.get.mockResolvedValue(homeError(new Error("connect ECONNREFUSED 10.0.0.5:5432")));

    await openList();
    await screen.findByRole("alert");

    expect(screen.getByRole("alert")).toHaveTextContent("Homeowner reports are unavailable");
    expectCleanSurface();
  });
});

describe("the homeowner report create screen in review mode", () => {
  it("reads in the contract's vocabulary at every step", async () => {
    workspace = liveWorkspace([], { ghlConnected: false });
    const user = await openCreate();
    expectCleanSurface();

    await user.type(screen.getByLabelText("Property street address"), "214 Cedar Street");
    await user.type(screen.getByLabelText("City"), "Dallas");
    await user.type(screen.getByLabelText("State"), "TX");
    await user.type(screen.getByLabelText("ZIP code"), "75201");
    await user.click(
      screen.getByLabelText(
        "I have confirmed the property address and authorize this valuation lookup.",
      ),
    );
    await user.click(screen.getByRole("button", { name: /Continue/u }));
    await screen.findByRole("heading", { name: "Build the equity picture" });
    expectCleanSurface();

    await user.click(screen.getByRole("button", { name: /Continue/u }));
    await screen.findByRole("heading", { name: "Make the report yours" });
    expectCleanSurface();
  });

  it.each([
    ["has no valuation connection", { valuationConnected: false }],
    ["cannot save reports", { canWrite: false }],
    ["has HighLevel connected", { ghlConnected: true }],
  ] as const)(
    "reads in the contract's vocabulary when the workspace %s",
    async (_case, override) => {
      workspace = liveWorkspace([], override);

      await openCreate();

      expectCleanSurface();
    },
  );
});

describe("the homeowner report detail screen in review mode", () => {
  it("reads in the contract's vocabulary, and with each of its dialogs open", async () => {
    const user = await openDetail();
    await screen.findByRole("heading", { name: property.address.street, level: 1 });
    expectCleanSurface();

    for (const [button, title] of [
      ["Share report", "Create a private report link?"],
      ["Update loan details", "Update mortgage details"],
      ["Refresh value", "Request a fresh valuation?"],
      ["Update schedule", "Monthly report updates"],
      ["Hand off to HighLevel", "Hand this report to HighLevel?"],
      ["Remove property", "Remove this property?"],
    ] as const) {
      await user.click(screen.getAllByRole("button", { name: new RegExp(button, "u") })[0]!);
      const dialog = await screen.findByRole("dialog", { name: title });
      expectCleanSurface();
      await user.keyboard("{Escape}");
      await waitFor(() => expect(within(document.body).queryByRole("dialog")).toBeNull());
      expect(dialog).not.toBeVisible();
    }
  });

  it("reads in the contract's vocabulary after a share link is made", async () => {
    mocked.post.mockResolvedValueOnce(
      Response.json({
        url: `https://reports.example.test/home-report/${"c".repeat(64)}`,
        expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
      }),
    );
    const user = await openDetail();
    await screen.findByRole("heading", { name: property.address.street, level: 1 });
    await user.click(screen.getByRole("button", { name: "Share report" }));
    const dialog = await screen.findByRole("dialog", { name: "Create a private report link?" });
    await user.click(
      within(dialog).getByLabelText("I authorize sharing this report with the intended homeowner."),
    );
    await user.click(within(dialog).getByRole("button", { name: "Create report link" }));

    await screen.findByLabelText("Private report link");
    expectCleanSurface();
  });

  it.each([
    ["sent", /This report was handed to HighLevel/u],
    ["pending", /A HighLevel handoff is in progress/u],
    ["uncertain", /HighLevel did not confirm the handoff/u],
    ["blocked", /This report's handoff is closed/u],
    ["unrecognized", /Delivery status could not be checked/u],
  ] as const)(
    "reads in the contract's vocabulary when the HighLevel handoff is %s",
    async (status, sentence) => {
      delivery = {
        status,
        detailCode: status === "blocked" ? "CONTACT_COMMUNICATION_BLOCKED" : null,
      };

      await openDetail();
      await screen.findByRole("heading", { name: property.address.street, level: 1 });
      await screen.findByText(sentence);

      expectCleanSurface();
    },
  );

  it("reads in the contract's vocabulary for a property with a paused schedule and a review request", async () => {
    workspace = liveWorkspace([
      {
        ...property,
        enrollment: {
          cadence: "monthly",
          paused: true,
          deliverUpdates: false,
          nextRefreshAt: null,
        },
        reviewRequestedAt: new Date().toISOString(),
        lastError: "VALUATION_NOT_FOUND",
      },
    ]);

    await openDetail();
    await screen.findByRole("heading", { name: property.address.street, level: 1 });
    await screen.findByText(/Monthly updates are paused/u);

    expectCleanSurface();
  });

  it("reads in the contract's vocabulary for a property whose first lookup saved no report", async () => {
    workspace = liveWorkspace([{ ...property, reports: [], lastError: "VALUATION_NOT_FOUND" }]);

    await openDetail();
    await screen.findByText(/did not produce a saved report/u);

    expectCleanSurface();
  });

  it("reads in the contract's vocabulary for a property that is not in this workspace", async () => {
    workspace = liveWorkspace([]);

    await openDetail();
    await screen.findByRole("heading", { name: "This property report is not available." });

    expectCleanSurface(100);
  });
});

describe("the shared homeowner report page", () => {
  const secret = "a".repeat(64);

  async function openShared() {
    render(await SharedReportPage({ params: Promise.resolve({ secret }) }));
    await screen.findByRole("heading", { name: "Your homeowner report", level: 1 });
    return userEvent.setup();
  }

  it("reads in the contract's vocabulary before and after the homeowner asks for a review", async () => {
    const user = await openShared();
    expectCleanSurface();

    await user.click(screen.getByRole("button", { name: "Request a review" }));
    await screen.findByText(/Your loan officer can now see your request/u);
    expectCleanSurface();
  });

  it("reads in the contract's vocabulary when the link has stopped working", async () => {
    mocked.post.mockResolvedValueOnce(Response.json({ message: "unavailable" }, { status: 404 }));
    const user = await openShared();

    await user.click(screen.getByRole("button", { name: "Request a review" }));
    await screen.findByText(/no longer available/u);

    expectCleanSurface();
  });
});

/**
 * Writing review delta check, D-6. Homeowner reports is one of the menu's six items, and its three
 * pages used to read "Automated LO" in the tab, beside the pages that name themselves. The list is the
 * menu item's words, the create page is its heading, and one report is "Homeowner report", because
 * its heading is the property's address.
 */
describe("the homeowner pages' tabs", () => {
  it("name each page, and the root layout's template adds the product after it", () => {
    expect(homeownersMetadata.title).toBe("Homeowner reports");
    expect(newReportMetadata.title).toBe("Create a homeowner report");
    expect(reportMetadata.title).toBe("Homeowner report");
  });
});
