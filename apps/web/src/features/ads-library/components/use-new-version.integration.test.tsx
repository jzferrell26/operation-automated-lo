import { render, screen, waitFor, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { NEWER_VERSION_NOTICE } from "../../../copy/ads-library-messages.js";
import type { NewerVersionOffer } from "../newer-version.js";
import { UseNewVersion } from "./use-new-version.js";

/**
 * PRD-009c D4, 009C-AC-009. "Use the new version", the component the campaign page mounts: shown
 * only for a version nobody has decided on, asking before it replaces the person's words, and then
 * saving a new campaign version on the newer ad version.
 */

const mocked = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation.js", () => ({ useRouter: () => ({ push: mocked.push }) }));

const OFFER: NewerVersionOffer = Object.freeze({
  campaignRef: "campaign_0123456789abcdef0123456789abcdef",
  ad: Object.freeze({ id: "sample-first-home", name: "Sample: First home, start here" }),
  fromVersion: 1,
  toVersion: 2,
  newWords: Object.freeze({
    headline: "Thinking about your first home? Start here.",
    primaryText: "I walk first-time buyers through each step. Send me a message.",
  }),
  kept: Object.freeze({
    dailyBudgetDollars: 40,
    totalBudgetDollars: 600,
    endsOn: "2099-03-04",
    places: Object.freeze(["TX", "Austin, TX"]),
  }),
  undecided: true,
});

/** Answers the one save request the component makes, and says what was asked. */
function stubSave(body: unknown = { campaignRef: OFFER.campaignRef }, status = 200) {
  const fetch = vi.fn(() => Promise.resolve(Response.json(body, { status })));
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

beforeEach(() => mocked.push.mockReset());
afterEach(() => vi.unstubAllGlobals());

describe("when it is offered", () => {
  it("says a newer version is in the library and offers the action for an undecided version", () => {
    render(<UseNewVersion canUse offer={OFFER} />);

    expect(screen.getByText(NEWER_VERSION_NOTICE)).toBeInTheDocument();
    expect(NEWER_VERSION_NOTICE).toBe("A newer version of this ad is in the library.");
    expect(screen.getByRole("button", { name: "Use the new version" })).toBeEnabled();
  });

  it("is only a notice for a version somebody decided on", () => {
    render(<UseNewVersion canUse offer={{ ...OFFER, undecided: false }} />);

    expect(screen.getByText(NEWER_VERSION_NOTICE)).toBeInTheDocument();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("is only a notice for a person who cannot save a campaign version", () => {
    render(<UseNewVersion canUse={false} offer={OFFER} />);

    expect(screen.getByText(NEWER_VERSION_NOTICE)).toBeInTheDocument();
    expect(screen.queryByRole("button")).toBeNull();
  });
});

describe("asking first", () => {
  it("says what it replaces and what it keeps, and sends nothing until the person says yes", async () => {
    const fetch = stubSave();
    const user = userEvent.setup();
    render(<UseNewVersion canUse offer={OFFER} />);

    await user.click(screen.getByRole("button", { name: "Use the new version" }));

    const ask = screen.getByRole("alertdialog", { name: "Use the new version of this ad?" });
    expect(ask).toHaveTextContent("Your headline and ad text are replaced with the newer words.");
    expect(ask).toHaveTextContent("Your budget, dates and area are kept.");
    expect(ask).toHaveTextContent("The version you have now stays as it is.");
    expect(fetch).not.toHaveBeenCalled();
    expect(mocked.push).not.toHaveBeenCalled();
  });

  it("sends nothing when the person cancels", async () => {
    const fetch = stubSave();
    const user = userEvent.setup();
    render(<UseNewVersion canUse offer={OFFER} />);

    await user.click(screen.getByRole("button", { name: "Use the new version" }));
    await user.click(
      within(screen.getByRole("alertdialog")).getByRole("button", { name: "Cancel" }),
    );

    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
    expect(mocked.push).not.toHaveBeenCalled();
  });
});

describe("saving the new version", () => {
  it("saves a new campaign version on the newer ad version, with the newer words and the old budget, dates, and area, then opens it for review", async () => {
    const fetch = stubSave({ campaignRef: OFFER.campaignRef });
    const user = userEvent.setup();
    render(<UseNewVersion canUse offer={OFFER} />);

    await user.click(screen.getByRole("button", { name: "Use the new version" }));
    await user.click(screen.getByRole("button", { name: "Yes, use the new version" }));

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    const calls = fetch.mock.calls as unknown as Array<[string, RequestInit]>;
    const [path, init] = calls[0] ?? ["", {}];
    expect(path).toBe("/api/campaigns/preflight");
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({
      adId: "sample-first-home",
      adVersion: 2,
      campaignRef: OFFER.campaignRef,
      headline: OFFER.newWords.headline,
      primaryText: OFFER.newWords.primaryText,
      endsOn: "2099-03-04",
      dailyBudgetDollars: 40,
      totalBudgetDollars: 600,
      places: ["TX", "Austin, TX"],
    });
    await waitFor(() =>
      expect(mocked.push).toHaveBeenCalledWith(
        `/marketing/campaigns/new?step=3&campaign=${OFFER.campaignRef}`,
      ),
    );
  });

  it("sends no brand, title, company, NMLS number, disclosure, or lead form field: the server reads those from saved Brand", async () => {
    const fetch = stubSave();
    const user = userEvent.setup();
    render(<UseNewVersion canUse offer={OFFER} />);

    await user.click(screen.getByRole("button", { name: "Use the new version" }));
    await user.click(screen.getByRole("button", { name: "Yes, use the new version" }));

    await waitFor(() => expect(fetch).toHaveBeenCalled());
    const calls = fetch.mock.calls as unknown as Array<[string, RequestInit]>;
    const sent = Object.keys(JSON.parse(String(calls[0]?.[1].body)) as object).sort();
    expect(sent).toEqual([
      "adId",
      "adVersion",
      "campaignRef",
      "dailyBudgetDollars",
      "endsOn",
      "headline",
      "places",
      "primaryText",
      "totalBudgetDollars",
    ]);
  });

  it("says when the save was refused, and opens nothing", async () => {
    stubSave({ error: "LIBRARY_AD_NOT_AVAILABLE" }, 400);
    const user = userEvent.setup();
    render(<UseNewVersion canUse offer={OFFER} />);

    await user.click(screen.getByRole("button", { name: "Use the new version" }));
    await user.click(screen.getByRole("button", { name: "Yes, use the new version" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("We couldn't save the new version. Nothing was saved.");
    expect(alert).toHaveTextContent("This ad isn't in the library any more");
    expect(mocked.push).not.toHaveBeenCalled();
  });

  it("says when nothing answered, and opens nothing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("network down");
      }),
    );
    const user = userEvent.setup();
    render(<UseNewVersion canUse offer={OFFER} />);

    await user.click(screen.getByRole("button", { name: "Use the new version" }));
    await user.click(screen.getByRole("button", { name: "Yes, use the new version" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "We couldn't save the new version. Nothing was saved.",
    );
    expect(mocked.push).not.toHaveBeenCalled();
  });
});
