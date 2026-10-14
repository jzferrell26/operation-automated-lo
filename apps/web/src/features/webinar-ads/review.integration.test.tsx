import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { webinarReviewFixture } from "./review.test-support.js";
import type { WebinarAdCampaignPage } from "../campaigns/campaign-page-model.js";
import { WebinarAdReviewScreen } from "./review.js";
const navigation = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation.js", () => ({ useRouter: () => navigation }));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});
const fixture = async (): Promise<WebinarAdCampaignPage> => webinarReviewFixture();
describe("frozen webinar review", () => {
  it("does not announce approval or refresh after a malformed successful decision response", async () => {
    const page = await fixture(),
      user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(Response.json({ decision: "invented", duplicate: false })),
    );
    render(<WebinarAdReviewScreen page={page} />);
    await user.click(screen.getByRole("button", { name: "Approve this version" }));
    await user.click(screen.getByRole("button", { name: "Yes, approve" }));
    expect(navigation.refresh).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Approve this version" })).toBeVisible();
    expect(screen.getByText("You have not recorded a decision on this version.")).toBeVisible();
  });
  it("shows both exact private images, separate copy, exact UTC stop and disabled launch", async () => {
    const page = await fixture();
    render(<WebinarAdReviewScreen page={page} />);
    expect(screen.getAllByRole("img").map((image) => image.getAttribute("src"))).toEqual([
      page.review.art.tall,
      page.review.art.square,
    ]);
    expect(screen.getByRole("link", { name: "Download tall branded PNG" })).toHaveAttribute(
      "href",
      page.review.art.tall,
    );
    expect(screen.getByRole("link", { name: "Download square branded PNG" })).toHaveAttribute(
      "href",
      page.review.art.square,
    );
    expect(screen.getByRole("button", { name: "Launch unavailable" })).toBeDisabled();
    expect(screen.getByText("Oct 12, 2026, 6:00 PM UTC")).toBeVisible();
    expect(screen.getByText(/illustrated lettering stays original/)).toBeVisible();
    expect(screen.queryByText(/workspace owner|team assignment|role settings/i)).toBeNull();
  });
  it("approves through the shared real command with all saved concurrency evidence", async () => {
    const page = await fixture(),
      user = userEvent.setup(),
      fetch = vi.fn().mockResolvedValue(Response.json({ decision: "approved", duplicate: false }));
    vi.stubGlobal("fetch", fetch);
    render(<WebinarAdReviewScreen page={page} />);
    await user.click(screen.getByRole("button", { name: "Approve this version" }));
    expect(screen.getByRole("alertdialog")).toHaveTextContent(
      "This does not publish an ad or spend money.",
    );
    await user.click(screen.getByRole("button", { name: "Yes, approve" }));
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(JSON.parse(String(fetch.mock.calls[0]?.[1]?.body))).toEqual({
      campaignRef: page.campaignRef,
      decision: "approved",
      expectedCampaignVersionRef: page.campaignVersionRef,
      expectedManifestHash: page.approvalControls?.manifestHash,
      expectedPreflightResultHash: page.approvalControls?.preflightResultHash,
      expectedRowVersion: 1,
    });
    expect(navigation.refresh).toHaveBeenCalledTimes(1);
  });
  it.each([
    "WEBINAR_DESTINATION_EXPIRED",
    "WEBINAR_SOURCE_CHANGED",
    "WEBINAR_RASTER_CHANGED",
  ] as const)("retains historic pixels but suppresses decisions after %s", async (error) => {
    const page = await fixture();
    render(
      <WebinarAdReviewScreen
        page={{ ...page, review: { ...page.review, current: { available: false, error } } }}
      />,
    );
    expect(screen.getByRole("alert")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Approve this version" })).toBeNull();
    expect(screen.getAllByRole("img")).toHaveLength(2);
    expect(screen.getByRole("link", { name: "Prepare a new version" })).toHaveAttribute(
      "href",
      expect.stringContaining("version="),
    );
  });
  it("records send-back with no invented reviewer and does not carry approval into edits", async () => {
    const page = await fixture(),
      user = userEvent.setup(),
      fetch = vi.fn().mockResolvedValue(Response.json({ decision: "rejected" }));
    vi.stubGlobal("fetch", fetch);
    render(<WebinarAdReviewScreen page={page} />);
    await user.click(screen.getByRole("button", { name: "Send back for changes" }));
    expect(JSON.parse(String(fetch.mock.calls[0]?.[1]?.body)).decision).toBe("rejected");
    expect(screen.getByRole("link", { name: "Prepare a new version" })).toHaveAttribute(
      "href",
      expect.stringContaining(page.campaignVersionRef),
    );
  });
  it("says an incomplete saved check is unfinished and offers no approval", async () => {
    const page = await fixture();
    render(
      <WebinarAdReviewScreen
        page={{
          ...page,
          review: {
            ...page.review,
            current: { available: false, error: "WEBINAR_SAVE_INCOMPLETE" },
            incompleteSave: true,
          },
        }}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("retry the exact save");
    expect(screen.queryByRole("button", { name: "Approve this version" })).toBeNull();
  });
  it("copies only the exact frozen wording and destination", async () => {
    const page = await fixture(),
      user = userEvent.setup(),
      clipboard = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
    render(<WebinarAdReviewScreen page={page} />);
    await user.click(screen.getByRole("button", { name: "Copy saved Facebook words" }));
    expect(clipboard).toHaveBeenCalledWith(
      [
        page.review.manifest.content.headline,
        page.review.manifest.content.body,
        "Learn more",
        page.review.manifest.destination.publicUrl,
        page.review.manifest.content.disclosureText,
      ].join("\n\n"),
    );
  });
});
