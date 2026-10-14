import { useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FinancingMediaInput } from "./media-input.js";
import type { FinancingFormDraft } from "./form-model.js";
import { installSelectLayoutForTest } from "../../testing/select-layout.test-support.js";

const first = `media_${"a".repeat(32)}`,
  second = `media_${"b".repeat(32)}`;
const result = {
  mediaRef: first,
  sha256: "c".repeat(64),
  mimeType: "image/jpeg",
  byteSize: 1000,
  width: 600,
  height: 400,
  normalizationVersion: "1.0.0",
  metadataRetained: false,
  rights: {
    schemaVersion: 1,
    basis: "owned",
    confirmed: true,
    attestedBy: "principal_test001",
    attestedAt: "2026-10-13T12:00:00.000Z",
    scope: "tenant-private-financing",
  },
};
function Harness({ initial = [] }: { initial?: FinancingFormDraft["media"] }) {
  const [media, setMedia] = useState(initial),
    [pending, setPending] = useState(false);
  return (
    <>
      <FinancingMediaInput
        media={media}
        disabled={false}
        change={setMedia}
        pendingChange={setPending}
      />
      <output aria-label="Pending upload">{String(pending)}</output>
      <output aria-label="Current placements">{JSON.stringify(media)}</output>
    </>
  );
}
function choose(file = new File(["photo"], "property.jpg", { type: "image/jpeg" })) {
  fireEvent.change(screen.getByLabelText("Choose a property photograph"), {
    target: { files: [file] },
  });
  fireEvent.click(screen.getByRole("combobox", { name: "Photograph usage rights" }));
  fireEvent.click(screen.getByRole("option", { name: "I own the photograph" }));
  fireEvent.change(screen.getByLabelText("Photograph description (alt text)"), {
    target: { value: "Front of a made-up home" },
  });
  fireEvent.click(
    screen.getByRole("checkbox", {
      name: "I confirm these rights allow this photograph in this account's private financing materials",
    }),
  );
  return file;
}
beforeEach(() => installSelectLayoutForTest());
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
describe("financing photograph input", () => {
  it("retains the selected file and original request on an uncertain upload, then accepts only opaque placement fields", async () => {
    const fetch = vi.fn(async (_url: unknown, _init?: RequestInit) =>
      Response.json({ error: "FINANCING_MEDIA_UNAVAILABLE" }, { status: 503 }),
    );
    vi.stubGlobal("fetch", fetch);
    render(<Harness />);
    const file = choose();
    fireEvent.click(screen.getByRole("button", { name: "Upload photograph" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Your file and rights choice are still here",
    );
    expect(screen.getByText("Selected photograph: property.jpg")).toBeInTheDocument();
    expect(screen.getByLabelText("Pending upload")).toHaveTextContent("true");
    fireEvent.click(screen.getByRole("button", { name: "Upload photograph" }));
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    expect(fetch.mock.calls[0]?.[1]?.body).toBe(file);
    expect(fetch.mock.calls[0]?.[1]?.headers).toEqual(fetch.mock.calls[1]?.[1]?.headers);
    fetch.mockResolvedValueOnce(Response.json(result));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Upload photograph" })).not.toBeDisabled(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Upload photograph" }));
    await waitFor(() => expect(screen.getByLabelText("Pending upload")).toHaveTextContent("false"));
    expect(JSON.parse(screen.getByLabelText("Current placements").textContent!)).toEqual([
      { mediaRef: first, altText: "Front of a made-up home" },
    ]);
    expect(screen.getByRole("img", { name: "Front of a made-up home" })).toHaveAttribute(
      "src",
      `/api/campaigns/property/financing/media/${first}`,
    );
  });
  it("requires rights confirmation, refuses wrong type or oversized file and rotates identity on selected-file change", async () => {
    const fetch = vi.fn(async (_url: unknown, _init?: RequestInit) =>
      Response.json({}, { status: 503 }),
    );
    vi.stubGlobal("fetch", fetch);
    render(<Harness />);
    expect(screen.getByRole("button", { name: "Upload photograph" })).toBeDisabled();
    choose(new File(["gif"], "bad.gif", { type: "image/gif" }));
    fireEvent.click(screen.getByRole("button", { name: "Upload photograph" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("JPEG or PNG");
    expect(screen.getByLabelText("Choose a property photograph")).toHaveAccessibleDescription(
      "Choose one JPEG or PNG photograph.",
    );
    expect(screen.getByLabelText("Choose a property photograph")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(fetch).not.toHaveBeenCalled();
    choose(new File([new Uint8Array(2_097_153)], "large.jpg", { type: "image/jpeg" }));
    fireEvent.click(screen.getByRole("button", { name: "Upload photograph" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("2 MiB");
    expect(fetch).not.toHaveBeenCalled();
    choose();
    fireEvent.click(screen.getByRole("button", { name: "Upload photograph" }));
    await screen.findByRole("alert");
    const initial = fetch.mock.calls[0]?.[1]?.headers;
    choose(new File(["new bytes"], "changed.jpg", { type: "image/jpeg" }));
    fireEvent.click(screen.getByRole("button", { name: "Upload photograph" }));
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    expect(fetch.mock.calls[1]?.[1]?.headers).not.toEqual(initial);
  });
  it("connects a missing photograph description to its governed field", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    render(<Harness />);
    choose();
    fireEvent.change(screen.getByLabelText("Photograph description (alt text)"), {
      target: { value: "" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Upload photograph" }));
    expect(screen.getByLabelText("Photograph description (alt text)")).toHaveAccessibleDescription(
      "Describe the photograph using 1 to 300 printable characters.",
    );
    expect(screen.getByLabelText("Photograph description (alt text)")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(fetch).not.toHaveBeenCalled();
  });
  it("selects and reorders the hero, removes only placements and caps the gallery at six", () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const view = render(
      <Harness
        initial={[
          { mediaRef: first, altText: "Front" },
          { mediaRef: second, altText: "Back" },
        ]}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Use photograph 2 as hero" }));
    expect(screen.getByLabelText("Photograph 1 description (alt text)")).toHaveValue("Back");
    fireEvent.click(screen.getByRole("button", { name: "Move photograph 1 later" }));
    expect(screen.getByLabelText("Photograph 1 description (alt text)")).toHaveValue("Front");
    fireEvent.click(screen.getByRole("button", { name: "Remove photograph 1" }));
    expect(fetch).not.toHaveBeenCalled();
    expect(screen.getByText(/does not revoke rights/)).toBeInTheDocument();
    view.unmount();
    render(
      <Harness
        initial={Array.from({ length: 6 }, (_, index) => ({
          mediaRef: `media_${String(index).repeat(32)}`,
          altText: `View ${index + 1}`,
        }))}
      />,
    );
    expect(screen.getByLabelText("Choose a property photograph")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Upload photograph" })).toBeDisabled();
  });
});
