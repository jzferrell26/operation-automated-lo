import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { HomeReportSchema, type HomeReport } from "@oalo/contracts";
import { homeAddressText, homeDate, homeMoney } from "./model.js";

/** Pure snapshot rendering. No data lookup or network request occurs when a PDF is opened. */
export async function createHomeReportPdf(input: HomeReport): Promise<Uint8Array> {
  const report = HomeReportSchema.parse(input);
  const document = await PDFDocument.create();
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const navy = rgb(0.07, 0.14, 0.27),
    blue = rgb(0.15, 0.33, 0.82),
    ink = rgb(0.11, 0.14, 0.19),
    muted = rgb(0.35, 0.4, 0.47),
    light = rgb(0.94, 0.96, 0.98);
  let page: PDFPage = document.addPage([612, 792]);
  let y = 740;
  const wrap = (text: string, font: PDFFont, size: number, width: number) => {
    const lines: string[] = [];
    let line = "";
    for (const word of text.split(/\s+/u)) {
      if (font.widthOfTextAtSize(`${line}${line ? " " : ""}${word}`, size) <= width) {
        line += `${line ? " " : ""}${word}`;
        continue;
      }
      if (line) lines.push(line);
      line = "";
      for (const char of word) {
        if (font.widthOfTextAtSize(line + char, size) > width) {
          lines.push(line);
          line = "";
        }
        line += char;
      }
    }
    if (line) lines.push(line);
    return lines.length ? lines : [""];
  };
  const ensure = (height: number) => {
    if (y - height < 68) {
      page = document.addPage([612, 792]);
      y = 740;
    }
  };
  const paragraph = (
    text: string,
    options: {
      size?: number;
      strong?: boolean;
      color?: ReturnType<typeof rgb>;
      width?: number;
      x?: number;
    } = {},
  ) => {
    const size = options.size ?? 10,
      font = options.strong ? bold : regular;
    const lines = wrap(text, font, size, options.width ?? 524);
    for (const line of lines) {
      ensure(size * 1.5);
      page.drawText(line, {
        x: options.x ?? 44,
        y: y - size,
        size,
        font,
        color: options.color ?? ink,
      });
      y -= size * 1.5;
    }
    y -= 5;
  };
  const section = (title: string) => {
    ensure(60);
    y -= 10;
    page.drawLine({
      start: { x: 44, y: y + 7 },
      end: { x: 568, y: y + 7 },
      thickness: 0.6,
      color: light,
    });
    paragraph(title, { size: 14, strong: true, color: navy });
  };
  const row = (label: string, value: string) => {
    const left = wrap(label, regular, 10, 260),
      right = wrap(value, bold, 11, 235);
    const height = Math.max(left.length, right.length) * 16 + 12;
    ensure(height);
    left.forEach((line, index) =>
      page.drawText(line, { x: 44, y: y - 11 - index * 16, size: 10, font: regular, color: muted }),
    );
    right.forEach((line, index) =>
      page.drawText(line, { x: 325, y: y - 11 - index * 16, size: 11, font: bold, color: ink }),
    );
    y -= height;
  };
  try {
    const preparedFor = `${report.input.association === "property_only" ? "Property valuation report" : `Prepared for ${report.input.contactName}`} | ${homeDate(report.createdAt)}`;
    const headerHeight =
      64 +
      wrap(report.input.brand.company, bold, 15, 524).length * 22.5 +
      wrap(homeAddressText(report.input.address), bold, 16, 524).length * 24 +
      wrap(preparedFor, regular, 10, 524).length * 15 +
      33.5;
    page.drawRectangle({
      x: 0,
      y: 792 - headerHeight,
      width: 612,
      height: headerHeight,
      color: navy,
    });
    y = 752;
    paragraph(report.input.brand.company, { strong: true, size: 15, color: rgb(1, 1, 1) });
    paragraph("YOUR HOME, IN PERSPECTIVE", { size: 9, color: rgb(0.7, 0.82, 0.98) });
    paragraph(homeAddressText(report.input.address), {
      size: 16,
      strong: true,
      color: rgb(1, 1, 1),
    });
    paragraph(preparedFor, {
      size: 10,
      color: rgb(0.85, 0.9, 0.98),
    });
    y = 792 - headerHeight - 24;
    paragraph(
      report.valuation.source === "sample"
        ? "FICTIONAL SAMPLE ESTIMATE"
        : "ESTIMATED PROPERTY VALUE",
      { size: 9, strong: true, color: muted },
    );
    paragraph(homeMoney(report.valuation.valueMinor), { size: 36, strong: true, color: blue });
    paragraph(
      report.valuation.lowMinor !== null && report.valuation.highMinor !== null
        ? `Estimated range: ${homeMoney(report.valuation.lowMinor)} to ${homeMoney(report.valuation.highMinor)}`
        : "Estimated range: not supplied by the valuation service.",
      { size: 11 },
    );
    paragraph(
      `Source: ${report.valuation.source === "sample" ? "Fictional demonstration data" : "RentCast automated valuation"}. Retrieved ${homeDate(report.valuation.retrievedAt)}. This is not an appraisal or a guaranteed sale value.`,
      { size: 9, color: muted },
    );
    section("Your equity picture");
    row("Estimated property value", homeMoney(report.valuation.valueMinor));
    row("First mortgage balance", homeMoney(report.financials.firstBalanceMinor));
    row("Other secured loan balances", homeMoney(report.input.mortgage.otherBalanceMinor));
    row("Total secured debt", homeMoney(report.financials.totalDebtMinor));
    row("Estimated equity", homeMoney(report.financials.equityMinor));
    if (report.financials.equityLowMinor !== null && report.financials.equityHighMinor !== null)
      row(
        "Equity range",
        `${homeMoney(report.financials.equityLowMinor)} to ${homeMoney(report.financials.equityHighMinor)}`,
      );
    row(
      "Combined loan-to-value",
      report.financials.combinedLtvPercent === null
        ? "Unavailable"
        : `${report.financials.combinedLtvPercent}%`,
    );
    paragraph(
      report.financials.totalDebtMinor === null
        ? "Equity is unavailable because the secured loan balances have not all been confirmed. An absent balance is not treated as zero."
        : "Estimated equity is property value minus the supplied secured balances. It is not sale proceeds or an amount approved for borrowing.",
      { size: 9, color: muted },
    );
    section("Property details");
    row(
      "Property type / year built",
      `${report.valuation.propertyType ?? "Unavailable"} / ${report.valuation.yearBuilt?.toString() ?? "Unavailable"}`,
    );
    row(
      "Bedrooms / bathrooms",
      `${report.valuation.bedrooms ?? "Unavailable"} / ${report.valuation.bathrooms ?? "Unavailable"}`,
    );
    row(
      "Living area",
      report.valuation.squareFeet === null
        ? "Unavailable"
        : `${report.valuation.squareFeet.toLocaleString("en-US")} square feet`,
    );
    section("Comparable listings");
    paragraph(
      "These are comparable listing prices, not verified closed-sale prices. Differences in condition, location and timing affect value.",
      { size: 9, color: muted },
    );
    for (const comparable of report.valuation.comparables) {
      ensure(75);
      paragraph(comparable.address, { size: 11, strong: true });
      paragraph(
        `${homeMoney(comparable.priceMinor)} listed | ${comparable.squareFeet?.toLocaleString("en-US") ?? "Unknown area"} sq ft | ${comparable.distanceMiles === null ? "Distance unavailable" : `${comparable.distanceMiles.toFixed(1)} miles`}`,
        { size: 10 },
      );
      paragraph(
        `${comparable.listingStatus ?? "Status unavailable"}${comparable.lastSeenAt ? ` | Last observed ${homeDate(comparable.lastSeenAt)}` : ""}`,
        { size: 9, color: muted },
      );
    }
    if (!report.valuation.comparables.length) paragraph("No comparable listings were supplied.");
    section("Sources and assumptions");
    const sourceLabels = {
      confirmed: "Confirmed balances",
      amortized: "Scheduled-payment balance estimate",
      debt_free: "No secured debt declared",
      unknown: "Mortgage information unknown",
    };
    row("Mortgage information", sourceLabels[report.input.mortgage.source]);
    row("Mortgage input date", homeDate(report.input.mortgage.asOf));
    if (report.input.mortgage.loan) {
      const loan = report.input.mortgage.loan;
      paragraph(
        `Balance calculation uses a ${homeMoney(loan.originalPrincipalMinor)} original loan amount, ${loan.annualRatePercent}% fixed annual interest, ${loan.termMonths} months and ${loan.paymentsMade} completed payments. It excludes missed payments, modifications, fees and extra repayments.`,
        { size: 9, color: muted },
      );
    }
    paragraph(
      "Values and balances are estimates or supplied inputs as of the dates shown. This report is informational, not a loan offer, approval, appraisal, payoff statement or financial recommendation. Loan availability depends on lender terms and verification. Equal Housing Opportunity.",
      { size: 9, color: muted },
    );
    section("Let's talk about your next step");
    paragraph(report.input.brand.name, { size: 13, strong: true });
    paragraph(report.input.brand.tagline || "Review the details with your loan officer.");
    paragraph(
      [
        report.input.brand.email,
        report.input.brand.phone,
        report.input.brand.nmls ? `NMLS ${report.input.brand.nmls}` : "",
        report.input.brand.companyNmls ? `Company NMLS ${report.input.brand.companyNmls}` : "",
      ]
        .filter(Boolean)
        .join(" | "),
      { size: 10 },
    );
    const pages = document.getPages();
    pages.forEach((item, index) =>
      item.drawText(
        `AutomatedLO  |  ${report.valuation.source === "sample" ? "Fictional sample report" : "Homeowner report"}  |  ${index + 1} of ${pages.length}`,
        { x: 44, y: 32, font: regular, size: 8, color: muted },
      ),
    );
    document.setTitle("Homeowner value and equity report");
    document.setCreator("AutomatedLO");
    document.setCreationDate(new Date(report.createdAt));
    document.setModificationDate(new Date(report.createdAt));
    return await document.save();
  } catch (error) {
    if (error instanceof Error && /encode|WinAnsi/u.test(error.message))
      throw new Error(
        "This report includes characters the downloadable PDF font cannot display. Use Print, then Save as PDF, to preserve the full text.",
      );
    throw error;
  }
}
