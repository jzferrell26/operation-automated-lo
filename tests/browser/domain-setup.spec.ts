import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { AxeBuilder } from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import {
  domainFixture,
  domainState,
} from "../../apps/web/src/features/domains/domain.test-support.js";
import type { DomainState } from "../../apps/web/src/features/domains/model.js";
import { chooseThemeFromTheHeader } from "./review/helpers/review-session.js";

// Production-rendered UI with synthetic API fixtures. No DNS or provider request is made.
for (const width of [1440, 390])
  for (const theme of ["light", "dark"] as const) {
    test(`synthetic domain UI ${width} ${theme}: states, keyboard and contrast`, async ({
      page,
    }) => {
      test.setTimeout(90_000);
      await page.setViewportSize({ width, height: 900 });
      let state: DomainState = domainState();
      let writes = 0;
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
          state = domainState(domainFixture());
          await route.fulfill({ json: { domain: state.domain } });
        } else await route.fulfill({ json: state });
      });
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      const captures = join(process.cwd(), "test-results", "domain-ui-originals", "v2");
      await mkdir(captures, { recursive: true });
      async function frame(name: string) {
        await expect(page.getByText("Latest saved domain state loaded.")).toBeVisible();
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
      await page.getByLabel("Domain or subdomain").fill("offers.loanoffice.com");
      const trigger = page.getByRole("button", { name: "Review connection" });
      await trigger.click();
      await expect(page.getByRole("dialog", { name: "Connect this domain?" })).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(trigger).toBeFocused();
      expect(writes).toBe(0);
      await trigger.click();
      await page.getByRole("button", { name: "Confirm connection" }).click();
      await expect(
        page.getByText("Connection saved. Add the ownership record to continue."),
      ).toBeVisible();
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
            readyUntil: status === "ready" ? "2035-01-01T00:00:00.000Z" : null,
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
        domainFixture({ status: "ready", claimed: true, readyUntil: "2020-01-01T00:00:00.000Z" }),
      );
      await page.getByRole("button", { name: "Load latest saved state" }).click();
      await expect(page.getByText("Proof expired")).toBeVisible();
      await frame("stale");
      state = domainState(domainFixture(), { available: false });
      await page.getByRole("button", { name: "Load latest saved state" }).click();
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
      await frame("read-only");
      expect(errors).toEqual([]);
      expect(externalHosts).toEqual([]);
    });
  }
