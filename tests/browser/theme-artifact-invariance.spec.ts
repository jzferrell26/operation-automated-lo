import { expect, test } from "@playwright/test";

import { readApprovalEvidenceSnapshot } from "./helpers/approval-evidence.js";

const applicationOrigin = "http://127.0.0.1:3100";

test("Light, Dark, and System leave local approval evidence byte-identical", async ({ page }) => {
  const baseline = readApprovalEvidenceSnapshot();
  const externalRequests: string[] = [];
  const themeTransitionRequests: string[] = [];

  await page.route("**/*", async (route) => {
    const requestUrl = route.request().url();
    if (new URL(requestUrl).origin !== applicationOrigin) {
      externalRequests.push(requestUrl);
      await route.abort();
      return;
    }

    await route.continue();
  });

  await page.goto("/overview");
  await expect(page.getByRole("radiogroup", { name: "Appearance theme" })).toBeVisible();
  await page.waitForLoadState("networkidle");

  page.on("request", (request) => themeTransitionRequests.push(request.url()));

  for (const preference of ["Light", "Dark", "System"] as const) {
    const option = page.getByRole("radio", { name: preference });
    await option.click();
    await expect(option).toHaveAttribute("aria-checked", "true");

    expect(readApprovalEvidenceSnapshot()).toEqual(baseline);
  }

  await page.waitForTimeout(100);

  expect(baseline.sha256).toMatch(/^[a-f0-9]{64}$/u);
  expect(externalRequests).toEqual([]);
  expect(themeTransitionRequests).toEqual([]);
});
