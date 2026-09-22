import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { RouteError } from "./route-boundary.js";

describe("route error boundary projection", () => {
  it("preserves the safe state and invokes only the supplied idempotent reset", async () => {
    const user = userEvent.setup();
    const reset = vi.fn();
    const network = vi.fn();
    vi.stubGlobal("fetch", network);

    render(
      <RouteError
        error={Object.assign(new Error("fixture parse failed"), { digest: "syn-digest-001" })}
        reset={reset}
        routeName="Overview"
      />,
    );

    /**
     * PRD-006b D8. The reference support asks for is still here and is still the digest; it has
     * moved into the one collapsed region where a reference belongs, with a plain label.
     */
    expect(
      screen.getByText("We couldn't load this page. Nothing was changed."),
    ).toBeInTheDocument();
    expect(screen.getByText("Details for support")).toBeInTheDocument();
    expect(screen.getByText("Support reference")).toBeInTheDocument();
    expect(screen.getByText("syn-digest-001")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(reset).toHaveBeenCalledOnce();
    expect(network).not.toHaveBeenCalled();
  });
});
