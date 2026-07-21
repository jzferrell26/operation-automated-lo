import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { loadSyntheticBrandProfile } from "../model/synthetic-brand-profile.js";
import { BrandProfileScreen } from "./brand-profile-screen.js";

describe("Brand profile screen", () => {
  it("shows one canonical profile and the exact missing Open House Boost fields", () => {
    const { container } = render(<BrandProfileScreen profile={loadSyntheticBrandProfile()} />);

    expect(screen.getByRole("heading", { name: "Current canonical profile" })).toBeInTheDocument();
    expect(screen.getByText("brand-v3, current")).toBeInTheDocument();
    expect(container.querySelectorAll('[data-profile-field-state="missing"]')).toHaveLength(2);
    expect(screen.getByRole("heading", { name: "Equal Housing asset" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Florida license display" })).toBeInTheDocument();
  });

  it("requires explicit local acceptance and never performs a model or provider request", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    render(<BrandProfileScreen profile={loadSyntheticBrandProfile()} />);

    expect(screen.getByRole("status")).toHaveTextContent(
      "No AI suggestion has been accepted. The current canonical profile is unchanged.",
    );
    expect(screen.getByText("Approved spring newsletter")).toBeInTheDocument();
    expect(screen.getByText("Approved open-house invitation")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Never accepted from AI" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Accept Voice suggestion" }));

    expect(screen.getByRole("status")).toHaveTextContent(
      "1 suggestion accepted into the local profile draft. The current canonical profile is unchanged.",
    );
    expect(screen.getByRole("button", { name: "Accepted into local draft" })).toBeDisabled();
    expect(screen.getByText("brand-v3, current")).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
