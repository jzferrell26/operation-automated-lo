import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { projectCampaignWorkspace } from "@oalo/application";

import { createLocalSyntheticPrincipal } from "../../../server/authenticated-principal.js";
import {
  LOCAL_SYNTHETIC_ENV,
  OPEN_HOUSE_DRAFT_INPUT,
} from "../../../server/campaign-command-test-support.js";
import { compileOpenHouseDraft } from "../../../server/open-house-draft.js";
import { PersistedCampaignScreen } from "./persisted-campaign-screen.js";

describe("persisted campaign approval screen", () => {
  it("keeps approval unavailable for creators and shows evidence before enabling approvers", async () => {
    const compiled = await compileOpenHouseDraft(
      OPEN_HOUSE_DRAFT_INPUT,
      createLocalSyntheticPrincipal(),
      LOCAL_SYNTHETIC_ENV,
    );
    const record = {
      version: compiled.version,
      preflight: compiled.preflight,
      state: "awaiting_approval" as const,
      rowVersion: 1,
      updatedAt: compiled.version.createdAt,
    };
    const creatorView = projectCampaignWorkspace(
      record,
      createLocalSyntheticPrincipal(),
      "filesystem",
    );

    const { unmount } = render(<PersistedCampaignScreen campaign={creatorView} />);
    expect(
      screen.getByText(
        "Only a verified human with campaign_approver or location_admin may approve.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Approve this version" })).toBeDisabled();
    expect(screen.getByText(compiled.version.campaignVersionRef)).toBeInTheDocument();
    unmount();

    const approverView = projectCampaignWorkspace(
      record,
      {
        ...createLocalSyntheticPrincipal(),
        role: "campaign_approver",
        actorRef: "principal_localApprover001",
        actorId: "00000000-0000-4000-8000-000000000812",
      },
      "postgres",
    );
    render(<PersistedCampaignScreen campaign={approverView} />);
    expect(screen.getByRole("button", { name: "Approve this version" })).toBeEnabled();
    expect(screen.getByText(/Exact version/)).toBeInTheDocument();
    expect(screen.getByText(/Dallas-Fort Worth/)).toBeInTheDocument();
    expect(screen.getByText("Persisted tenant campaign record")).toBeInTheDocument();
  });
});
