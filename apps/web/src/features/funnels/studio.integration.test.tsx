import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FunnelCatalog, FunnelEditor } from "./studio.js";
import { FUNNELS } from "./catalog.js";
import { FunnelSaveSchema, type FunnelStudioContext } from "./model.js";

const context: FunnelStudioContext = {
  canSave: true,
  brandReady: true,
  brand: {
    name: "Alex Sample",
    company: "Sample Home Lending",
    nmls: "123456",
    companyNmls: "123456",
    colorPresetId: "forest",
    disclosure: "Example disclosure for testing.",
  },
  drafts: [],
  synthetic: true,
};
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
const stub = (status = 503) => {
  const fetch = vi.fn(async (_url: unknown, _init?: RequestInit) =>
    Response.json({ error: "FUNNEL_UNAVAILABLE" }, { status }),
  );
  vi.stubGlobal("fetch", fetch);
  return fetch;
};

describe("field-only funnel studio interactions", () => {
  it("lists exactly five template choices without an editable canvas", () => {
    const { container } = render(<FunnelCatalog context={context} />);
    expect(screen.getAllByRole("link", { name: "Edit funnel" })).toHaveLength(5);
    expect(container.querySelector("[contenteditable], [draggable='true']")).toBeNull();
  });
  it("reflects literal field edits across preview surfaces with no autosave", () => {
    const fetch = stub();
    render(<FunnelEditor kind="buyer" context={context} />);
    fireEvent.change(screen.getByLabelText("Main headline"), {
      target: { value: "<img src=x onerror=alert(1)> My home" },
    });
    expect(
      screen.getByRole("heading", { level: 2, name: "<img src=x onerror=alert(1)> My home" }),
    ).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent("Unsaved changes");
    expect(document.querySelector("img[src='x']")).toBeNull();
  });
  it("preserves exact edits and the request identity after an uncertain save", async () => {
    const fetch = stub();
    render(<FunnelEditor kind="refinance" context={context} />);
    fireEvent.change(screen.getByLabelText("Main headline"), {
      target: { value: "A mortgage plan for your next chapter" },
    });
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Your save could not be confirmed");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    expect(fetch.mock.calls[0]![1]?.body).toBe(fetch.mock.calls[1]![1]?.body);
    const body = FunnelSaveSchema.parse(JSON.parse(String(fetch.mock.calls[0]![1]?.body)));
    expect(body.fields.headline).toBe("A mortgage plan for your next chapter");
    expect(body).not.toHaveProperty("brand");
  });
  it("blocks unsafe media destinations locally and leaves the entered value visible", async () => {
    const fetch = stub();
    render(<FunnelEditor kind="on-demand" context={context} />);
    fireEvent.change(screen.getByLabelText("Edit section"), { target: { value: "details" } });
    fireEvent.change(screen.getByLabelText("Webinar video link (HTTPS)"), {
      target: { value: "javascript:alert(1)" },
    });
    await userEvent.setup().click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Check the highlighted fields");
    expect(fetch).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Webinar video link (HTTPS)")).toHaveValue("javascript:alert(1)");
    await userEvent.setup().click(screen.getByRole("button", { name: "Watch webinar" }));
    expect(document.querySelector('a[href^="javascript:"],video[src^="javascript:"]')).toBeNull();
    expect(
      screen.getByRole("heading", { level: 2, name: FUNNELS[1]!.defaults.confirmationTitle }),
    ).toHaveFocus();
  });
  it("never enables saving for a viewer or a workspace missing its required brand", () => {
    const { rerender } = render(
      <FunnelEditor kind="buyer" context={{ ...context, canSave: false }} />,
    );
    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
    expect(screen.getByLabelText("Main headline")).toBeDisabled();
    rerender(<FunnelEditor kind="buyer" context={{ ...context, brandReady: false }} />);
    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
  });
  it("previews the designed contact form and next page without collecting information", async () => {
    const fetch = stub();
    render(<FunnelEditor kind="live-webinar" context={context} fullPreview />);
    const user = userEvent.setup();
    await user.click(screen.getAllByRole("button", { name: FUNNELS[0]!.defaults.cta })[0]!);
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByLabelText("Email address")).toBeDisabled();
    await user.click(within(dialog).getByRole("button", { name: "Continue preview" }));
    expect(
      screen.getByRole("heading", { level: 2, name: FUNNELS[0]!.defaults.confirmationTitle }),
    ).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });
});
