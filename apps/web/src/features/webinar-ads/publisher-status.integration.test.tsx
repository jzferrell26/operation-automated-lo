import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WebinarPublisherStatus } from "./publisher-status.js";
import { publisherStatusFixture } from "./publisher-status.test-support.js";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
describe("webinar publishing progress", () => {
  it.each([
    { state: "pause_pending" as const, label: "Pause pending" },
    { state: "uncertain" as const, label: "Provider result unconfirmed" },
    { state: "cancelled" as const, label: "Command cancelled" },
  ])("shows $state without claiming a running ad stopped", async ({ state, label }) => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(Response.json(publisherStatusFixture({ state }))),
    );
    render(<WebinarPublisherStatus operationRef="publishop_status01" />);
    expect(await screen.findByRole("heading", { name: label })).toBeVisible();
    expect(screen.getByText(/does not establish that a running ad has stopped/)).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Reported paused" })).toBeNull();
  });
  it("reads privately once, labels a queue honestly and makes no provider or mutation request", async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json(publisherStatusFixture()));
    vi.stubGlobal("fetch", fetch);
    render(<WebinarPublisherStatus operationRef="publishop_status01" />);
    expect(await screen.findByRole("heading", { name: "Publication queued" })).toBeVisible();
    expect(screen.getByText("No provider observation recorded")).toBeVisible();
    expect(
      screen.getByText("The approved total is an estimate, not a guaranteed spending cap."),
    ).toBeVisible();
    expect(fetch).toHaveBeenCalledExactlyOnceWith(
      "/api/campaigns/webinar-ads/status/publishop_status01",
      { method: "GET", credentials: "same-origin", cache: "no-store", redirect: "error" },
    );
    expect(screen.queryByRole("button", { name: /launch|pause/i })).toBeNull();
  });
  it.each(["live", "paused", "in_review"] as const)(
    "never claims confirmed %s without an observation",
    async (state) => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(Response.json(publisherStatusFixture({ state }))),
      );
      render(<WebinarPublisherStatus operationRef="publishop_status01" />);
      expect(
        await screen.findByRole("heading", { name: "Awaiting provider confirmation" }),
      ).toBeVisible();
    },
  );
  it("shows an actual observation separately from the newer read time and clears details on failed refresh", async () => {
    const user = userEvent.setup();
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json(
          publisherStatusFixture({ state: "live", providerObservedAt: "2026-10-15T10:00:00.000Z" }),
        ),
      )
      .mockResolvedValueOnce(Response.json({ error: "UNAUTHENTICATED" }, { status: 401 }));
    vi.stubGlobal("fetch", fetch);
    render(<WebinarPublisherStatus operationRef="publishop_status01" />);
    expect(await screen.findByRole("heading", { name: "Reported live" })).toBeVisible();
    expect(screen.getByText("Oct 15, 2026, 10:00 AM UTC")).toHaveAttribute(
      "dateTime",
      "2026-10-15T10:00:00.000Z",
    );
    expect(screen.getByText("Oct 16, 2026, 12:00 PM UTC")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Check latest status" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Sign in again");
    expect(screen.queryByText("Example Lending account")).toBeNull();
    expect(screen.queryByRole("heading", { name: "Reported live" })).toBeNull();
  });
  it.each([{}, publisherStatusFixture({ operationRef: "publishop_foreign01" })])(
    "refuses malformed or mismatched successful bodies",
    async (value) => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(value)));
      render(<WebinarPublisherStatus operationRef="publishop_status01" />);
      expect(await screen.findByRole("alert")).toHaveTextContent("could not be verified");
      expect(screen.queryByText("Example Lending account")).toBeNull();
    },
  );
  it("ignores a late response from the previous operation", async () => {
    let finish: ((response: Response) => void) | undefined;
    const delayed = new Promise<Response>((resolve) => {
      finish = resolve;
    });
    const fetch = vi
      .fn()
      .mockReturnValueOnce(delayed)
      .mockResolvedValueOnce(
        Response.json(
          publisherStatusFixture({
            operationRef: "publishop_second01",
            headline: "Second operation",
          }),
        ),
      );
    vi.stubGlobal("fetch", fetch);
    const view = render(<WebinarPublisherStatus operationRef="publishop_status01" />);
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    view.rerender(<WebinarPublisherStatus operationRef="publishop_second01" />);
    expect(await screen.findByText("Second operation")).toBeVisible();
    finish?.(Response.json(publisherStatusFixture()));
    await waitFor(() => expect(screen.queryByText("Homebuying essentials")).toBeNull());
    expect(screen.getByText("Second operation")).toBeVisible();
  });
  it.each([404, 503])("clears status and offers a retry after HTTP %s", async (status) => {
    const user = userEvent.setup();
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ error: "private internal detail" }, { status }))
      .mockResolvedValueOnce(Response.json(publisherStatusFixture()));
    vi.stubGlobal("fetch", fetch);
    render(<WebinarPublisherStatus operationRef="publishop_status01" />);
    expect(await screen.findByRole("alert")).not.toHaveTextContent("private internal detail");
    await user.click(screen.getByRole("button", { name: "Check latest status" }));
    expect(await screen.findByRole("heading", { name: "Publication queued" })).toBeVisible();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
