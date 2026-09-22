import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { loadSyntheticBrandProfile } from "../model/synthetic-brand-profile.js";
import { BrandProfileScreen } from "./brand-profile-screen.js";

describe("Brand profile screen", () => {
  it("shows one set of saved details and the exact missing Open House Boost fields", () => {
    const { container } = render(<BrandProfileScreen profile={loadSyntheticBrandProfile()} />);

    expect(screen.getByRole("heading", { name: "Your current details" })).toBeInTheDocument();
    // PRD-006b D5 and D8. The badge says which set is current; the version reference it used to
    // print now sits under "Details for support" with a plain label.
    expect(screen.getByText("Current")).toBeInTheDocument();
    expect(screen.getByText("Version ID")).toBeInTheDocument();
    expect(screen.getByText("brand-v3")).toBeInTheDocument();
    expect(container.querySelectorAll('[data-profile-field-state="missing"]')).toHaveLength(2);
    expect(screen.getByRole("heading", { name: "Equal Housing asset" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Florida license display" })).toBeInTheDocument();
  });

  it("requires explicit local acceptance and never performs a model or provider request", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    render(<BrandProfileScreen profile={loadSyntheticBrandProfile()} />);

    expect(screen.getByRole("status")).toHaveTextContent("Nothing saved from a suggestion yet.");
    expect(screen.getByText("Approved spring newsletter")).toBeInTheDocument();
    expect(screen.getByText("Approved open-house invitation")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "We never suggest these" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Use this for Voice" }));

    expect(screen.getByRole("status")).toHaveTextContent(
      "1 suggestion added to your draft. Your saved details haven't changed.",
    );
    expect(screen.getByRole("button", { name: "Added to your draft" })).toBeDisabled();
    expect(screen.getByText("Current")).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
