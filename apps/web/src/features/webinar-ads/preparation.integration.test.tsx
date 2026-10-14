import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WebinarAdPreparation } from "./preparation.js";
import { TEST_BAND } from "../campaigns/components/launch-flow.test-support.js";
import { WEBINAR_CONTEXT_FIXTURE as context } from "./preparation.test-support.js";
import { WEBINAR_PENDING_KEY } from "./pending-save.js";
import { webinarReviewFixture } from "./review.test-support.js";
import { installSelectLayoutForTest } from "../../testing/select-layout.test-support.js";
const publicationId = context.destinations[0]!.destination.publicationId;

const navigation = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation.js", () => ({ useRouter: () => navigation }));
const saved = {
  campaignRef: "campaign_webinar001",
  campaignVersionRef: "campaignversion_webinar001",
  manifestHash: "a".repeat(64),
  preflightResultHash: "b".repeat(64),
  rowVersion: 1,
  versionNo: 1,
  state: "awaiting_approval",
  duplicate: false,
  detailHref: "/marketing/campaigns/campaign_webinar001",
  effectiveEndsAt: "2030-06-12T18:00:00.000Z",
  providerEnabled: false,
};
beforeEach(() => {
  window.sessionStorage.clear();
  installSelectLayoutForTest();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  vi.restoreAllMocks();
  window.sessionStorage.clear();
});
function mockRequests(responses: readonly (Response | Error)[], data: unknown = context) {
  const bodies: unknown[] = [];
  const queue = [...responses];
  const fetch = vi.fn(async (_url: string, options?: RequestInit) => {
    if (options?.method === "GET") return Response.json(data);
    bodies.push(JSON.parse(String(options?.body)));
    const response = queue.shift();
    if (response instanceof Error) throw response;
    return response ?? Response.json(saved, { status: 201 });
  });
  vi.stubGlobal("fetch", fetch);
  return { fetch, bodies };
}
async function setUp() {
  const user = userEvent.setup();
  render(<WebinarAdPreparation />);
  await user.click(
    await screen.findByRole("button", { name: "Use this creative: Your first home, a clear plan" }),
  );
  // The step transition deliberately focuses its heading on the next animation frame.
  // Let that focus settle before opening a popup whose trigger closes it on blur.
  await waitFor(() =>
    expect(screen.getByRole("heading", { name: "Prepare a webinar ad" })).toHaveFocus(),
  );
  await user.click(screen.getByRole("combobox", { name: "Published webinar" }));
  await user.click(screen.getByRole("option", { name: "Your homebuying plan (Live)" }));
  expect(screen.getByRole("combobox", { name: "Published webinar" })).toHaveTextContent(
    "Your homebuying plan (Live)",
  );
  await user.type(screen.getByLabelText("Cities or states"), "Austin, TX; Texas");
  await user.clear(screen.getByLabelText("Requested end date (UTC)"));
  await user.type(screen.getByLabelText("Requested end date (UTC)"), "2030-06-19");
  await user.click(screen.getByRole("button", { name: "Review setup" }));
  return user;
}
describe("saved webinar preparation", () => {
  it("settles step-heading focus before opening the webinar selection", async () => {
    const frames = new Map<number, FrameRequestCallback>();
    const deliver = (id: number) => {
      const callback = frames.get(id);
      if (!callback) return;
      frames.delete(id);
      window.clearTimeout(id);
      act(() => callback(performance.now()));
    };
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      const id = window.setTimeout(() => deliver(id), 250);
      frames.set(id, callback);
      return id;
    });
    // Deliver an outstanding frame just after the next pointer click. If setup opens the
    // Select too soon, its actual heading-focus callback blurs and closes the real popup.
    const finishPendingFrame = (event: Event) => {
      if (event.target instanceof Element && event.target.closest('[role="combobox"]'))
        queueMicrotask(() => [...frames.keys()].forEach(deliver));
    };
    document.addEventListener("click", finishPendingFrame);
    try {
      const requests = mockRequests([]);
      const user = await setUp();
      expect(screen.getByText("Your homebuying plan")).toBeVisible();
      await user.click(screen.getByRole("button", { name: "Save and check" }));
      expect(requests.bodies).toHaveLength(1);
      expect(requests.bodies[0]).toEqual(expect.objectContaining({ publicationId }));
    } finally {
      document.removeEventListener("click", finishPendingFrame);
      [...frames.keys()].forEach((id) => window.clearTimeout(id));
      frames.clear();
    }
  });
  it("requires an explicit new-version choice before replacing an older retained request", async () => {
    const old = mockRequests([new Error("lost response")]),
      user = await setUp();
    await user.click(screen.getByRole("button", { name: "Save and check" }));
    await screen.findByRole("alert");
    const original = window.sessionStorage.getItem(WEBINAR_PENDING_KEY);
    cleanup();
    const recorded = webinarReviewFixture(),
      bodies: unknown[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (path: string, options?: RequestInit) => {
        if (options?.method === "GET")
          return Response.json(path.endsWith("/context") ? context : recorded.review);
        bodies.push(JSON.parse(String(options?.body)));
        return Response.json(saved);
      }),
    );
    render(
      <WebinarAdPreparation
        edit={{
          campaignRef: recorded.campaignRef,
          campaignVersionRef: recorded.campaignVersionRef,
        }}
      />,
    );
    await screen.findByRole("button", { name: "Start this new version instead" });
    expect(window.sessionStorage.getItem(WEBINAR_PENDING_KEY)).toBe(original);
    expect(bodies).toEqual([]);
    await user.click(screen.getByRole("button", { name: "Start this new version instead" }));
    await screen.findByLabelText("Facebook headline");
    expect(window.sessionStorage.getItem(WEBINAR_PENDING_KEY)).toBeNull();
    await user.click(screen.getByRole("combobox", { name: "Published webinar" }));
    await user.click(screen.getByRole("option", { name: "Your homebuying plan (Live)" }));
    await user.clear(screen.getByLabelText("Requested end date (UTC)"));
    await user.type(screen.getByLabelText("Requested end date (UTC)"), "2030-06-19");
    await user.click(screen.getByRole("button", { name: "Review setup" }));
    await user.click(screen.getByRole("button", { name: "Save and check" }));
    expect(bodies[0]).toEqual(
      expect.objectContaining({
        campaignRef: recorded.campaignRef,
        expectedCampaignVersionRef: recorded.campaignVersionRef,
      }),
    );
    expect((bodies[0] as { requestId: string }).requestId).not.toBe(
      (old.bodies[0] as { requestId: string }).requestId,
    );
  });
  it("keeps a conflicted retry instead of silently allocating a fresh save request", async () => {
    const requests = mockRequests([
        new Error("lost response"),
        Response.json({ error: "WEBINAR_VERSION_CONFLICT" }, { status: 409 }),
      ]),
      user = await setUp();
    await user.click(screen.getByRole("button", { name: "Save and check" }));
    await screen.findByRole("alert");
    await user.click(screen.getByRole("button", { name: "Retry this exact save" }));
    expect(screen.getByRole("button", { name: "Resolve the saved version first" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Edit setup" })).toBeDisabled();
    expect(screen.getByRole("link", { name: "Open Campaigns" })).toHaveAttribute(
      "href",
      "/marketing/campaigns",
    );
    expect(requests.bodies).toHaveLength(2);
    expect(requests.bodies[1]).toEqual(requests.bodies[0]);
    expect(window.sessionStorage.getItem(WEBINAR_PENDING_KEY)).not.toBeNull();
  });
  it("offers only a derived authenticated link when an incomplete append is confirmed", async () => {
    mockRequests([
      Response.json(
        {
          error: "WEBINAR_SAVE_INCOMPLETE",
          incompleteSave: true,
          campaignRef: saved.campaignRef,
          campaignVersionRef: saved.campaignVersionRef,
          detailHref: "https://foreign.test/",
        },
        { status: 503 },
      ),
    ]);
    const user = await setUp();
    await user.click(screen.getByRole("button", { name: "Save and check" }));
    expect(
      await screen.findByRole("link", { name: "Inspect the recorded campaign" }),
    ).toHaveAttribute("href", saved.detailHref);
  });
  it("restores an uncertain request after reload only for its authoritative owned publication", async () => {
    const requests = mockRequests([
        new Error("lost response"),
        Response.json({ ...saved, duplicate: true }),
      ]),
      user = await setUp();
    await user.click(screen.getByRole("button", { name: "Save and check" }));
    await screen.findByRole("alert");
    expect(window.sessionStorage.getItem(WEBINAR_PENDING_KEY)).not.toBeNull();
    cleanup();
    render(<WebinarAdPreparation />);
    await screen.findByText(
      "A previous save is awaiting confirmation. Retry this exact preparation to resolve its saved version before making changes.",
    );
    expect(requests.bodies).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Edit setup" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Retry this exact save" }));
    expect(requests.bodies[1]).toEqual(requests.bodies[0]);
    expect(window.sessionStorage.getItem(WEBINAR_PENDING_KEY)).toBeNull();
  });
  it("does not reveal or send retained copy when another account cannot own its publication", async () => {
    const requests = mockRequests([new Error("lost response")]),
      user = await setUp();
    await user.click(screen.getByRole("button", { name: "Save and check" }));
    await screen.findByRole("alert");
    cleanup();
    const other = mockRequests([], { ...context, destinations: [] });
    render(<WebinarAdPreparation />);
    expect(await screen.findByRole("alert")).toHaveTextContent("cannot be matched");
    expect(screen.queryByText("Your first home starts with a clear plan.")).toBeNull();
    expect(screen.queryByRole("button", { name: "Retry this exact save" })).toBeNull();
    expect(requests.bodies).toHaveLength(1);
    expect(other.bodies).toEqual([]);
  });
  it("rejects a malformed retained entry without leaking its text and requires explicit clearing", async () => {
    window.sessionStorage.setItem(
      WEBINAR_PENDING_KEY,
      JSON.stringify({ headline: "Old private text", reviewer: "injected" }),
    );
    const requests = mockRequests([]),
      user = userEvent.setup();
    render(<WebinarAdPreparation />);
    expect(await screen.findByRole("alert")).toHaveTextContent("could not be verified");
    expect(screen.queryByText("Old private text")).toBeNull();
    expect(requests.bodies).toEqual([]);
    await user.click(screen.getByRole("button", { name: "Clear invalid local retry" }));
    await screen.findByRole("button", { name: "Use this creative: Your first home, a clear plan" });
    expect(window.sessionStorage.getItem(WEBINAR_PENDING_KEY)).toBeNull();
    expect(requests.bodies).toEqual([]);
  });
  it("does not send a request if tab storage cannot preserve exact retry evidence", async () => {
    const requests = mockRequests([]),
      user = await setUp();
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Blocked", "SecurityError");
    });
    await user.click(screen.getByRole("button", { name: "Save and check" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Nothing was sent");
    expect(requests.bodies).toEqual([]);
  });
  it("saves a strict normalized request and navigates only to its derived saved detail", async () => {
    const requests = mockRequests([]),
      user = await setUp();
    await user.click(screen.getByRole("button", { name: "Save and check" }));
    expect(navigation.push).toHaveBeenCalledWith(saved.detailHref);
    expect(requests.bodies).toHaveLength(1);
    expect(requests.bodies[0]).toEqual(
      expect.objectContaining({
        templateId: "webinar-first-home-plan",
        publicationId,
        places: ["Austin, TX", "Texas"],
      }),
    );
    expect(Object.keys(requests.bodies[0] as object).sort()).toEqual(
      [
        "dailyBudgetDollars",
        "endsOn",
        "headline",
        "places",
        "primaryText",
        "publicationId",
        "requestId",
        "templateId",
        "templateVersion",
        "totalBudgetDollars",
      ].sort(),
    );
  });
  it.each(["network", "incomplete", "malformed"] as const)(
    "keeps exact UUID/body and locks edits after %s uncertainty",
    async (kind) => {
      const first =
        kind === "network"
          ? new Error("network")
          : kind === "incomplete"
            ? Response.json(
                {
                  error: "WEBINAR_SAVE_INCOMPLETE",
                  incompleteSave: true,
                  campaignRef: saved.campaignRef,
                  campaignVersionRef: saved.campaignVersionRef,
                },
                { status: 503 },
              )
            : Response.json({ ...saved, detailHref: "https://foreign.test/" });
      const requests = mockRequests([first, Response.json({ ...saved, duplicate: true })]),
        user = await setUp();
      await user.click(screen.getByRole("button", { name: "Save and check" }));
      expect(await screen.findByRole("alert")).toBeVisible();
      expect(screen.getByRole("button", { name: "Edit setup" })).toBeDisabled();
      expect(navigation.push).not.toHaveBeenCalled();
      await user.click(screen.getByRole("button", { name: "Retry this exact save" }));
      expect(requests.bodies).toHaveLength(2);
      expect(requests.bodies[1]).toEqual(requests.bodies[0]);
      expect(navigation.push).toHaveBeenCalledWith(saved.detailHref);
    },
  );
  it("allows corrected wording after definitive validation refusal with a fresh request", async () => {
    const requests = mockRequests([Response.json({ error: "WEBINAR_INVALID" }, { status: 400 })]),
      user = await setUp();
    await user.click(screen.getByRole("button", { name: "Save and check" }));
    await screen.findByRole("alert");
    expect(screen.getByRole("button", { name: "Edit setup" })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "Edit setup" }));
    await user.clear(screen.getByLabelText("Facebook headline"));
    await user.type(screen.getByLabelText("Facebook headline"), "Explore a clear plan");
    await user.click(screen.getByRole("button", { name: "Review setup" }));
    await user.click(screen.getByRole("button", { name: "Save and check" }));
    expect(requests.bodies).toHaveLength(2);
    expect(requests.bodies[1]).not.toEqual(requests.bodies[0]);
  });
  it("does not substitute sample identity or a private funnel when prerequisites are missing", async () => {
    const requests = mockRequests([], {
      ...context,
      brand: { ...context.brand, saved: false, band: { ...TEST_BAND, name: "" } },
      destinations: [],
    });
    const user = userEvent.setup();
    render(<WebinarAdPreparation />);
    await user.click(
      await screen.findByRole("button", {
        name: "Use this creative: Your first home, a clear plan",
      }),
    );
    expect(screen.getByText(/No active published webinar is available/)).toBeVisible();
    expect(screen.getByRole("link", { name: "Open Brand" })).toHaveAttribute("href", "/brand");
    expect(requests.bodies).toEqual([]);
    expect(screen.queryByText(TEST_BAND.name)).not.toBeInTheDocument();
  });
  it("shows field-linked validation before any mutation", async () => {
    const requests = mockRequests([]),
      user = userEvent.setup();
    render(<WebinarAdPreparation />);
    await user.click(
      await screen.findByRole("button", {
        name: "Use this creative: Your first home, a clear plan",
      }),
    );
    await user.clear(screen.getByLabelText("Facebook headline"));
    await user.click(screen.getByRole("button", { name: "Review setup" }));
    expect(screen.getByLabelText("Facebook headline")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent("Check the highlighted fields.");
    expect(requests.bodies).toEqual([]);
  });
  it("keeps a bad context response out of the editor and offers a real retry", async () => {
    mockRequests([], { ...context, providerEnabled: true });
    const user = userEvent.setup();
    render(<WebinarAdPreparation />);
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("could not be verified");
    expect(within(alert).queryByText(/providerEnabled/)).toBeNull();
    await user.click(screen.getByRole("button", { name: "Check availability again" }));
    expect(screen.queryByRole("button", { name: "Save and check" })).toBeNull();
  });
});
