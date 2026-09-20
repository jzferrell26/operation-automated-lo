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

// Under a loaded integration run this file's renders can exceed the 5s project default; give it
// real headroom here rather than raising the default for every other suite.
vi.setConfig({ testTimeout: 20000 });

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
    expect(screen.getByText("No campaigns yet")).toBeInTheDocument();
    expect(screen.queryByText("Summer buyer education")).not.toBeInTheDocument();
  });

  it("renders every required region and source-bearing metric truth state", () => {
    const fixture = loadSyntheticUiFixture();
    render(<OverviewScreen overview={fixture.overview} session={fixture.session} />);

    for (const heading of [
      "How things stand",
      "Quick actions",
      "Your numbers",
      "What you have going on",
      "Needs your attention",
      "What happened lately",
      "Your workspace",
    ]) {
      expect(screen.getByRole("heading", { name: heading })).toBeInTheDocument();
    }
    // PRD-006b D4 and D5. The `synthetic` prop keeps its meaning, which is that the value is not a
    // live reading; the row now says that in words a loan officer uses.
    expect(screen.getAllByText("Not live data")).toHaveLength(8);
    expect(
      screen.getByText("Unavailable", { selector: ".oalo-metric__value" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Uncertain, reconciling").length).toBeGreaterThan(0);
    expect(screen.getByText("Synthetic HighLevel contact summary")).toBeInTheDocument();
    expect(screen.getByText("Observed 8 minutes ago")).toBeInTheDocument();
  });

  it("keeps consequential actions disabled with persistent reasons", () => {
    render(<ProjectedSafeAction label="Create an Open House Boost" />);

    expect(screen.getByRole("button", { name: "Create an Open House Boost" })).toBeDisabled();
    expect(
      screen.getByText("HighLevel, Meta, and Stripe connected to your workspace"),
    ).toBeInTheDocument();
    expect(screen.getByText("Automated LO")).toBeInTheDocument();
    expect(screen.getByText("Connect your accounts when you're ready.")).toBeInTheDocument();
  });

  it("retries only the local safe read and performs no network request", async () => {
    const user = userEvent.setup();
    const network = vi.fn();
    vi.stubGlobal("fetch", network);
    render(<SafeRetryState state="safe_retry" />);

    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(screen.getByText("Tries: 1")).toBeInTheDocument();
    expect(network).not.toHaveBeenCalled();
  });

  it("renders restricted state semantics without protected values", () => {
    render(<OverviewState state="restricted_viewer" />);

    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("No access");
    expect(status).toHaveTextContent("A workspace owner");
    expect(status).toHaveTextContent(
      "Nothing from another workspace is shown here, and nothing is guessed at.",
    );
  });

  it("renders all eleven edge states", () => {
    const { stateMatrix } = loadSyntheticUiFixture().overview;
    render(<OverviewEdgeStateMatrix states={stateMatrix} />);

    expect(document.querySelectorAll("[data-overview-state]")).toHaveLength(11);
  });
});
