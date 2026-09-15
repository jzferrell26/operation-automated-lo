import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { loadSyntheticUiFixture } from "../../ui-foundation/data/load-synthetic-ui.js";
import {
  OverviewEdgeStateMatrix,
  OverviewState,
  SafeRetryState,
} from "./overview-edge-state-matrix.js";
import { OverviewScreen } from "./overview-screen.js";
import { ProjectedSafeAction } from "./projected-safe-action.js";

describe("Platform Overview", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders tenant campaigns instead of the synthetic campaign fixture", () => {
    const fixture = loadSyntheticUiFixture();
    render(
      <OverviewScreen
        overview={fixture.overview}
        session={fixture.session}
        workspaceCampaigns={[]}
      />,
    );
    expect(screen.getByText("No campaigns in this location yet")).toBeInTheDocument();
    expect(screen.queryByText("Summer buyer education")).not.toBeInTheDocument();
  });

  it("renders every required region and source-bearing metric truth state", () => {
    const fixture = loadSyntheticUiFixture();
    render(<OverviewScreen overview={fixture.overview} session={fixture.session} />);

    for (const heading of [
      "Workspace health",
      "Quick actions",
      "Business Pulse",
      "Active Work",
      "Attention Queue",
      "Recent Activity",
      "Workspace Status",
    ]) {
      expect(screen.getByRole("heading", { name: heading })).toBeInTheDocument();
    }
    expect(screen.getAllByText("Synthetic data")).toHaveLength(8);
    expect(
      screen.getByText("Unavailable", { selector: ".oalo-metric__value" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Uncertain, reconciling").length).toBeGreaterThan(0);
    expect(screen.getByText("Synthetic HighLevel contact summary")).toBeInTheDocument();
    expect(screen.getByText("Observed 8 minutes ago")).toBeInTheDocument();
  });

  it("keeps consequential actions disabled with persistent reasons", () => {
    render(<ProjectedSafeAction label="Create marketing campaign" />);

    expect(screen.getByRole("button", { name: "Create marketing campaign" })).toBeDisabled();
    expect(
      screen.getByText("A separately authorized production provider path"),
    ).toBeInTheDocument();
    expect(screen.getByText("Platform Owner")).toBeInTheDocument();
    expect(screen.getByText("Review the synthetic projection only.")).toBeInTheDocument();
  });

  it("retries only the local safe read and performs no network request", async () => {
    const user = userEvent.setup();
    const network = vi.fn();
    vi.stubGlobal("fetch", network);
    render(<SafeRetryState state="safe_retry" />);

    await user.click(screen.getByRole("button", { name: "Retry safe read" }));

    expect(screen.getByText("Safe retry attempts: 1")).toBeInTheDocument();
    expect(network).not.toHaveBeenCalled();
  });

  it("renders restricted state semantics without protected values", () => {
    render(<OverviewState state="restricted_viewer" />);

    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Permission restricted");
    expect(status).toHaveTextContent("Owner or Agency User");
    expect(status).toHaveTextContent(
      "No protected values or cross-tenant placeholders are rendered.",
    );
  });

  it("renders all eleven edge states", () => {
    const { stateMatrix } = loadSyntheticUiFixture().overview;
    render(<OverviewEdgeStateMatrix states={stateMatrix} />);

    expect(document.querySelectorAll("[data-overview-state]")).toHaveLength(11);
  });
});
