import { PDFDocument, PDFRawStream, decodePDFRawStream } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { buildHomeReport } from "@oalo/application/homeowner-reports";
import { HomeReportSchema, type HomeReport } from "@oalo/contracts";
import { homeownerInput, homeownerValuation } from "../../server/homeowners/homeowner-fixtures.js";
import { createHomeReportPdf } from "./report-pdf.js";

/**
 * PRD-007 acceptance item 6, the PDF half: "Dates and stale/missing data remain visible in both
 * outputs." The on-screen report says when a source is more than 35 days old
 * (`report-view.tsx`); the downloaded file has to say the same, because it is the copy that gets
 * forwarded, printed and read later, away from the screen that would have warned about it.
 */

const createdAt = new Date("2026-09-24T12:00:00Z");
const thirtyNineDaysLater = new Date("2026-11-02T12:00:00Z");

function reportFor(source: "confirmed" | "unknown"): HomeReport {
  const input = homeownerInput(createdAt);
  return buildHomeReport(
    source === "confirmed"
      ? input
      : {
          ...input,
          mortgage: {
            source: "unknown",
            firstBalanceMinor: null,
            otherBalanceMinor: null,
            allLiensConfirmed: false,
            asOf: input.mortgage.asOf,
            loan: null,
          },
        },
    homeownerValuation(createdAt),
    `hreport_${"b".repeat(32)}`,
    `home_${"b".repeat(32)}`,
    createdAt,
  );
}

/** The words drawn on every page, in order, with each wrapped line joined by one space. */
async function textOf(bytes: Uint8Array): Promise<string> {
  const document = await PDFDocument.load(bytes);
  const drawn: string[] = [];
  for (const [, object] of document.context.enumerateIndirectObjects()) {
    if (!(object instanceof PDFRawStream)) continue;
    const content = Buffer.from(decodePDFRawStream(object).decode()).toString("latin1");
    for (const shown of content.matchAll(/<([0-9A-Fa-f]+)>\s*Tj/gu))
      drawn.push(Buffer.from(shown[1]!, "hex").toString("latin1"));
  }
  return drawn.join(" ").replace(/\s+/gu, " ");
}

describe("the downloadable PDF, for a report whose sources have aged", () => {
  it("says nothing about age while both sources are current", async () => {
    const text = await textOf(await createHomeReportPdf(reportFor("confirmed"), createdAt));
    expect(text).not.toContain("more than 35 days old");
    expect(text).toContain("Retrieved Sep 24, 2026");
    expect(text).toContain("Mortgage input date Sep 24, 2026");
  });

  it("says when the valuation and the mortgage information are both more than 35 days old", async () => {
    const text = await textOf(
      await createHomeReportPdf(reportFor("confirmed"), thirtyNineDaysLater),
    );
    expect(text).toContain("This valuation is more than 35 days old.");
    expect(text).toContain("The mortgage information is more than 35 days old.");
    expect(text).toContain("Review the source dates before making plans.");
    // The dates stay beside the warning, so a reader can see how old each source is.
    expect(text).toContain("Retrieved Sep 24, 2026");
    expect(text).toContain("Mortgage input date Sep 24, 2026");
  });

  it("names only the valuation when no mortgage information was supplied", async () => {
    const text = await textOf(await createHomeReportPdf(reportFor("unknown"), thirtyNineDaysLater));
    expect(text).toContain("This valuation is more than 35 days old.");
    expect(text).not.toContain("The mortgage information is more than 35 days old.");
    expect(text).toContain("Mortgage information unknown");
  });

  it("keeps a missing range and unknown debt visible instead of filling them in", async () => {
    const report = HomeReportSchema.parse({
      ...reportFor("unknown"),
      valuation: { ...homeownerValuation(createdAt), lowMinor: null, highMinor: null },
    });
    const text = await textOf(await createHomeReportPdf(report, createdAt));
    expect(text).toContain("Estimated range: not supplied by the valuation service.");
    expect(text).toContain("An absent balance is not treated as zero.");
    expect(text).toContain("Estimated equity Unavailable");
  });
});
