import { AxeBuilder } from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

for (const width of [1440, 1180, 768, 390])
  for (const theme of ["light", "dark"] as const) {
    test(`financing report saves, prints and reuses at ${width}px in ${theme}`, async ({
      page,
    }, testInfo) => {
      test.setTimeout(90_000);
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.setViewportSize({ width, height: 1000 });
      await page.addInitScript(
        (selected) => window.localStorage.setItem("oalo:theme-preference", selected),
        theme,
      );
      await page.goto("/marketing/campaigns/financing");
      await expect(
        page.getByRole("heading", { name: "Create a financing report", level: 1 }),
      ).toBeVisible();
      expect((await new AxeBuilder({ page }).include("main").analyze()).violations).toEqual([]);
      const address = `${width} Example Lane, Dallas`;
      await page.getByLabel("Property address", { exact: true }).fill(address);
      await page
        .getByLabel("Property description", { exact: true })
        .fill("Synthetic property used to test a saved financing comparison.");
      await page.getByLabel("Purchase price ($)", { exact: true }).fill("400000");
      await page.getByRole("combobox", { name: "State", exact: true }).click();
      await page.getByRole("option", { name: "Texas", exact: true }).click();
      await page.getByRole("combobox", { name: "Realtor partner", exact: true }).click();
      await page
        .getByRole("option", { name: "Jordan Sample, Example Realty", exact: true })
        .click();
      for (const [label, value] of [
        ["Monthly property taxes ($)", "450"],
        ["Monthly homeowners insurance ($)", "150"],
        ["Monthly HOA ($)", "50"],
        ["Other monthly housing costs ($)", "0"],
        ["Down payment %", "20"],
        ["Note rate %", "6"],
        ["APR % (from quote)", "6.25"],
        ["Monthly mortgage insurance ($)", "0"],
        ["Quote source or reference", "Synthetic fixture quote"],
        ["Quote issued (UTC date)", "2020-01-01"],
        ["Quote valid through (UTC date)", "2090-01-01"],
      ])
        await page.getByLabel(label!, { exact: true }).fill(value!);
      await page
        .getByText("Closing costs, prepaids, credits, and deposit", { exact: true })
        .click();
      await page.getByRole("button", { name: "Add cost", exact: true }).click();
      await page.getByLabel("Cost 1 name", { exact: true }).fill("Synthetic closing costs");
      await page.getByLabel("Cost 1 amount ($)", { exact: true }).fill("4000");
      await page
        .getByRole("checkbox", {
          name: "This cost list is complete, including any intentionally zero costs",
        })
        .check();
      await page.getByRole("button", { name: "Confirm no credits or deposit" }).click();
      await page
        .getByRole("checkbox", {
          name: "I have checked these inputs against the stated quote source",
        })
        .check();
      await page.screenshot({
        path: testInfo.outputPath(`form-${width}-${theme}.png`),
        fullPage: true,
      });
      const responsePromise = page.waitForResponse(
        (response) =>
          response.url().endsWith("/api/campaigns/property/financing") &&
          response.request().method() === "POST",
      );
      await page.getByRole("button", { name: "Create report", exact: true }).click();
      expect((await responsePromise).status()).toBe(200);
      await expect(page.getByRole("heading", { name: address, level: 1 })).toBeVisible();
      await page.waitForLoadState("networkidle");
      await page.reload();
      await expect(page.getByRole("heading", { name: address, level: 1 })).toBeVisible();
      await expect(page.getByText("$2,568.56", { exact: true }).first()).toBeVisible();
      await expect(page.getByText("$84,000.00", { exact: true }).first()).toBeVisible();
      await expect(page.getByRole("button", { name: /publish|approve|launch/iu })).toHaveCount(0);
      expect((await new AxeBuilder({ page }).include("main").analyze()).violations).toEqual([]);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
      await page.screenshot({
        path: testInfo.outputPath(`report-${width}-${theme}.png`),
        fullPage: true,
      });

      const downloadPromise = page.waitForEvent("download");
      await page.getByRole("link", { name: "Download report PDF" }).click();
      await (await downloadPromise).saveAs(testInfo.outputPath("financing-report.pdf"));
      const href = await page
        .getByRole("link", { name: "Download report PDF" })
        .getAttribute("href");
      const pdfResponse = await page.request.get(href!);
      expect(pdfResponse.headers()["content-type"]).toBe("application/pdf");
      const bytes = await pdfResponse.body();
      expect(bytes.subarray(0, 5).toString()).toBe("%PDF-");
      expect(bytes.length).toBeGreaterThan(1000);
      const popupPromise = page.waitForEvent("popup");
      await page.getByRole("link", { name: /^Open site preview/ }).click();
      const preview = await popupPromise;
      await preview.setViewportSize({ width, height: 1000 });
      await preview.waitForLoadState("domcontentloaded");
      await expect(preview.getByRole("heading", { level: 1, name: address })).toBeVisible();
      expect((await new AxeBuilder({ page: preview }).analyze()).violations).toEqual([]);
      expect(
        await preview.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
      await preview.screenshot({
        path: testInfo.outputPath(`site-${width}-${theme}.png`),
        fullPage: true,
      });
      await preview.close();
      await page.getByRole("link", { name: "Use this setup again" }).click();
      await expect(page.getByLabel("Purchase price ($)", { exact: true })).toHaveValue("400000.00");
      await expect(
        page.getByRole("checkbox", {
          name: "I have checked these inputs against the stated quote source",
        }),
      ).not.toBeChecked();
      expect(errors).toEqual([]);
    });
  }
