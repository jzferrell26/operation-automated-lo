import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { ResolvedFinancingMedia } from "@oalo/application";
import { FINANCING_COPY as COPY } from "../copy/financing-messages.js";
import { financingDate, financingGroups, financingMoney } from "../features/financing/display.js";
import type { FinancingReportView } from "../features/financing/model.js";
import { adBrandColorValue } from "../features/workspace/ad-brand.js";
import {
  financingPropertyFacts,
  FINANCING_V1_PHOTO_NOTICE,
} from "../features/financing/property-display.js";
import { financingOutputMedia, FINANCING_OUTPUT_MAX_BYTES } from "./financing-output-media.js";

export class FinancingRenderError extends Error {
  constructor(public readonly code: "FINANCING_FONT_UNSUPPORTED" | "FINANCING_OUTPUT_TOO_LARGE") {
    super(code);
    this.name = "FinancingRenderError";
  }
}

/** A deterministic print report, not a photo flyer or a live-rate quote. All totals are saved values. */
export async function financingReportPdf(
  report: FinancingReportView,
  resolvedMedia?: readonly ResolvedFinancingMedia[],
): Promise<Uint8Array> {
  const { manifest } = report;
  const v2 = manifest.schemaVersion === 2;
  const media = v2 ? financingOutputMedia(report, resolvedMedia) : [];
  const scenarios = manifest.financing.scenarios;
  const landscape = scenarios.length > 3;
  const width = landscape ? 792 : 612,
    height = landscape ? 612 : 792,
    margin = 36;
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica),
    bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const accentHex = adBrandColorValue(manifest.preparation.brand.colorPresetId);
  const accent = rgb(
    ...([1, 3, 5].map(
      (offset) => Number.parseInt(accentHex.slice(offset, offset + 2), 16) / 255,
    ) as [number, number, number]),
  );
  const ink = rgb(0.08, 0.17, 0.26),
    muted = rgb(0.29, 0.36, 0.44),
    pale = rgb(0.94, 0.96, 0.98);
  let page = pdf.addPage([width, height]),
    y = height - 62;
  const decorate = () => {
    page.drawRectangle({ x: 0, y: height - 6, width, height: 6, color: accent });
    page.drawText("FINANCING COMPARISON | PRIVATE DRAFT", {
      x: margin,
      y: height - 31,
      size: 8,
      font: bold,
      color: muted,
    });
  };
  const newPage = () => {
    page = pdf.addPage([width, height]);
    y = height - 62;
    decorate();
  };
  const reserve = (needed: number) => {
    if (y - needed < 52) newPage();
  };
  function wrap(text: string, available: number, size: number, strong = false): string[] {
    const font = strong ? bold : regular,
      lines: string[] = [];
    for (const paragraph of text.split(/\r?\n/u)) {
      let rest = paragraph.trim();
      while (rest.length) {
        let lo = 1,
          hi = rest.length;
        while (lo < hi) {
          const mid = Math.ceil((lo + hi) / 2);
          if (font.widthOfTextAtSize(rest.slice(0, mid), size) <= available) lo = mid;
          else hi = mid - 1;
        }
        const lastSpace = rest.lastIndexOf(" ", lo);
        const count = lo < rest.length && lastSpace > 0 ? lastSpace : lo;
        lines.push(rest.slice(0, count));
        rest = rest.slice(count).trimStart();
      }
      if (!paragraph.trim()) lines.push("");
    }
    return lines;
  }
  function text(textValue: string, size = v2 ? 10 : 9, strong = false) {
    const lines = wrap(textValue, width - margin * 2, size, strong);
    const paragraphHeight = lines.length * size * 1.4 + 6;
    // Keep ordinary v2 paragraphs together, while long descriptions can still continue.
    if (v2 && paragraphHeight <= height - 114) reserve(paragraphHeight);
    for (const line of lines) {
      reserve(size * 1.4);
      page.drawText(line, {
        x: margin,
        y: y - size,
        size,
        font: strong ? bold : regular,
        color: strong ? ink : muted,
      });
      y -= size * 1.4;
    }
    y -= 6;
  }
  const available = width - margin * 2,
    labelWidth = landscape ? 185 : 175,
    column = (available - labelWidth) / scenarios.length;
  function tableRow(label: string, values: readonly string[], strong = false, header = false) {
    const size = v2 ? 10 : 8.5;
    const lineHeight = v2 ? 14 : 11.5;
    const cells = [
      wrap(label, labelWidth - 12, size, strong),
      ...values.map((value) => wrap(value, column - 12, size, strong)),
    ];
    const rowHeight = Math.max(...cells.map((cell) => cell.length)) * lineHeight + 10;
    if (y - rowHeight < 52) {
      newPage();
      if (!header)
        tableRow(
          "Comparison continued",
          scenarios.map((s) => s.label),
          true,
          true,
        );
    }
    if (strong)
      page.drawRectangle({
        x: margin,
        y: y - rowHeight,
        width: available,
        height: rowHeight,
        color: pale,
      });
    cells.forEach((lines, index) => {
      const x = index === 0 ? margin + 6 : margin + labelWidth + (index - 1) * column + 6;
      lines.forEach((line, lineIndex) =>
        page.drawText(line, {
          x,
          y: y - 8 - size - lineIndex * lineHeight,
          size,
          font: strong ? bold : regular,
          color: ink,
        }),
      );
    });
    y -= rowHeight;
    page.drawLine({
      start: { x: margin, y },
      end: { x: width - margin, y },
      thickness: 0.4,
      color: rgb(0.82, 0.87, 0.91),
    });
  }
  async function photograph(item: ResolvedFinancingMedia, maxHeight: number, followingHeight = 0) {
    const embedded =
      item.snapshot.mimeType === "image/jpeg"
        ? await pdf.embedJpg(item.bytes)
        : await pdf.embedPng(item.bytes);
    const captionHeight = wrap(item.snapshot.altText, available, 10).length * 14 + 6;
    const scale = Math.min(
      available / embedded.width,
      Math.min(maxHeight, y - 52 - captionHeight - followingHeight - 10) / embedded.height,
    );
    const imageWidth = embedded.width * scale,
      imageHeight = embedded.height * scale;
    reserve(imageHeight + 10 + captionHeight + followingHeight);
    page.drawImage(embedded, {
      x: margin + (available - imageWidth) / 2,
      y: y - imageHeight,
      width: imageWidth,
      height: imageHeight,
    });
    y -= imageHeight + 10;
    text(item.snapshot.altText, 10);
  }
  try {
    decorate();
    if (v2 && media[0]) await photograph(media[0], landscape ? 190 : 220);
    text(manifest.property.address, 22, true);
    text(manifest.property.description, 10);
    if (manifest.schemaVersion === 2) {
      for (const [label, value] of financingPropertyFacts(manifest.property.facts))
        text(`${label}: ${value}`, 11, true);
      text(
        "Property facts confirmed by the author. List price is separate from illustrated purchase price.",
        10,
      );
      if (!media.length) text("No property photographs selected for this private comparison.", 10);
    }
    text(
      `Illustrated purchase price: ${financingMoney(manifest.financing.purchasePriceMinor)}`,
      11,
      true,
    );
    if (v2 && !landscape) {
      text("Your options at a glance", 12, true);
      for (const [index, scenario] of scenarios.entries()) {
        const result = manifest.calculated.scenarios[index];
        if (!result) throw new Error("Saved financing result missing.");
        reserve(54);
        text(scenario.label, 11, true);
        text(
          `Estimated monthly housing: ${financingMoney(result.totalHousingMinor)} | Estimated cash at closing: ${financingMoney(result.cashToCloseMinor)}`,
          10,
        );
      }
    }
    text(COPY.privateNotice, 8.5);
    if (v2) {
      text(
        landscape
          ? "Extended landscape comparison: four or five scenarios."
          : "Portrait comparison: up to three scenarios.",
        10,
      );
      // A photo-led cover never squeezes the complete accounting table into its remaining space.
      newPage();
    }
    tableRow(
      "Your financing options",
      scenarios.map((s) => s.label),
      true,
      true,
    );
    for (const group of financingGroups(manifest)) {
      reserve(64);
      y -= 10;
      text(group.title.toUpperCase(), 10, true);
      for (const row of group.rows) tableRow(row.label, row.values, row.emphasis);
    }
    y -= 14;
    text(COPY.noteMonthly, 8.5);
    text(COPY.noteCash, 8.5);
    newPage();
    text("Your property and lending team", 18, true);
    for (const [label, identity] of [
      ["Realtor partner", manifest.identities.realtor],
      ["Loan officer", manifest.identities.lender],
    ] as const) {
      reserve(95);
      text(label.toUpperCase(), 10, true);
      text(`${identity.name} | ${identity.company}`, 12, true);
      text([identity.phone, identity.email, identity.license].filter(Boolean).join(" | "), 9);
    }
    text("Quote inputs and itemized costs", 16, true);
    text(COPY.noteQuotes, 9);
    for (const s of scenarios) {
      reserve(110);
      text(s.label, 12, true);
      text(`Quote source: ${s.quote.source}`);
      text(
        `Issued: ${financingDate(s.quote.quotedAt)} | Valid until: ${financingDate(s.quote.expiresAt)}`,
      );
      text(s.quote.confirmed ? COPY.quoteConfirmed : COPY.quoteUnconfirmed);
      if (s.quote.aprMilliPercent === null) text(COPY.aprMissing);
      text(`Assumptions: ${s.assumptions || COPY.unknown}`);
      for (const cost of s.costs)
        text(
          `${cost.label}: ${financingMoney(cost.amountMinor)} (${cost.category}${cost.paidBeforeClosing ? "; already paid" : ""})`,
        );
      if (!s.costsComplete)
        text("Cost list is not confirmed complete. Missing totals are not shown as zero.");
    }
    reserve(100);
    text("Review and disclosures", 12, true);
    text(
      manifest.property.permissionConfirmed && manifest.partner.permissionConfirmed
        ? COPY.permissionsRecorded
        : COPY.permissionsMissing,
    );
    text(manifest.content.disclosureText);
    text(
      v2
        ? media.length
          ? "Uploaded property photographs. Usage rights recorded for this private comparison only."
          : "Text-only comparison selected by the author."
        : FINANCING_V1_PHOTO_NOTICE,
    );
    text(COPY.privateNotice);
    if (v2) {
      text(
        `Saved ${financingDate(report.createdAt)}. Property template ${manifest.templateVersion}.`,
        10,
      );
      for (const [index, item] of media.slice(1).entries()) {
        newPage();
        text(`Supporting property photograph ${index + 2} of ${media.length}`, 16, true);
        const savedPhoto = `Saved photograph ${index + 2}. Normalization ${item.snapshot.normalizationVersion}.`;
        const tailHeight =
          (wrap(savedPhoto, available, 10).length +
            wrap(COPY.privateNotice, available, 10).length) *
            14 +
          12;
        await photograph(item, height - 190, tailHeight);
        text(savedPhoto, 10);
        text(COPY.privateNotice, 10);
      }
    }
    if (pdf.getPageCount() > (v2 ? 64 : 16))
      throw new FinancingRenderError("FINANCING_OUTPUT_TOO_LARGE");
    pdf
      .getPages()
      .forEach((item, index) =>
        item.drawText(
          `PRIVATE DRAFT | Version ${report.versionNo} | Calculation ${manifest.calculated.calculationVersion} | ${index + 1} of ${pdf.getPageCount()}`,
          { x: margin, y: 25, size: 7.5, font: regular, color: muted },
        ),
      );
    pdf.setTitle(`Private financing report: ${manifest.property.address}`);
    pdf.setSubject(COPY.privateNotice);
    pdf.setCreator(
      v2 ? "AutomatedLO financing report 2.0.0" : "AutomatedLO financing report 1.0.0",
    );
    pdf.setCreationDate(new Date(report.createdAt));
    pdf.setModificationDate(new Date(report.createdAt));
    const bytes = await pdf.save();
    if (bytes.byteLength > FINANCING_OUTPUT_MAX_BYTES)
      throw new FinancingRenderError("FINANCING_OUTPUT_TOO_LARGE");
    return bytes;
  } catch (error) {
    if (error instanceof Error && /WinAnsi|cannot encode/iu.test(error.message))
      throw new FinancingRenderError("FINANCING_FONT_UNSUPPORTED");
    throw error;
  }
}
