import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { canonicalCampaignHash, createApprovalDecision } from "@oalo/application";
import { PDFDocument } from "pdf-lib";
import { FinancingSavedSchema } from "../features/financing/model.js";
import { financingGroups, quoteWarnings } from "../features/financing/display.js";
import { FINANCING_COPY } from "../copy/financing-messages.js";
import {
  createTemporaryCampaignStore,
  LOCAL_SYNTHETIC_ENV,
} from "./campaign-command-test-support.js";
import { createLocalSyntheticPrincipal } from "./authenticated-principal.js";
import { singleActorSessionFixture } from "./signed-session.test-support.js";
import { createCampaignPersistenceAdapter } from "./campaign-persistence-runtime.js";
import { loadLocalCampaign } from "./local-campaign-store.js";
import { handleFinancingSave } from "./financing-http.js";
import { handleFinancingOutput } from "./financing-output.js";
import { readFinancingContext, readFinancingFormContext } from "./financing-context.js";
import {
  FinancingSaveError,
  saveFinancingComparison,
  verifyFinancingVersion,
} from "./financing-save.js";
import { financingReportPdf } from "./financing-pdf.js";
import { financingSiteHtml } from "./financing-html.js";
import {
  financingInput,
  financingPorts,
  financingRequest,
  financingScenario,
  savedFinancingReport,
} from "./financing.test-support.js";

const store = createTemporaryCampaignStore("oalo-financing-");
beforeEach(() => store.enter());
afterEach(async () => {
  await store.restore();
  vi.restoreAllMocks();
});
const save = (input: unknown) =>
  handleFinancingSave(financingRequest(input), store.env(), financingPorts());
const reader = () =>
  createCampaignPersistenceAdapter(createLocalSyntheticPrincipal(), store.env()).readRepository;

