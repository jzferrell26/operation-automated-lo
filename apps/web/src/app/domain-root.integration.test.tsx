import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import HomePage from "./page.js";
const mocks = vi.hoisted(() => ({
  destination: vi.fn(),
  review: vi.fn(),
  preview: vi.fn(),
  headers: vi.fn(),
}));
vi.mock("next/headers.js", () => ({ headers: mocks.headers }));
vi.mock("next/navigation.js", () => ({
  redirect: (path: string) => {
    throw new Error(`redirect:${path}`);
  },
  notFound: () => {
    throw new Error("not-found");
  },
}));
vi.mock("../server/funnel-domain-routing.js", () => ({ domainRootDestination: mocks.destination }));
vi.mock("../server/authenticated-workspace-data.js", () => ({
  canRenderReviewSurface: mocks.review,
}));
vi.mock("../server/dashboard-preview.js", () => ({ canRenderDashboardPreview: mocks.preview }));
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("OALO_APP_URL", "https://platform.example.org");
  mocks.headers.mockResolvedValue(
    new Headers({ host: "learn.example.org", "x-forwarded-host": "platform.example.org" }),
  );
  mocks.review.mockReturnValue(true);
});
afterEach(() => vi.unstubAllEnvs());
describe("root server page host isolation", () => {
  it("opens only the resolved public path on a customer host, even with a workspace session", async () => {
    mocks.destination.mockResolvedValue({
      kind: "customer",
      path: "/f/12345678-1234-4123-8123-123456789abc",
    });
    await expect(HomePage()).rejects.toThrow("redirect:/f/12345678-1234-4123-8123-123456789abc");
    expect(mocks.destination).toHaveBeenCalledWith("learn.example.org", process.env);
    expect(mocks.review).not.toHaveBeenCalled();
  });
  it("never falls back to the private overview for unknown or refused customer destinations", async () => {
    mocks.destination.mockResolvedValue({ kind: "customer", path: null });
    await expect(HomePage()).rejects.toThrow("not-found");
    mocks.destination.mockRejectedValue(new Error("unavailable"));
    await expect(HomePage()).rejects.toThrow("not-found");
    expect(mocks.review).not.toHaveBeenCalled();
  });
  it("preserves the platform overview and local-demo entry points", async () => {
    mocks.destination.mockResolvedValue({ kind: "platform" });
    await expect(HomePage()).rejects.toThrow("redirect:/overview");
    vi.stubEnv("OALO_APP_URL", "");
    mocks.review.mockReturnValue(false);
    expect((await HomePage()).type).toBe("main");
  });
});
