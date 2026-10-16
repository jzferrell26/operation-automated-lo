import { describe, expect, it, vi, afterEach } from "vitest";
import { GET as siteGet, HEAD as siteHead } from "./[publicationId]/route.js";
import { GET as pdfGet, HEAD as pdfHead } from "./[publicationId]/report.pdf/route.js";
import { GET as mediaGet, HEAD as mediaHead } from "./[publicationId]/media/[assetRef]/route.js";
import { POST as inquiryPost } from "./[publicationId]/inquiry/route.js";

const id = "00000000-0000-4000-8000-000000000001";
const resource = "a".repeat(64);
afterEach(() => vi.unstubAllEnvs());
describe("exported public financing routes", () => {
  it.each([
    { call: siteGet, suffix: "", params: { publicationId: id }, method: "GET" },
    { call: siteHead, suffix: "", params: { publicationId: id }, method: "HEAD" },
    { call: pdfGet, suffix: "/report.pdf", params: { publicationId: id }, method: "GET" },
    { call: pdfHead, suffix: "/report.pdf", params: { publicationId: id }, method: "HEAD" },
    {
      call: mediaGet,
      suffix: `/media/${resource}`,
      params: { publicationId: id, assetRef: resource },
      method: "GET",
    },
    {
      call: mediaHead,
      suffix: `/media/${resource}`,
      params: { publicationId: id, assetRef: resource },
      method: "HEAD",
    },
  ])(
    "$method $suffix stays off with sanitized no-store refusal",
    async ({ call, suffix, params, method }) => {
      vi.stubEnv("OALO_FINANCING_PUBLIC_ENABLED", "false");
      const response = await call(
        new Request(`https://reports.example.com/p/${id}${suffix}`, {
          method,
          headers: { host: "reports.example.com" },
        }),
        { params: Promise.resolve({ ...params, assetRef: resource }) },
      );
      expect(response.status).toBe(404);
      expect(response.headers.get("cache-control")).toContain("no-store");
      expect(response.headers.get("x-robots-tag")).toContain("noindex");
      expect(await response.text()).toBe(method === "HEAD" ? "" : "This report is unavailable.");
    },
  );
  it("form POST refuses unconfigured inquiry composition without storing visitor plaintext", async () => {
    vi.stubEnv("OALO_FINANCING_PUBLIC_ENABLED", "false");
    const request = new Request(`https://reports.example.com/p/${id}/inquiry`, {
      method: "POST",
      headers: {
        host: "reports.example.com",
        origin: "https://reports.example.com",
        "content-type": "application/x-www-form-urlencoded",
      },
      body: "firstName=Synthetic&email=synthetic%40example.com&consent=true&honeypot=&intent=buying",
    });
    const response = await inquiryPost(request, { params: Promise.resolve({ publicationId: id }) });
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("Synthetic");
    expect(request.bodyUsed).toBe(false);
  });
});
