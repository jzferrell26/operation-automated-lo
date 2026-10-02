import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { OWNER, libraryCampaign, pageOf } from "../../../../server/campaign-page.test-support.js";
import { CampaignWorkspaceStoreUnavailableError } from "../../../../server/campaign-persistence-runtime.js";
import { useReviewModeEnvironment } from "../../review-mode-test-support.js";
import CampaignPage from "./[campaignRef]/page.js";
import CampaignVersionPage from "./[campaignRef]/versions/[versionNo]/page.js";

/**
 * PRD-009e D3 and 009E-AC-005. The campaign's own address and an older version's address. An older
 * version's number must be a positive integer, and a number that is not, a version the campaign
 * never had, and every version of a campaign in another location all answer "not found", exactly as
 * an unknown reference does. The reads are the one thing mocked; `campaign-page-reads.postgres.test.ts`
 * proves what they return under tenant context.
 */

const mocked = vi.hoisted(() => ({ read: vi.fn() }));
vi.mock("next/headers.js", () => ({ headers: () => Promise.resolve(new Headers()) }));
vi.mock("next/navigation.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation.js")>()),
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));
vi.mock("../../../../server/campaign-workspace-reads.js", () => ({
  readWorkspaceCampaignForRequest: mocked.read,
}));

const NOT_FOUND = { digest: "NEXT_HTTP_ERROR_FALLBACK;404" };

useReviewModeEnvironment();
afterEach(() => mocked.read.mockReset());

function versionParams(versionNo: string) {
  return { params: Promise.resolve({ campaignRef: "campaign_01LibraryPage", versionNo }) };
}

describe("an older version's address (009E-AC-005)", () => {
  it.each(["0", "-1", "1.5", "01", "abc", "", " 1", "1 ", "1e3", "1000000", "0x1"])(
    "answers not found for the version number %j, without reading anything",
    async (typed) => {
      await expect(CampaignVersionPage(versionParams(typed))).rejects.toMatchObject(NOT_FOUND);

      expect(mocked.read).not.toHaveBeenCalled();
    },
  );

  it.each(["1", "2", "9", "10", "999999"])(
    "reads version %s as that positive integer, under the same reference",
    async (typed) => {
      mocked.read.mockResolvedValue({ authenticated: true, campaign: undefined });

      await expect(CampaignVersionPage(versionParams(typed))).rejects.toMatchObject(NOT_FOUND);

      expect(mocked.read).toHaveBeenCalledWith(
        expect.any(Request),
        "campaign_01LibraryPage",
        process.env,
        Number(typed),
      );
    },
  );

  it("answers not found for a version, a campaign, or another location's campaign the read does not return", async () => {
    mocked.read.mockResolvedValue({ authenticated: true, campaign: undefined });

    await expect(CampaignVersionPage(versionParams("3"))).rejects.toMatchObject(NOT_FOUND);
    await expect(
      CampaignPage({ params: Promise.resolve({ campaignRef: "campaign_neverSavedAnywhere001" }) }),
    ).rejects.toMatchObject(NOT_FOUND);
  });

  it("sends a visitor with no session to sign in rather than saying the version is gone", async () => {
    mocked.read.mockResolvedValue({ authenticated: false, campaign: undefined });

    await expect(CampaignVersionPage(versionParams("1"))).rejects.toMatchObject({
      digest: expect.stringContaining("/sign-in"),
    });
  });

  it("sends the newest version's number to the campaign's own address", async () => {
    mocked.read.mockResolvedValue({
      authenticated: true,
      campaign: { kind: "redirect", href: "/marketing/campaigns/campaign_01LibraryPage" },
    });

    await expect(CampaignVersionPage(versionParams("2"))).rejects.toMatchObject({
      digest: expect.stringContaining("/marketing/campaigns/campaign_01LibraryPage"),
    });
    await expect(
      CampaignPage({ params: Promise.resolve({ campaignRef: "campaign_01LibraryPage" }) }),
    ).rejects.toMatchObject({
      digest: expect.stringContaining("/marketing/campaigns/campaign_01LibraryPage"),
    });
  });

  it("draws an older version read-only when the read returns it", async () => {
    const campaign = await libraryCampaign({ olderVersions: [{ decision: "rejected" }] });
    const page = await pageOf(campaign, { principal: OWNER, versionNo: 1 });
    mocked.read.mockResolvedValue({ authenticated: true, campaign: { kind: "page", page } });

    render(await CampaignVersionPage(versionParams("1")));

    expect(screen.getByText(/You're looking at an older version/u)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Approve this version" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Launch on Facebook" })).toBeNull();
  });
});

describe("the campaign's own address", () => {
  it("draws the page the read returns", async () => {
    const page = await pageOf(await libraryCampaign(), { principal: OWNER });
    mocked.read.mockResolvedValue({ authenticated: true, campaign: { kind: "page", page } });

    render(
      await CampaignPage({ params: Promise.resolve({ campaignRef: "campaign_01LibraryPage" }) }),
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "Sample: First home, start here" }),
    ).toBeInTheDocument();
  });

  it("lets a store that is down reach the error boundary rather than saying the campaign is gone", async () => {
    mocked.read.mockRejectedValue(new CampaignWorkspaceStoreUnavailableError());

    await expect(
      CampaignPage({ params: Promise.resolve({ campaignRef: "campaign_01LibraryPage" }) }),
    ).rejects.toBeInstanceOf(CampaignWorkspaceStoreUnavailableError);
  });

  it("says the campaign is gone when the read fails for any other reason", async () => {
    mocked.read.mockRejectedValue(new Error("a malformed reference"));

    await expect(
      CampaignPage({ params: Promise.resolve({ campaignRef: "x" }) }),
    ).rejects.toMatchObject(NOT_FOUND);
  });
});
