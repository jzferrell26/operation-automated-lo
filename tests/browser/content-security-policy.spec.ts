import { expect, test } from "@playwright/test";

test("enforces a nonce-based Content-Security-Policy without blocking theme bootstrap", async ({
  page,
}) => {
  const response = await page.goto("/overview", { waitUntil: "domcontentloaded" });
  expect(response).not.toBeNull();

  const csp = response?.headers()["content-security-policy"];
  expect(csp).toBeTruthy();
  expect(csp).toMatch(/script-src[^;]*'nonce-[A-Za-z0-9+/=]+'/);
  expect(csp).toContain("'strict-dynamic'");
  expect(csp).toContain("frame-ancestors 'none'");
  expect(csp).not.toMatch(/script-src[^;]*'unsafe-inline'/);

  await expect(page.locator("html")).toHaveAttribute("data-theme", /^(light|dark)$/);
  await expect(page.locator("html")).toHaveCSS("color-scheme", /^(light|dark)$/);

  const bootstrapNonce = await page.locator("head script").evaluateAll((scripts) =>
    scripts
      .map((script) => ({
        nonce: script.nonce || script.getAttribute("nonce"),
        source: script.textContent ?? "",
      }))
      .find((script) => script.source.includes("data-theme")),
  );

  expect(bootstrapNonce?.nonce).toMatch(/^[A-Za-z0-9+/=]+$/);
  expect(csp).toContain(`'nonce-${bootstrapNonce?.nonce}'`);

  const nextChunkNonces = await page
    .locator('script[src*="_next"]')
    .evaluateAll((scripts) =>
      scripts.map((script) => script.nonce || script.getAttribute("nonce")),
    );
  expect(nextChunkNonces.length).toBeGreaterThan(0);
  expect(nextChunkNonces.every((value) => value === bootstrapNonce?.nonce)).toBe(true);
});