describe("financing comparisons through the real local handlers", () => {
  it("saves without an open house, reloads calculated totals, and performs no external fetch", async () => {
    const fetch = vi.spyOn(globalThis, "fetch");
    const response = await save(financingInput());
    expect(response.status).toBe(200);
    const result = FinancingSavedSchema.parse(await response.json());
    const record = await loadLocalCampaign(result.campaignRef, store.env());
    if (!record) throw new Error("Missing saved report");
    const manifest = verifyFinancingVersion(record.version);
    expect(manifest.calculated.scenarios[0]?.totalHousingMinor).toBe(256856);
    expect(manifest.identities.lender.name).toBe("Alex Morgan");
    expect(manifest.identities.realtor.email).toBe("jordan@example.invalid");
    expect(manifest.property).not.toHaveProperty("openHouseStartsAt");
    expect(record.preflight.blocking).toBe(true);
    expect(record.preflight.findings.map((item) => item.ruleCode)).toContain(
      "FINANCING_REVIEW_REQUIRED",
    );
    expect(result.providerPublicationAuthorized).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
    expect(response.headers.get("cache-control")).toContain("no-store");
  });
  it("reuses the exact saved version after the same request, not a new campaign", async () => {
    const input = financingInput();
    const first = await (await save(input)).json(),
      second = await (await save(input)).json();
    expect(second).toEqual(first);
    expect(await reader().listForLocation()).toHaveLength(1);
  });
  it("does not overwrite an existing report when its request key carries changed content", async () => {
    const input = financingInput();
    expect((await save(input)).status).toBe(200);
    expect((await save({ ...input, address: "A changed address" })).status).toBe(409);
    const records = await reader().listForLocation();
    expect(records).toHaveLength(1);
    expect(records[0]?.version.manifest.content.headline).toContain(input.address);
  });
  it.each(["locationRef", "actorRef", "brand", "calculated", "approval", "publish"])(
    "refuses a browser override of %s",
    async (key) => {
      expect((await save({ ...financingInput(), [key]: "injected" })).status).toBe(400);
      expect(await reader().listForLocation()).toEqual([]);
    },
  );
  it("does not fabricate a missing partner or brand", async () => {
    const input = financingInput({ partnerId: "00000000-0000-4000-8000-000000000099" });
    expect((await save(input)).status).toBe(404);
    const principal = createLocalSyntheticPrincipal();
    const adapter = createCampaignPersistenceAdapter(principal, store.env());
    const context = await readFinancingContext(principal, store.env());
    await expect(
      saveFinancingComparison(financingInput(), principal, store.env(), {
        versions: adapter.versionRepository,
        campaigns: adapter.readRepository,
        context: async () => ({ ...context, brand: null }),
      }),
    ).rejects.toMatchObject({ code: "FINANCING_BRAND_REQUIRED" });
  });
  it("refuses future quote issue dates but preserves expired historical private drafts", async () => {
    const future = financingInput();
    future.financing.scenarios[0]!.quote.quotedAt = "2080-01-01T00:00:00.000Z";
    expect((await save(future)).status).toBe(400);
    const old = financingInput();
    old.financing.scenarios[0]!.quote.expiresAt = "2021-01-01T00:00:00.000Z";
    const report = await savedFinancingReport(store.env(), old);
    expect(financingSiteHtml(report)).toContain(FINANCING_COPY.quoteExpired);
    expect(quoteWarnings(report.manifest.financing.scenarios[0]!, Date.now())).toContain(
      FINANCING_COPY.quoteExpired,
    );
  });
  it("preserves incomplete private calculations without inventing totals", async () => {
    const input = financingInput();
    input.financing.housing.propertyTaxMinor = null;
    input.financing.scenarios[0]!.costsComplete = false;
    const report = await savedFinancingReport(store.env(), input);
    expect(report.manifest.calculated.scenarios[0]?.totalHousingMinor).toBeNull();
    expect(report.manifest.calculated.scenarios[0]?.cashToCloseMinor).toBeNull();
    expect(financingSiteHtml(report)).toContain("Not supplied");
  });
  it("copies own previous settings but clears quote and permission confirmations", async () => {
    await savedFinancingReport(
      store.env(),
      financingInput({ propertyPermissionConfirmed: true, realtorPermissionConfirmed: true }),
    );
    const context = await readFinancingFormContext(createLocalSyntheticPrincipal(), store.env());
    expect(context.previous).toHaveLength(1);
    expect(context.previous[0]?.input).toMatchObject({
      propertyPermissionConfirmed: false,
      realtorPermissionConfirmed: false,
    });
    expect(context.previous[0]?.input.financing.scenarios[0]?.quote.confirmed).toBe(false);
    expect(
      await readFinancingFormContext(
        createLocalSyntheticPrincipal({ role: "viewer" }),
        store.env(),
      ),
    ).toMatchObject({ canSave: false, previous: [], partners: [] });
  });
  it("refuses tampered saved calculations even when their manifest hash was recomputed", async () => {
    const report = await savedFinancingReport(store.env());
    const record = await loadLocalCampaign(report.campaignRef, store.env());
    if (!record || record.version.manifest.blueprintId !== "financing-comparison")
      throw new Error("Missing report");
    const version = structuredClone(record.version);
    if (version.manifest.blueprintId !== "financing-comparison") throw new Error("Wrong blueprint");
    version.manifest.calculated.scenarios[0]!.cashToCloseMinor = 1;
    version.manifestHash = canonicalCampaignHash(version.manifest);
    expect(() => verifyFinancingVersion(version)).toThrow(FinancingSaveError);
  });
  it("refuses ad-style approval even if an internal caller forges a passing preflight", async () => {
    const report = await savedFinancingReport(store.env());
    const record = await loadLocalCampaign(report.campaignRef, store.env());
    if (!record) throw new Error("Missing report");
    await expect(
      createApprovalDecision(
        {
          approvalRef: "approval_financingTest001",
          campaignVersion: record.version,
          preflight: { ...record.preflight, blocking: false },
          actorRef: createLocalSyntheticPrincipal().actorRef,
          actorKind: "human",
          actorRole: "location_admin",
          decidedAt: new Date(),
          ipAuditHash: "a".repeat(64),
          decision: "approved",
          approverDisplayName: "Test approver",
        },
        { assertMayApprove: async () => {} },
      ),
    ).rejects.toThrow(/exact-output review/);
  });
  it.each(["viewer", "campaign_approver"] as const)(
    "refuses a signed %s before saving",
    async (role) => {
      const principal = createLocalSyntheticPrincipal({
        role,
        actorRef: "principal_financeactor001",
        locationRef: "location_financetenant001",
        installationRef: "installation_finance001",
      });
      const fixture = singleActorSessionFixture(principal);
      expect(
        (
          await handleFinancingSave(
            financingRequest(financingInput(), fixture.headersFor(principal.actorRef)),
            store.env(),
            fixture.ports,
          )
        ).status,
      ).toBe(403);
    },
  );
  it("refuses missing hosted auth, oversized input and non-JSON", async () => {
    expect(
      (
        await handleFinancingSave(
          financingRequest(financingInput()),
          {
            ...LOCAL_SYNTHETIC_ENV,
            OALO_ENVIRONMENT: "production",
            OALO_REVIEW_SURFACE: "authorized",
          },
          financingPorts(),
        )
      ).status,
    ).toBe(401);
    expect((await save({ ...financingInput(), description: "x".repeat(70_000) })).status).toBe(413);
    expect(
      (
        await handleFinancingSave(
          financingRequest(financingInput(), { "content-type": "text/plain" }),
          store.env(),
          financingPorts(),
        )
      ).status,
    ).toBe(415);
  });
});

