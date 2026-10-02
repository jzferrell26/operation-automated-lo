import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { UseNewVersionRequest } from "../campaign-page-model.js";
import { UseNewVersion } from "./use-new-version.js";

/**
 * PRD-009c D4 and 009C-AC-009. "Use the new version" asks before it replaces the person's words,
 * then saves a new version of the same campaign on the new library ad version through the one save
 * route "Launch an ad" uses, and opens step 3 for it.
 */

const mocked = vi.hoisted(() => ({ push: vi.fn(), post: vi.fn() }));
vi.mock("next/navigation.js", () => ({
  useRouter: () => ({ push: mocked.push, refresh: vi.fn() }),
}));
vi.mock("../../http/internal-api.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../http/internal-api.js")>()),
  postInternalJson: mocked.post,
}));

const REQUEST: UseNewVersionRequest = {
  campaignRef: "campaign_01LibraryPage",
  adId: "sample-first-home",
  adVersion: 2,
  headline: "Thinking about your first home? Start here.",
  primaryText: "I walk first-time buyers through each step.",
  endsOn: "2099-10-20",
  dailyBudgetDollars: 25,
  totalBudgetDollars: 350,
  places: ["TX", "Austin, TX"],
};

afterEach(() => {
  mocked.push.mockReset();
  mocked.post.mockReset();
});

describe("the Use the new version action", () => {
  it("is one button until it is pressed, and posts nothing", () => {
    render(<UseNewVersion request={REQUEST} />);

    expect(screen.getByRole("button", { name: "Use the new version" })).toBeInTheDocument();
    expect(mocked.post).not.toHaveBeenCalled();
  });

  it("asks first, saying what is replaced and what is kept", async () => {
    const user = userEvent.setup();
    render(<UseNewVersion request={REQUEST} />);

    await user.click(screen.getByRole("button", { name: "Use the new version" }));

    expect(
      screen.getByText(
        "Use the new version of this ad? Your headline and ad text are replaced with the new version's words. Your budget, dates and area are kept.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Yes, use the new version" })).toBeEnabled();
    expect(mocked.post).not.toHaveBeenCalled();
  });

  it("goes back to the single button when the person cancels, and posts nothing", async () => {
    const user = userEvent.setup();
    render(<UseNewVersion request={REQUEST} />);
    await user.click(screen.getByRole("button", { name: "Use the new version" }));

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.getByRole("button", { name: "Use the new version" })).toBeInTheDocument();
    expect(screen.queryByText(/Your headline and ad text are replaced/u)).toBeNull();
    expect(mocked.post).not.toHaveBeenCalled();
  });

  it("saves a new version of the same campaign with exactly the request's fields, then opens step 3", async () => {
    mocked.post.mockResolvedValue(Response.json({ campaignRef: REQUEST.campaignRef }));
    const user = userEvent.setup();
    render(<UseNewVersion request={REQUEST} />);
    await user.click(screen.getByRole("button", { name: "Use the new version" }));

    await user.click(screen.getByRole("button", { name: "Yes, use the new version" }));

    await waitFor(() => {
      expect(mocked.push).toHaveBeenCalledWith(
        "/marketing/campaigns/new?step=3&campaign=campaign_01LibraryPage&from=campaigns",
      );
    });
    expect(mocked.post).toHaveBeenCalledTimes(1);
    expect(mocked.post).toHaveBeenCalledWith("/api/campaigns/preflight", {
      adId: "sample-first-home",
      adVersion: 2,
      campaignRef: "campaign_01LibraryPage",
      headline: "Thinking about your first home? Start here.",
      primaryText: "I walk first-time buyers through each step.",
      endsOn: "2099-10-20",
      dailyBudgetDollars: 25,
      totalBudgetDollars: 350,
      places: ["TX", "Austin, TX"],
    });
  });

  it("says nothing was saved, and stays, when the save is refused", async () => {
    mocked.post.mockResolvedValue(
      Response.json({ error: "LIBRARY_AD_NOT_AVAILABLE" }, { status: 409 }),
    );
    const user = userEvent.setup();
    render(<UseNewVersion request={REQUEST} />);
    await user.click(screen.getByRole("button", { name: "Use the new version" }));

    await user.click(screen.getByRole("button", { name: "Yes, use the new version" }));

    const status = await screen.findByRole("status");
    expect(status).toHaveTextContent("We couldn't save this version. Nothing was saved.");
    expect(mocked.push).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Yes, use the new version" })).toBeEnabled();
  });

  it("says nothing was saved when the request never reaches the server", async () => {
    mocked.post.mockRejectedValue(new TypeError("network"));
    const user = userEvent.setup();
    render(<UseNewVersion request={REQUEST} />);
    await user.click(screen.getByRole("button", { name: "Use the new version" }));

    await user.click(screen.getByRole("button", { name: "Yes, use the new version" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Nothing was saved.");
    expect(mocked.push).not.toHaveBeenCalled();
  });

  it("keeps its buttons disabled while the save is under way", async () => {
    let finish: (response: Response) => void = () => undefined;
    mocked.post.mockReturnValue(
      new Promise<Response>((resolve) => {
        finish = resolve;
      }),
    );
    const user = userEvent.setup();
    render(<UseNewVersion request={REQUEST} />);
    await user.click(screen.getByRole("button", { name: "Use the new version" }));
    await user.click(screen.getByRole("button", { name: "Yes, use the new version" }));

    expect(screen.getByRole("button", { name: "Saving the new version" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    finish(Response.json({ campaignRef: REQUEST.campaignRef }));
    await waitFor(() => {
      expect(mocked.push).toHaveBeenCalled();
    });
  });
});
