import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import ReportsPage from "./page.js";

function stubWorkspaceEnvironment(environment: string, reviewSurface: string | undefined): void {
  vi.stubEnv("OALO_ENVIRONMENT", environment);
  vi.stubEnv("OALO_PROVIDER_MODE", "stub");
  vi.stubEnv("OALO_SYNTHETIC_DATA_ONLY", "true");
  vi.stubEnv("OALO_REVIEW_SURFACE", reviewSurface);
}

describe("authenticated reports route", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("reports spend and leads as not connected on the review surface", () => {
    stubWorkspaceEnvironment("production", "authorized");

    const { container } = render(<ReportsPage />);
    const values = [...container.querySelectorAll(".oalo-metric__value")].map(
      (element) => element.textContent ?? "",
    );

    expect(screen.getByRole("article", { name: "Spend" })).toBeInTheDocument();
    expect(screen.getByRole("article", { name: "Leads" })).toBeInTheDocument();
    expect(values.length).toBeGreaterThan(0);
    expect(values.every((value) => value === "Not connected")).toBe(true);
    expect(container.textContent).not.toContain("USD 74.25");
  });

  it("keeps the synthetic reporting projection for local development", () => {
    stubWorkspaceEnvironment("local", undefined);

    const { container } = render(<ReportsPage />);

    expect(container.textContent).toContain("USD 74.25");
  });
});
