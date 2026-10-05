import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PROPERTY_PACKAGE_COPY as COPY } from "../../copy/property-package-messages.js";
import { PropertyPackagePanel, type PropertyPackagePanelProps } from "./property-package-panel.js";

const callbacks = vi.hoisted(() => ({ reload: vi.fn(), generated: vi.fn() }));
vi.mock("./package-model.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./package-model.js")>()),
  reloadPropertyPackagePage: callbacks.reload,
}));
const PROPS: PropertyPackagePanelProps = {
  campaignRef: "campaign_panelTest001",
  campaignVersionRef: "campaignversion_panelTest001",
  sourceManifestHash: "a".repeat(64),
  canGenerate: true,
  state: { kind: "not_generated" },
  onGenerated: callbacks.generated,
};
const SUMMARY = {
  packageRef: "package_panelTest001",
  campaignRef: PROPS.campaignRef,
  campaignVersionRef: PROPS.campaignVersionRef,
  sourceManifestHash: PROPS.sourceManifestHash,
  sourceVersionNo: 1,
  templateVersion: "1.0.0" as const,
  generatedAt: "2026-10-05T15:00:00Z",
  reviewOnly: true as const,
  pageCount: 1,
  hashes: { page: "a".repeat(64), flyer: "b".repeat(64), qr: "c".repeat(64), copy: "d".repeat(64) },
};

beforeEach(() => {
  callbacks.reload.mockReset();
  callbacks.generated.mockReset();
});
afterEach(() => vi.unstubAllGlobals());
function mockResponse(
  status = 200,
  body: unknown = { package: SUMMARY, providerPublicationAuthorized: false },
) {
  const fetch = vi.fn(async (_url: unknown, _init?: RequestInit) =>
    Response.json(body, { status }),
  );
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

describe("private campaign materials panel", () => {
  it("offers only generation until the complete package is confirmed", async () => {
    const fetch = mockResponse();
    render(<PropertyPackagePanel {...PROPS} />);
    expect(screen.queryByRole("link", { name: COPY.flyer })).toBeNull();
    expect(screen.getByText(COPY.boundary)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: COPY.generate }));
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: COPY.ready })).toBeInTheDocument(),
    );
    expect(JSON.parse(String(fetch.mock.calls[0]?.[1]?.body))).toEqual({
      campaignRef: PROPS.campaignRef,
      campaignVersionRef: PROPS.campaignVersionRef,
      sourceManifestHash: PROPS.sourceManifestHash,
    });
    expect(screen.getAllByRole("link")).toHaveLength(4);
    expect(screen.getByRole("link", { name: COPY.flyer })).toHaveAttribute(
      "href",
      "/api/campaigns/property/package/campaign_panelTest001/campaignversion_panelTest001/flyer",
    );
    expect(screen.getByRole("img", { name: COPY.qrAlt })).toHaveAttribute(
      "src",
      "/api/campaigns/property/package/campaign_panelTest001/campaignversion_panelTest001/qr",
    );
    expect(screen.getByText(COPY.privateQr)).toBeInTheDocument();
    expect(callbacks.generated).toHaveBeenCalledExactlyOnceWith(SUMMARY);
    expect(callbacks.reload).not.toHaveBeenCalled();
  });

  it("does not dispatch twice while generation is pending", async () => {
    let resolve: ((value: Response) => void) | undefined;
    const fetch = vi.fn(
      () =>
        new Promise<Response>((done) => {
          resolve = done;
        }),
    );
    vi.stubGlobal("fetch", fetch);
    render(<PropertyPackagePanel {...PROPS} />);
    const button = screen.getByRole("button", { name: COPY.generate });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(fetch).toHaveBeenCalledOnce();
    expect(button).toBeDisabled();
    resolve?.(Response.json({ error: "PROPERTY_PACKAGE_UNAVAILABLE" }, { status: 503 }));
    await waitFor(() => expect(button).toBeEnabled());
  });

  it.each([
    [503, "PROPERTY_PACKAGE_UNAVAILABLE", COPY.failed],
    [422, "PROPERTY_PACKAGE_FONT_UNSUPPORTED", COPY.font],
    [409, "PROPERTY_PACKAGE_STALE", COPY.stale],
    [429, "PROPERTY_PACKAGE_BUSY", COPY.busy],
  ])(
    "shows a recoverable %s refusal without false download links",
    async (status, code, message) => {
      mockResponse(Number(status), { error: code });
      render(<PropertyPackagePanel {...PROPS} />);
      fireEvent.click(screen.getByRole("button", { name: COPY.generate }));
      expect(await screen.findByRole("alert")).toHaveTextContent(String(message));
      expect(screen.queryByRole("link", { name: COPY.flyer })).toBeNull();
      expect(screen.getByRole("button", { name: COPY.generate })).toBeEnabled();
      expect(callbacks.generated).not.toHaveBeenCalled();
      expect(callbacks.reload).not.toHaveBeenCalled();
    },
  );

  it("lets a viewer open existing files but not create a new package", () => {
    const { rerender } = render(<PropertyPackagePanel {...PROPS} canGenerate={false} />);
    expect(screen.getByRole("button", { name: COPY.generate })).toBeDisabled();
    expect(screen.getByText(COPY.role)).toBeInTheDocument();
    rerender(
      <PropertyPackagePanel
        {...PROPS}
        canGenerate={false}
        state={{ kind: "ready", summary: SUMMARY }}
      />,
    );
    expect(screen.getAllByRole("link")).toHaveLength(4);
    expect(screen.queryByRole("button", { name: COPY.generate })).toBeNull();
  });

  it("does not turn an unavailable package store into an empty or ready state", () => {
    const fetch = mockResponse();
    render(<PropertyPackagePanel {...PROPS} state={{ kind: "unavailable" }} />);
    expect(screen.getByText(COPY.unavailable)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: COPY.generate })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: COPY.reload }));
    expect(callbacks.reload).toHaveBeenCalledOnce();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("refuses a successful response for another source version", async () => {
    mockResponse(200, {
      package: { ...SUMMARY, sourceManifestHash: "f".repeat(64) },
      providerPublicationAuthorized: false,
    });
    render(<PropertyPackagePanel {...PROPS} />);
    fireEvent.click(screen.getByRole("button", { name: COPY.generate }));
    expect(await screen.findByRole("alert")).toHaveTextContent(COPY.failed);
    expect(screen.queryByRole("link", { name: COPY.flyer })).toBeNull();
  });
});
