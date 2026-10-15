import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { AxeBuilder } from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import {
  domainFixture,
  domainState,
} from "../../apps/web/src/features/domains/domain.test-support.js";
import {
  DomainCommandSchema,
  type DomainState,
} from "../../apps/web/src/features/domains/model.js";
import { chooseThemeFromTheHeader } from "./review/helpers/review-session.js";
import { REVIEW_FRAMES } from "./helpers/design-quality.js";

// Production-rendered UI with synthetic API fixtures. No DNS or provider request is made.
for (const { width, height } of REVIEW_FRAMES)
  for (const theme of ["light", "dark"] as const) {
    test(`synthetic domain UI ${width} ${theme}: states, keyboard and contrast`, async ({
      page,
    }) => {
      test.setTimeout(90_000);
      await page.setViewportSize({ width, height });
      let state: DomainState = domainState();
      let writes = 0;
      let pendingRead: Promise<void> | null = null;
      let failRead = false;
      const externalHosts: string[] = [];
      await page.route("**/*", async (route) => {
        const url = new URL(route.request().url());
        if (url.origin !== "http://127.0.0.1:3100") {
          externalHosts.push(url.hostname);
          await route.abort();
        } else await route.continue();
      });
      await page.route("**/api/funnel-domains", async (route) => {
        if (route.request().method() === "POST") {
          writes++;
          const command = DomainCommandSchema.parse(route.request().postDataJSON());
          state = domainState(
            domainFixture({
              defaultKind: command.action === "connect" ? command.defaultKind : "live-webinar",
            }),
          );
          await route.fulfill({ json: { domain: state.domain } });
        } else {
          if (pendingRead) await pendingRead;
          await route.fulfill(
            failRead ? { status: 503, json: { error: "DOMAIN_UNAVAILABLE" } } : { json: state },
          );
        }
      });
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      const captures = join(process.cwd(), "test-results", "product-review-frames", "domain-setup");
      await mkdir(captures, { recursive: true });
      async function frame(name: string, loaded = true) {
        if (loaded) await expect(page.getByText("Latest saved domain state loaded.")).toBeVisible();
        await page.evaluate(() => window.scrollTo(0, 0));
        await expect(page.getByRole("heading", { name: "Domains", exact: true })).toBeInViewport();
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
        ).toBe(true);
        const result = await new AxeBuilder({ page })
          .include('[data-domain-setup="true"]')
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze();
        expect(result.violations).toEqual([]);
        await page.screenshot({
          path: join(captures, `${width}-${theme}-${name}-synthetic.png`),
          fullPage: true,
        });
      }
      await page.goto("/settings/domains");
      await expect(page.getByRole("heading", { name: "Domains", exact: true })).toBeVisible();
      await chooseThemeFromTheHeader(page, theme);
      await frame("empty");
      const chooser = page.getByRole("combobox", { name: "Funnel at this address" });
      await chooser.click();
      await expect(page.getByRole("option")).toHaveCount(5);
      await frame("funnel-choice");
      await page.getByRole("option", { name: "On-demand webinar", exact: true }).click();
      await page.getByLabel("Domain or subdomain").fill("offers.loanoffice.com");
      const trigger = page.getByRole("button", { name: "Review connection" });
      await trigger.click();
      await expect(page.getByRole("dialog", { name: "Connect this domain?" })).toBeVisible();
      await expect(page.getByRole("dialog")).toContainText(
        "Funnel at this address: On-demand webinar",
      );
      await page.keyboard.press("Escape");
      await expect(trigger).toBeFocused();
      expect(writes).toBe(0);
      await expect(chooser).toContainText("On-demand webinar");
      await trigger.click();
      await page.getByRole("button", { name: "Confirm connection" }).click();
      await expect(
        page.getByText("Connection saved. Add the ownership record to continue."),
      ).toBeVisible();
      await expect(page.getByText("Default funnel: On-demand webinar")).toBeVisible();
      for (const status of [
        "ownership_needed",
        "dns_needed",
        "certificate_needed",
        "ready",
      ] as const) {
        state = domainState(
          domainFixture({
            status,
            claimed: status !== "ownership_needed",
            checkedAt: status === "ownership_needed" ? null : new Date().toISOString(),
            readyUntil:
              status === "ready" ? new Date(Date.now() + 48 * 3_600_000).toISOString() : null,
            records:
              status === "ownership_needed"
                ? domainFixture().records
                : [
                    ...domainFixture().records,
                    {
                      type: "CNAME",
                      name: "offers.loanoffice.com",
                      value: "actual-fixture-target.host.com",
                      purpose: "routing",
                    },
                  ],
          }),
        );
        await page.getByRole("button", { name: "Load latest saved state" }).click();
        await frame(status);
      }
      state = domainState(
        domainFixture({
          status: "ready",
          claimed: true,
          checkedAt: new Date(Date.now() - 5 * 86_400_000).toISOString(),
          readyUntil: new Date(Date.now() - 2 * 86_400_000).toISOString(),
        }),
      );
      await page.getByRole("button", { name: "Load latest saved state" }).click();
      await expect(page.getByText("Proof expired")).toBeVisible();
      await frame("stale");
      state = domainState(domainFixture(), { available: false });
      await page.getByRole("button", { name: "Load latest saved state" }).click();
      await expect(page.locator('[data-state="degraded"][data-surface="card"]')).toBeVisible();
      await frame("provider-disabled");
      const disconnect = page.getByRole("button", { name: "Disconnect domain" });
      await disconnect.click();
      await expect(page.getByRole("dialog", { name: "Disconnect this domain?" })).toBeVisible();
      await page.screenshot({
        path: join(captures, `${width}-${theme}-disconnect-synthetic.png`),
        fullPage: false,
      });
      await page.keyboard.press("Escape");
      await expect(disconnect).toBeFocused();
      state = domainState(domainFixture(), { canEdit: false });
      await page.getByRole("button", { name: "Load latest saved state" }).click();
      await expect(
        page.locator('[data-state="permission_restricted"][data-surface="card"]'),
      ).toBeVisible();
      await frame("read-only");
      state = domainState();
      let releaseRead: (() => void) | undefined;
      pendingRead = new Promise<void>((resolve) => {
        releaseRead = resolve;
      });
      await page.reload({ waitUntil: "domcontentloaded" });
      const loading = page.getByRole("status", { name: "Domain settings", exact: true });
      await expect(loading).toHaveAttribute("data-state", "loading");
      await expect(loading).toHaveAttribute("data-surface", "card");
      await expect(loading).toHaveAttribute("aria-busy", "true");
      await expect(page.getByRole("button", { name: "Load latest saved state" })).toBeDisabled();
      await expect(page.getByRole("button", { name: "Review connection" })).toHaveCount(0);
      await frame("loading", false);
      failRead = true;
      releaseRead?.();
      const failure = page.getByRole("alert", { name: "Domain settings need attention" });
      await expect(failure).toHaveAttribute("data-state", "error");
      await expect(failure).toHaveAttribute("data-surface", "card");
      await expect(page.getByRole("button", { name: "Load latest saved state" })).toBeEnabled();
      await expect(page.getByRole("button", { name: "Review connection" })).toHaveCount(0);
      await frame("error", false);
      pendingRead = null;
      failRead = false;
      await page.getByRole("button", { name: "Load latest saved state" }).click();
      await expect(page.getByRole("button", { name: "Review connection" })).toBeEnabled();
      expect(errors).toEqual([]);
      expect(externalHosts).toEqual([]);
    });
  }
