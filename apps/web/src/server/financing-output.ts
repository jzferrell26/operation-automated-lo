import { financingFailure, financingResponse, readFinancingOutput } from "./financing-http.js";
import { financingSiteHtml } from "./financing-html.js";
import { FinancingRenderError, financingReportPdf } from "./financing-pdf.js";
import { propertyDraftHtmlCsp } from "./property-package-html.js";
import { PRIVATE_PACKAGE_HEADERS } from "./property-package-http.js";
import { resolveRuntimeCampaignCommandPorts } from "./runtime-authentication.js";
import type { CampaignCommandPorts } from "./authenticated-principal.js";

let activePdfRenders = 0;
/** Private authenticated render from an immutable comparison. No public asset or approval is minted. */
export async function handleFinancingOutput(
  request: Request,
  params: unknown,
  environment: unknown = process.env,
  ports: CampaignCommandPorts = resolveRuntimeCampaignCommandPorts(environment),
): Promise<Response> {
  try {
    const { params: parsed, report } = await readFinancingOutput(
      request,
      params,
      environment,
      ports,
    );
    const headers = new Headers(PRIVATE_PACKAGE_HEADERS);
    if (parsed.output === "site") {
      const html = financingSiteHtml(report);
      headers.set("content-type", "text/html; charset=utf-8");
      headers.set("content-security-policy", propertyDraftHtmlCsp(html));
      return new Response(html, { headers });
    }
    if (activePdfRenders >= 2) {
      const response = financingResponse({ error: "FINANCING_BUSY" }, 429);
      response.headers.set("retry-after", "3");
      return response;
    }
    activePdfRenders++;
    try {
      const bytes = await financingReportPdf(report);
      headers.set("content-type", "application/pdf");
      headers.set(
        "content-disposition",
        `attachment; filename="financing-report-v${report.versionNo}-draft.pdf"`,
      );
      headers.set("content-security-policy", "default-src 'none'; frame-ancestors 'none'; sandbox");
      return new Response(new Uint8Array(bytes), { headers });
    } finally {
      activePdfRenders--;
    }
  } catch (error) {
    if (error instanceof FinancingRenderError) return financingResponse({ error: error.code }, 422);
    return financingFailure(error);
  }
}
