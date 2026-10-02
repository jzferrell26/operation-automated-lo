import { expect, test } from "@playwright/test";

/**
 * PRD-009f D1, 009F-AC-001 and 009F-AC-002, over HTTP against the running server.
 *
 * The same three tests run in the synthetic project and in the dashboard preview project, because
 * the removals and where each old address now leads do not depend on the mode. The signed-in
 * review run asserts the same sentences with a real session in
 * `tests/browser/review/workspace-pages.spec.ts`.
 *
 * What is written out here is D1's table, restated rather than imported, so a row dropped or
 * retargeted in `apps/web/next.config.ts` fails here too. The redirect is read without following
 * it, because the status and the Location are the claim; where a browser ends up is a different
 * claim and needs the target page to exist.
 */

const MOVED = [
  ["/marketing", "/marketing/campaigns"],
  ["/marketing/property-sites", "/marketing/campaigns"],
  ["/marketing/creative", "/marketing/campaigns"],
  ["/marketing/ads", "/marketing/campaigns"],
  ["/marketing/messaging", "/marketing/campaigns"],
  ["/marketing/blueprints", "/marketing/campaigns/library"],
  ["/reports", "/marketing/campaigns"],
  ["/marketplace", "/overview"],
  ["/settings/profile", "/brand"],
  ["/settings/team", "/settings/account"],
  ["/onboarding", "/overview"],
] as const;

const GONE = ["/leads", "/leads/pipeline", "/automations"] as const;

test("an address that moved answers a temporary redirect to where the job now lives", async ({
  request,
}) => {
  for (const [from, to] of MOVED) {
    const response = await request.get(from, { maxRedirects: 0 });
    expect(response.status(), from).toBe(307);
    const location = response.headers()["location"];
    expect(location, from).toBeDefined();
    expect(new URL(location ?? "", "http://127.0.0.1").pathname, from).toBe(to);
  }
});

test("an address that is gone answers 404 with the gone page and a way home", async ({ page }) => {
  for (const path of GONE) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(404);
    await expect(
      page.getByRole("heading", { level: 1, name: "This page is gone." }),
      path,
    ).toBeVisible();
    await expect(
      page.getByText("Your leads, pipelines and follow-up live in HighLevel."),
      path,
    ).toBeVisible();
    await expect(
      page.getByRole("main").getByRole("link", { name: "Go to Home" }),
      path,
    ).toHaveAttribute("href", "/overview");
  }
  await page.getByRole("main").getByRole("link", { name: "Go to Home" }).click();
  await expect(page).toHaveURL(/\/overview$/u);
});

test("an unrelated unknown address is still the ordinary not-found page, without the gone sentence", async ({
  page,
}) => {
  for (const path of ["/leads/someone-else", "/this-page-does-not-exist"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: "404", exact: true }), path).toBeVisible();
    await expect(page.getByText("This page is gone."), path).toHaveCount(0);
    await expect(page.locator('meta[name="robots"][content*="noindex"]').first()).toBeAttached();
  }
});
