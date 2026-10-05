import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import {
  DRAFT_NOTICE,
  NO_PHOTO_NOTICE,
  PREVIEW_NOTICE,
  PropertyPackageError,
  type PropertyPackageDocument,
} from "./property-package-content.js";

/** Measured wrapping, including long unbroken words. No ellipsis or silent glyph substitution. */
function measuredLines(text: string, font: PDFFont, size: number, width: number): string[] {
  const result: string[] = [];
  for (const paragraph of text.split(/\r?\n/u)) {
    let remaining = paragraph.trim();
    while (remaining.length > 0) {
      let low = 1,
        high = remaining.length;
      while (low < high) {
        const middle = Math.ceil((low + high) / 2);
        if (font.widthOfTextAtSize(remaining.slice(0, middle), size) <= width) low = middle;
        else high = middle - 1;
      }
      const lastSpace = remaining.lastIndexOf(" ", low);
      const end = low < remaining.length && lastSpace > 0 ? lastSpace : low;
      result.push(remaining.slice(0, end));
      remaining = remaining.slice(end).trimStart();
    }
  }
  return result;
}

/** Uses the existing pdf-lib runtime, so no hosted browser binary or render service is needed. */
export async function propertyDraftPdf(
  document: PropertyPackageDocument,
  qr: Readonly<{ path: string; viewBoxSize: number }>,
  generatedAt: string,
): Promise<Readonly<{ bytes: Uint8Array; pageCount: number }>> {
  const pdf = await PDFDocument.create();
  const normal = await pdf.embedFont(StandardFonts.Helvetica);
  const strong = await pdf.embedFont(StandardFonts.HelveticaBold);
  const channel = (offset: number) =>
    Number.parseInt(document.accent.slice(offset, offset + 2), 16) / 255;
  const accent = rgb(channel(1), channel(3), channel(5));
  const ink = rgb(0.09, 0.17, 0.26);
  const muted = rgb(0.28, 0.36, 0.46);
  let page = pdf.addPage([612, 792]);
  let cursor = 720;

  function decorate() {
    page.drawRectangle({ x: 0, y: 784, width: 612, height: 8, color: accent });
    page.drawText(DRAFT_NOTICE, { x: 44, y: 750, size: 9, font: strong, color: muted });
  }
  function reserve(height: number) {
    if (cursor - height >= 58) return;
    page = pdf.addPage([612, 792]);
    cursor = 720;
    decorate();
  }
  function block(text: string, size = 10.5, bold = false, width = 524) {
    const font = bold ? strong : normal;
    const lines = measuredLines(text, font, size, width);
    for (const line of lines) {
      reserve(size * 1.45);
      page.drawText(line, { x: 44, y: cursor - size, size, font, color: bold ? accent : ink });
      cursor -= size * 1.45;
    }
    cursor -= 8;
  }
  function heading(text: string) {
    reserve(64);
    cursor -= 8;
    block(text, 13, true);
  }

  try {
    decorate();
    block("OPEN HOUSE", 11, true);
    block(document.address, 25, true);
    block(document.eventLabel, 11, true);
    block(document.description);
    block(NO_PHOTO_NOTICE, 9);
    heading("YOUR OPEN HOUSE TEAM");
    block(`Realtor: ${document.realtor} | ${document.brokerage}`, 11);
    block(`Loan officer: ${document.loanOfficer} | ${document.lender}`, 11);
    block(document.nmls, 9);
    const reviewLines =
      measuredLines(document.permissions, normal, 9.5, 524).length +
      measuredLines(document.disclosure, normal, 9.5, 524).length;
    // Keep the short review/disclosure section and its QR together instead of orphaning a
    // required disclosure at the top of the next page when a long description fills the cover.
    reserve(reviewLines * 9.5 * 1.45 + 190);
    heading("REVIEW AND PERMISSIONS");
    block(document.permissions, 9.5);
    block(document.disclosure, 9.5);

    reserve(135);
    const qrTop = cursor;
    page.drawSvgPath(qr.path, {
      x: 448,
      y: qrTop,
      scale: 110 / qr.viewBoxSize,
      color: rgb(0, 0, 0),
    });
    block("PRIVATE PAGE PREVIEW", 11, true, 370);
    block(PREVIEW_NOTICE, 10, false, 370);
    block(
      "The QR opens this saved version for authorized workspace members. It is not a public lead-capture link.",
      9,
      false,
      370,
    );
    cursor = Math.min(cursor, qrTop - 125);

    const pageCount = pdf.getPageCount();
    if (pageCount > 12) throw new PropertyPackageError("PROPERTY_PACKAGE_INVALID_SOURCE", 400);
    pdf.getPages().forEach((item, index) => {
      item.drawText(
        `${DRAFT_NOTICE} | Version ${document.versionNo} | ${index + 1} of ${pageCount}`,
        {
          x: 44,
          y: 28,
          font: normal,
          size: 8,
          color: muted,
        },
      );
    });
    pdf.setTitle(`Draft open house flyer: ${document.address}`);
    pdf.setSubject("Internal campaign review. Not approved for public distribution.");
    pdf.setCreator("AutomatedLO property package 1.0.0");
    pdf.setCreationDate(new Date(generatedAt));
    pdf.setModificationDate(new Date(generatedAt));
    return { bytes: await pdf.save(), pageCount };
  } catch (error) {
    if (error instanceof Error && /WinAnsi|cannot encode/iu.test(error.message)) {
      throw new PropertyPackageError("PROPERTY_PACKAGE_FONT_UNSUPPORTED", 422);
    }
    throw error;
  }
}
