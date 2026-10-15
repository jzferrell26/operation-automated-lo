import { describe, expect, it, vi } from "vitest";

vi.mock("@playwright/test", () => {
  throw new Error("Browser runtime is unavailable in this web function");
});

import { inspectPdfBinary, PlaywrightBrowserAdapter } from "@oalo/rendering";

describe("rendering package import without a browser runtime", () => {
  it("loads ordinary render exports and constructs the browser adapter without loading Playwright", () => {
    expect(inspectPdfBinary).toBeTypeOf("function");
    expect(new PlaywrightBrowserAdapter()).toBeDefined();
  });
});
