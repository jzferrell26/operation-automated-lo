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
        routeName="Platform Overview"
      />,
    );

    expect(screen.getByText("Frozen synthetic fixture remains unchanged")).toBeInTheDocument();
    expect(screen.getByText("syn-digest-001")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Retry safe read" }));
    expect(reset).toHaveBeenCalledOnce();
    expect(network).not.toHaveBeenCalled();
  });
});
