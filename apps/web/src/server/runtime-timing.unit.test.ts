import { afterEach, describe, expect, it, vi } from "vitest";

import { observeRuntimeStage, runtimePoolObserver } from "./runtime-timing.js";

afterEach(() => vi.restoreAllMocks());

describe("allowlisted runtime timing", () => {
  it.each([
    undefined,
    {},
    { OALO_RUNTIME_TIMING_DIAGNOSTICS: false },
    { OALO_RUNTIME_TIMING_DIAGNOSTICS: "false" },
    { OALO_RUNTIME_TIMING_DIAGNOSTICS: "TRUE" },
  ])("is silent without exact opt-in: %j", async (environment) => {
    const sink = vi.spyOn(console, "info").mockImplementation(() => undefined);
    expect(await observeRuntimeStage(environment, "principal", async () => "private result")).toBe(
      "private result",
    );
    expect(sink).not.toHaveBeenCalled();
  });

  it("logs only fixed stage, outcome and bounded timing, preserving original failures", async () => {
    const sink = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const environment = { OALO_RUNTIME_TIMING_DIAGNOSTICS: "true", SECRET: "private" };
    const error = new Error("token, email, SQL and session must not appear");
    await expect(
      observeRuntimeStage(environment, "principal", async () => {
        throw error;
      }),
    ).rejects.toBe(error);
    expect(sink).toHaveBeenCalledTimes(2);
    expect(sink.mock.calls.map((call) => call[1])).toEqual([
      { stage: "principal", outcome: "started", elapsedMilliseconds: 0 },
      { stage: "principal", outcome: "failed", elapsedMilliseconds: expect.any(Number) },
    ]);
    expect(JSON.stringify(sink.mock.calls)).not.toContain("private");
    expect(JSON.stringify(sink.mock.calls)).not.toContain(error.message);
  });

  it("discards runtime extra fields, unknown outcomes and invalid timing on pool observations", () => {
    const sink = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const observer = runtimePoolObserver(
      { OALO_RUNTIME_TIMING_DIAGNOSTICS: "true" },
      "campaign_pool",
    );
    // Simulates runtime values beyond the static callback contract without weakening that contract.
    for (const observation of [
      { outcome: "timed_out", elapsedMilliseconds: 10_000, secret: "private" },
      { outcome: "private", elapsedMilliseconds: 0 },
      { outcome: "failed", elapsedMilliseconds: Infinity },
    ]) {
      Reflect.apply(observer, undefined, [observation]);
    }
    expect(sink).toHaveBeenCalledExactlyOnceWith("oalo-runtime-timing", {
      stage: "campaign_pool",
      outcome: "timed_out",
      elapsedMilliseconds: 10_000,
    });
  });

  it("a broken sink cannot change successful operations or original errors", async () => {
    vi.spyOn(console, "info").mockImplementation(() => {
      throw new Error("broken sink");
    });
    const environment = { OALO_RUNTIME_TIMING_DIAGNOSTICS: "true" };
    expect(await observeRuntimeStage(environment, "saved_brand", async () => 42)).toBe(42);
    const error = new Error("original");
    await expect(
      observeRuntimeStage(environment, "saved_brand", async () => {
        throw error;
      }),
    ).rejects.toBe(error);
  });
});