describe("private report outputs", () => {
  it("renders valid repeatable PDF bytes and the same saved values on the site", async () => {
    const report = await savedFinancingReport(store.env());
    const bytes = await financingReportPdf(report),
      again = await financingReportPdf(report);
    expect(bytes).toEqual(again);
    expect((await PDFDocument.load(bytes)).getPageCount()).toBeGreaterThanOrEqual(2);
    const html = financingSiteHtml(report);
    for (const group of financingGroups(report.manifest))
      for (const row of group.rows) {
        expect(html).toContain(row.label.replaceAll("&", "&amp;"));
        for (const value of row.values) expect(html).toContain(value);
      }
    expect(html).toContain("$2,568.56");
    expect(html).toContain("$84,500.00");
    const request = new Request("https://app.operation-automated-lo.test/output");
    for (const output of ["site", "flyer"]) {
      const response = await handleFinancingOutput(
        request,
        { campaignRef: report.campaignRef, campaignVersionRef: report.campaignVersionRef, output },
        store.env(),
        financingPorts(),
      );
      expect(response.status).toBe(200);
      expect(response.headers.get("cache-control")).toContain("private");
      expect(response.headers.get("x-robots-tag")).toContain("noindex");
      expect(response.headers.get("content-security-policy")).toContain("frame-ancestors 'none'");
    }
  });
  it("keeps HTML inert and encodes untrusted property and scenario text", async () => {
    const input = financingInput({
      description: "A description with <script>alert('bad')</script> & unsafe markup.",
    });
    input.financing.scenarios[0]!.label = "<img src=x onerror=alert(1)>";
    const html = financingSiteHtml(await savedFinancingReport(store.env(), input));
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<form");
  });
  it("fails unsupported PDF characters without changing the saved comparison", async () => {
    const report = await savedFinancingReport(
      store.env(),
      financingInput({ description: "A made-up home with an emoji 🏠 in its description." }),
    );
    await expect(financingReportPdf(report)).rejects.toMatchObject({
      code: "FINANCING_FONT_UNSUPPORTED",
    });
    expect(financingSiteHtml(report)).toContain("🏠");
    expect(await reader().listForLocation()).toHaveLength(1);
  });
  it("uses landscape for five options and retains long descriptions instead of clipping", async () => {
    const input = financingInput({ description: "A description with useful details. ".repeat(45) });
    input.financing.scenarios = Array.from({ length: 5 }, (_, index) =>
      financingScenario({
        label: `Conventional option ${index + 1}`,
        downPaymentBps: 500 * (index + 1),
      }),
    );
    const pdf = await PDFDocument.load(
      await financingReportPdf(await savedFinancingReport(store.env(), input)),
    );
    expect(pdf.getPage(0).getWidth()).toBe(792);
    expect(pdf.getPageCount()).toBeLessThanOrEqual(16);
  });
  it("cannot request an arbitrary output route or another campaign version", async () => {
    const report = await savedFinancingReport(store.env());
    const request = new Request("https://app.operation-automated-lo.test/output");
    expect(
      (
        await handleFinancingOutput(
          request,
          {
            campaignRef: report.campaignRef,
            campaignVersionRef: "campaignversion_missing001",
            output: "site",
          },
          store.env(),
          financingPorts(),
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await handleFinancingOutput(
          request,
          {
            campaignRef: report.campaignRef,
            campaignVersionRef: report.campaignVersionRef,
            output: "publish",
          },
          store.env(),
          financingPorts(),
        )
      ).status,
    ).toBe(400);
  });
});
