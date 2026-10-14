import { createHash, randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import { PDFDocument, PDFName, PDFRawStream, decodePDFRawStream } from "pdf-lib";
import { createTemporaryCampaignStore } from "./campaign-command-test-support.js";
import {
  createLocalSyntheticPrincipal,
  resolveAuthenticatedReadPrincipal,
} from "./authenticated-principal.js";
import { createFinancingMediaRuntime } from "./financing-media-runtime.js";
import { resolveFinancingMedia, uploadFinancingMedia } from "./financing-media-service.js";
import {
  financingInput,
  financingScenario,
  savedFinancingReport,
  financingPorts,
} from "./financing.test-support.js";
import { financingSiteHtml } from "./financing-html.js";
import { financingReportPdf } from "./financing-pdf.js";
import { financingDraftHtmlCsp, handleFinancingOutput } from "./financing-output.js";
import { financingGroups, financingDate } from "../features/financing/display.js";
import { loadCampaignPage } from "./campaign-workspace-reads.js";
import { FINANCING_OUTPUT_MAX_BYTES } from "./financing-output-media.js";
import * as campaignPersistence from "./campaign-persistence-runtime.js";
import * as mediaRuntime from "./financing-media-runtime.js";
import { singleActorSessionFixture } from "./signed-session.test-support.js";
import { canonicalCampaignHash, type AuthenticatedPrincipal } from "@oalo/application";
import { saveFinancingComparison, verifyFinancingVersion } from "./financing-save.js";

const store = createTemporaryCampaignStore("oalo-financing-output-");
const hash = (value: Uint8Array | string) => createHash("sha256").update(value).digest("hex");
function readPdfText(pdf: PDFDocument) {
  const streams = pdf.context
    .enumerateIndirectObjects()
    .map(([, obj]) => obj)
    .filter(
      (obj): obj is PDFRawStream =>
        obj instanceof PDFRawStream && obj.dict.get(PDFName.of("Subtype")) === undefined,
    )
    .map((obj) => Buffer.from(decodePDFRawStream(obj).decode()).toString("latin1"))
    .join("\n");
  // PDF strings are hexadecimal WinAnsi, so extract text tokens from actual page streams.
  const text = [...streams.matchAll(/<([a-f0-9]+)> Tj/giu)]
    .map((item) => Buffer.from(item[1]!, "hex").toString("latin1"))
    .join(" ");
  return { streams, text };
}

function deferredSignal() {
  return Promise.withResolvers<void>();
}

const connectedActor = () =>
  createLocalSyntheticPrincipal({
    actorRef: "principal_financeoutput001",
    locationRef: "location_financeoutput001",
    installationRef: "installation_financeoutput001",
  });

async function connectedReadWithoutPhotoStorage(localActor: AuthenticatedPrincipal) {
  const adapter = campaignPersistence.createCampaignPersistenceAdapter(localActor, store.env());
  const environment = {
    OALO_ENVIRONMENT: "preview",
    OALO_REVIEW_SURFACE: "authorized",
    OALO_PROVIDER_MODE: "stub",
    OALO_SYNTHETIC_DATA_ONLY: "true",
  };
  const session = singleActorSessionFixture(localActor);
  const request = new Request("https://app.operation-automated-lo.test/output", {
    headers: session.headersFor(localActor.actorRef),
  });
  const principal = await resolveAuthenticatedReadPrincipal(request, environment, session.ports);
  expect(principal.authenticationMode).toBe("embedded");
  // Stub only the saved-read adapter. Signed authentication, source/calculation verification,
  // output handlers and the actual authenticated page loader retain their real implementation.
  vi.spyOn(campaignPersistence, "createCampaignPersistenceAdapter").mockReturnValue({
    ...adapter,
    kind: "postgres",
  });
  return { environment, request, principal, ports: session.ports, adapter };
}
beforeEach(() => store.enter());
afterEach(async () => {
  vi.restoreAllMocks();
  await store.restore();
});
async function photoReport(
  count = 3,
  photos = 2,
  long = false,
  principal: AuthenticatedPrincipal = createLocalSyntheticPrincipal(),
) {
  const runtime = createFinancingMediaRuntime(principal, store.env());
  const placements = [];
  for (let i = 0; i < photos; i++) {
    const format = i % 2 ? "png" : "jpeg";
    const bytes = await sharp({
      create: {
        width: 600,
        height: 400,
        channels: 3,
        background: { r: 40 + i * 20, g: 90, b: 140 },
      },
    })
      [format]()
      .toBuffer();
    const saved = await uploadFinancingMedia(
      {
        requestId: randomUUID(),
        declaredMimeType: `image/${format}`,
        rightsBasis: "owned",
        rightsConfirmed: true,
      },
      bytes,
      principal,
      runtime,
    );
    placements.push({
      mediaRef: saved.record.mediaRef,
      altText: long
        ? `View ${i + 1}: ${"long original description ".repeat(11)}`
        : `Original fictional property view ${i + 1}`,
    });
  }
  const input = financingInput(
    long
      ? {
          description: `${"Original fictional home details. ".repeat(50)}Description ending retained.`,
        }
      : {},
  );
  input.financing.scenarios = Array.from({ length: count }, (_, i) =>
    financingScenario({
      label: long ? `Option ${i + 1}: ${"LongName".repeat(18)}` : `Option ${i + 1}`,
      downPaymentBps: 1000 + i * 500,
      ...(long
        ? {
            assumptions: `${"A saved assumption. ".repeat(45)}Assumption ending retained.`,
            quote: {
              ...financingScenario().quote,
              source: `Source ${i + 1}: ${"LongSource".repeat(14)}`,
            },
          }
        : {}),
    }),
  );
  const body = {
    ...input,
    schemaVersion: 2 as const,
    propertyFacts: {
      listPriceMinor: 42_000_000,
      bedrooms: 3,
      bathroomsHundredths: 250,
      floorAreaSqFt: null,
      confirmed: true as const,
    },
    propertyMedia: placements,
  };
  const adapter = campaignPersistence.createCampaignPersistenceAdapter(principal, store.env());
  const frozen = await saveFinancingComparison(body, principal, store.env(), {
    campaigns: adapter.readRepository,
    versions: adapter.versionRepository,
    now: () => new Date("2026-10-05T12:00:00.000Z"),
  });
  await adapter.persistDraft(frozen.version, frozen.preflight);
  const { campaignRef, campaignVersionRef, versionNo, createdAt } = frozen.version;
  const report = {
    campaignRef,
    campaignVersionRef,
    versionNo,
    createdAt,
    manifest: verifyFinancingVersion(frozen.version),
  };
  return {
    report,
    runtime,
    media: await resolveFinancingMedia(report, runtime.repository, runtime.bytes),
  };
}
describe("versioned private financing output", () => {
  it("preserves legacy v1 exact HTML and deterministic PDF bytes", async () => {
    const report = await savedFinancingReport(store.env());
    const html = financingSiteHtml(report, Date.parse("2026-10-13")),
      bytes = await financingReportPdf(report);
    // These hashes were measured against the origin/main renderers, using this same saved fixture.
    expect(hash(html)).toBe("ed80838a282807abb35714d3eb3c12781b6750fce2f1e8e90efca372a11bd814");
    expect(hash(bytes)).toBe("91c919bec66d43289e617934e676cefa29bd87e03ccee3878d709394de54eac5");
    expect(html).toContain("This first report version is text-only.");
    expect(html).not.toContain("data:image/");
    expect(bytes).toEqual(await financingReportPdf(report));
  });
  it("embeds all ordered bytes in inert HTML with exact normalized hashes and saved facts", async () => {
    const { report, media } = await photoReport();
    const html = financingSiteHtml(report, Date.parse("2026-10-13"), media);
    const data = [...html.matchAll(/src="data:(image\/(?:jpeg|png));base64,([^"]+)"/gu)];
    expect(data).toHaveLength(2);
    data.forEach((item, i) => {
      expect(item[1]).toBe(media[i]?.snapshot.mimeType);
      expect(hash(Buffer.from(item[2]!, "base64"))).toBe(media[i]?.snapshot.sha256);
    });
    for (const group of financingGroups(report.manifest))
      for (const row of group.rows) {
        expect(html).toContain(row.label.replaceAll("&", "&amp;"));
        for (const value of row.values) expect(html).toContain(value);
      }
    expect(html).toContain("$420,000.00");
    expect(html).toContain("Not supplied");
    expect(html).toContain("Property template 2.0.0");
    expect(html).toContain(financingDate(report.manifest.financing.scenarios[0]!.quote.expiresAt));
    expect(financingDraftHtmlCsp(html, 2)).toMatch(/script-src 'none'.*sandbox; img-src data:/u);
    expect(financingDraftHtmlCsp(html, 1)).not.toContain("img-src");
    expect(html).not.toMatch(/<script|<form|src="https?:/u);
  });
  it.each([1, 2, 3, 4, 5])(
    "embeds image XObjects, exact pixels, and complete saved text for %i options",
    async (count) => {
      const { report, media } = await photoReport(count);
      const bytes = await financingReportPdf(report, media),
        pdf = await PDFDocument.load(bytes);
      expect(bytes).toEqual(await financingReportPdf(report, media));
      expect(pdf.getPage(0).getWidth()).toBe(count > 3 ? 792 : 612);
      const images = pdf.context
        .enumerateIndirectObjects()
        .map(([, obj]) => obj)
        .filter(
          (obj): obj is PDFRawStream =>
            obj instanceof PDFRawStream &&
            obj.dict.get(PDFName.of("Subtype"))?.toString() === "/Image",
        );
      expect(images).toHaveLength(2);
      const jpeg = images.find(
        (image) => image.dict.get(PDFName.of("Filter"))?.toString() === "/DCTDecode",
      );
      expect(jpeg).toBeDefined();
      expect(hash(jpeg!.getContents())).toBe(media[0]!.snapshot.sha256);
      const png = images.find(
        (image) => image.dict.get(PDFName.of("Filter"))?.toString() === "/FlateDecode",
      );
      expect(png).toBeDefined();
      const pixels = await sharp(media[1]!.bytes).removeAlpha().raw().toBuffer();
      expect(Buffer.from(decodePDFRawStream(png!).decode())).toEqual(pixels);
      const { text } = readPdfText(pdf);
      for (const group of financingGroups(report.manifest))
        for (const row of group.rows) for (const value of row.values) expect(text).toContain(value);
      expect(text).toContain("List price: $420,000.00");
      expect(text).toContain("Property template 2.0.0");
      expect(text).toContain(report.manifest.content.disclosureText);
      expect(text).toContain("Valid until:");
      expect(pdf.getCreator()).toBe("AutomatedLO financing report 2.0.0");
    },
  );
  it("refuses missing, corrupted and reordered bundles rather than dropping photographs", async () => {
    const { report, media } = await photoReport();
    for (const bundle of [
      undefined,
      [],
      [...media].reverse(),
      [{ ...media[0]!, bytes: Uint8Array.from([1]) }, media[1]!],
    ]) {
      expect(() => financingSiteHtml(report, Date.now(), bundle)).toThrow(
        /FINANCING_MEDIA_INTEGRITY_FAILED/u,
      );
      await expect(financingReportPdf(report, bundle)).rejects.toMatchObject({
        code: "FINANCING_MEDIA_INTEGRITY_FAILED",
      });
    }
  });
  it("routes real saved output and authenticated page through current media rights, refuses revocation", async () => {
    const { report, media, runtime } = await photoReport();
    const req = new Request("https://app.operation-automated-lo.test/output");
    for (const output of ["site", "flyer"] as const) {
      const response = await handleFinancingOutput(
        req,
        { campaignRef: report.campaignRef, campaignVersionRef: report.campaignVersionRef, output },
        store.env(),
        financingPorts(),
      );
      expect(response.status).toBe(200);
      expect(response.headers.get("cache-control")).toContain("no-store");
    }
    expect(
      (
        await loadCampaignPage(
          createLocalSyntheticPrincipal(),
          report.campaignRef,
          undefined,
          store.env(),
        )
      )?.kind,
    ).toBe("page");
    await runtime.repository.revoke(media[0]!.snapshot.mediaRef);
    for (const output of ["site", "flyer"] as const) {
      const response = await handleFinancingOutput(
        req,
        { campaignRef: report.campaignRef, campaignVersionRef: report.campaignVersionRef, output },
        store.env(),
        financingPorts(),
      );
      expect(response.status).toBe(410);
      expect(await response.json()).toEqual({ error: "FINANCING_MEDIA_REVOKED" });
    }
    await expect(
      loadCampaignPage(createLocalSyntheticPrincipal(), report.campaignRef, undefined, store.env()),
    ).rejects.toMatchObject({ code: "FINANCING_MEDIA_REVOKED" });
  });
  it("honors an explicit text-only v2 choice without a stock fallback", async () => {
    const { report, media } = await photoReport(3, 0);
    const html = financingSiteHtml(report, Date.now(), media);
    expect(html).not.toContain("<img");
    expect(html).toContain("No property photographs selected");
    expect(
      (await PDFDocument.load(await financingReportPdf(report, media))).getPageCount(),
    ).toBeGreaterThan(2);
  });
  it("renders signed connected-account text-only v2 outputs and page without constructing photo storage", async () => {
    const actor = connectedActor();
    const { report } = await photoReport(3, 0, false, actor);
    const connected = await connectedReadWithoutPhotoStorage(actor);
    const photoFactory = vi
      .spyOn(mediaRuntime, "createFinancingMediaRuntime")
      .mockImplementation(() => {
        throw new Error("Text-only reads must not construct photograph storage");
      });
    for (const output of ["site", "flyer"] as const) {
      const response = await handleFinancingOutput(
        connected.request,
        { campaignRef: report.campaignRef, campaignVersionRef: report.campaignVersionRef, output },
        connected.environment,
        connected.ports,
      );
      expect(response.status).toBe(200);
      expect(response.headers.get("cache-control")).toContain("no-store");
      if (output === "site") {
        const html = await response.text();
        expect(html).toContain("No property photographs selected");
        expect(html).not.toContain("<img");
      } else
        expect((await PDFDocument.load(await response.arrayBuffer())).getCreator()).toBe(
          "AutomatedLO financing report 2.0.0",
        );
    }
    const page = await loadCampaignPage(
      connected.principal,
      report.campaignRef,
      undefined,
      connected.environment,
    );
    expect(page).toMatchObject({
      kind: "page",
      page: {
        kind: "financing-comparison",
        report: { manifest: { schemaVersion: 2, property: { media: [] } } },
      },
    });
    expect(photoFactory).not.toHaveBeenCalled();
    expect(
      (
        await handleFinancingOutput(
          new Request(connected.request.url),
          {
            campaignRef: report.campaignRef,
            campaignVersionRef: report.campaignVersionRef,
            output: "site",
          },
          connected.environment,
          connected.ports,
        )
      ).status,
    ).toBe(401);
  });
  it("still refuses connected-account photo outputs when actual photograph storage is unavailable", async () => {
    const actor = connectedActor();
    const { report } = await photoReport(3, 2, false, actor);
    const connected = await connectedReadWithoutPhotoStorage(actor);
    const photoFactory = vi.spyOn(mediaRuntime, "createFinancingMediaRuntime");
    for (const output of ["site", "flyer"] as const) {
      const response = await handleFinancingOutput(
        connected.request,
        { campaignRef: report.campaignRef, campaignVersionRef: report.campaignVersionRef, output },
        connected.environment,
        connected.ports,
      );
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.headers.get("content-type")).toContain("application/json");
      expect(await response.json()).toHaveProperty("error");
    }
    await expect(
      loadCampaignPage(connected.principal, report.campaignRef, undefined, connected.environment),
    ).rejects.toThrow();
    expect(photoFactory).toHaveBeenCalledTimes(3);
  });
  it("refuses missing v2 media before any empty-media bypass, even with a recomputed saved hash", async () => {
    const actor = connectedActor();
    const { report } = await photoReport(3, 0, false, actor);
    const stored = await campaignPersistence
      .createCampaignPersistenceAdapter(actor, store.env())
      .readRepository.getByCampaignRef(report.campaignRef);
    if (
      !stored ||
      stored.version.manifest.blueprintId !== "financing-comparison" ||
      stored.version.manifest.schemaVersion !== 2
    )
      throw new Error("Missing v2 report");
    Reflect.deleteProperty(stored.version.manifest.property, "media");
    stored.version.manifestHash = canonicalCampaignHash(stored.version.manifest);
    const connected = await connectedReadWithoutPhotoStorage(actor);
    vi.spyOn(connected.adapter.readRepository, "listVersionsOf").mockResolvedValue([stored]);
    vi.spyOn(connected.adapter.readRepository, "getByCampaignRef").mockResolvedValue(stored);
    const photoFactory = vi.spyOn(mediaRuntime, "createFinancingMediaRuntime");
    for (const output of ["site", "flyer"] as const) {
      const response = await handleFinancingOutput(
        connected.request,
        { campaignRef: report.campaignRef, campaignVersionRef: report.campaignVersionRef, output },
        connected.environment,
        connected.ports,
      );
      expect(response.status).toBe(503);
      expect(await response.json()).toEqual({ error: "FINANCING_INTEGRITY_FAILED" });
    }
    await expect(
      loadCampaignPage(connected.principal, report.campaignRef, undefined, connected.environment),
    ).rejects.toMatchObject({ code: "FINANCING_INTEGRITY_FAILED" });
    expect(photoFactory).not.toHaveBeenCalled();
  });
  it("refuses complete outputs beyond 20 MiB and never returns partial bytes", async () => {
    const report = await savedFinancingReport(store.env());
    const excessive = structuredClone(report);
    excessive.manifest.property.description = "x".repeat(FINANCING_OUTPUT_MAX_BYTES);
    expect(() => financingSiteHtml(excessive)).toThrow(/FINANCING_OUTPUT_TOO_LARGE/u);
    vi.spyOn(PDFDocument.prototype, "save").mockResolvedValue(
      new Uint8Array(FINANCING_OUTPUT_MAX_BYTES + 1),
    );
    await expect(financingReportPdf(report)).rejects.toMatchObject({
      code: "FINANCING_OUTPUT_TOO_LARGE",
    });
  });
  it("bounds PDF work at two in-flight renders and releases slots on completion", async () => {
    const report = await savedFinancingReport(store.env());
    const original = PDFDocument.create;
    let entered = 0;
    const renderGate = deferredSignal(),
      bothEntered = deferredSignal();
    vi.spyOn(PDFDocument, "create").mockImplementation(async (options) => {
      entered++;
      if (entered === 2) bothEntered.resolve();
      await renderGate.promise;
      return original(options);
    });
    const request = new Request("https://app.operation-automated-lo.test/output");
    const render = () =>
      handleFinancingOutput(
        request,
        {
          campaignRef: report.campaignRef,
          campaignVersionRef: report.campaignVersionRef,
          output: "flyer",
        },
        store.env(),
        financingPorts(),
      );
    const pending = [render(), render()];
    await bothEntered.promise;
    try {
      const refused = await render();
      expect(refused.status).toBe(429);
      expect(refused.headers.get("retry-after")).toBe("3");
    } finally {
      renderGate.resolve();
    }
    expect((await Promise.all(pending)).map((response) => response.status)).toEqual([200, 200]);
    expect((await render()).status).toBe(200);
  });
  it("retains six photographs and long content on supporting pages without shrinking comparison type", async () => {
    const { report, media } = await photoReport(5, 6, true);
    const html = financingSiteHtml(report, Date.parse("2026-10-13"), media);
    expect([...html.matchAll(/src="data:image/gu)]).toHaveLength(6);
    expect(html).toContain("Description ending retained.");
    const pdf = await PDFDocument.load(await financingReportPdf(report, media));
    const { streams, text } = readPdfText(pdf);
    expect(text).toContain("Description ending retained.");
    expect(text).toContain("Assumption ending retained.");
    expect(text).toContain("Supporting property photograph 6 of 6");
    expect(text.replaceAll(" ", "")).toContain(
      report.manifest.financing.scenarios[4]!.label.replaceAll(" ", ""),
    );
    const images = pdf.context
      .enumerateIndirectObjects()
      .filter(
        ([, obj]) =>
          obj instanceof PDFRawStream &&
          obj.dict.get(PDFName.of("Subtype"))?.toString() === "/Image",
      );
    expect(images).toHaveLength(6);
    expect(streams).toContain(" 10 Tf");
    expect(pdf.getPageCount()).toBeGreaterThan(6);
  });
});
