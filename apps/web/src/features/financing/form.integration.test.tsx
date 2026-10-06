import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FinancingForm } from "./form.js";
import { FINANCING_COPY as COPY } from "../../copy/financing-messages.js";
import { FinancingRequestSchema, type FinancingFormContext } from "./model.js";
import { financingInput } from "../../server/financing.test-support.js";

const mocked = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation.js", () => ({ useRouter: () => ({ push: mocked.push }) }));
const REF = "campaign_0123456789abcdef0123456789abcdef";
const context = (): FinancingFormContext => ({
  canSave: true,
  synthetic: false,
  brandReady: true,
  brandName: "Alex Morgan",
  partners: [
    {
      id: "00000000-0000-4000-8000-000000000001",
      name: "Jordan Sample",
      company: "Example Realty",
    },
  ],
  previous: [{ campaignRef: REF, label: "An earlier saved report", input: financingInput() }],
});
const result = {
  campaignRef: REF,
  campaignVersionRef: "campaignversion_0123456789abcdef0123456789abcdef",
  providerPublicationAuthorized: false,
};
function stubSave(status = 200, body: unknown = result) {
  const fetch = vi.fn(async (_url: unknown, _init?: RequestInit) =>
    Response.json(body, { status }),
  );
  vi.stubGlobal("fetch", fetch);
  return fetch;
}
beforeEach(() => {
  mocked.push.mockReset();
  installSelectLayoutForTest();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("financing report form interactions", () => {
  it("opens a saved setup with no repeat layout work and clears confirmations", () => {
    render(<FinancingForm context={context()} source={REF} />);
    expect(screen.getByLabelText("Purchase price ($)")).toHaveValue("400000.00");
    expect(screen.getByLabelText("Note rate %")).toHaveValue("6.000");
    for (const checkbox of screen.getAllByRole("checkbox")) expect(checkbox).not.toBeChecked();
    expect(screen.getByText(COPY.repeatNotice)).toBeInTheDocument();
    expect(screen.queryByLabelText("Starts")).toBeNull();
  });
  it("submits a reused draft without browser-owned branding or calculated values", async () => {
    const fetch = stubSave();
    render(<FinancingForm context={context()} source={REF} />);
    await userEvent.setup().click(screen.getByRole("button", { name: COPY.save }));
    await waitFor(() => expect(mocked.push).toHaveBeenCalledWith(`/marketing/campaigns/${REF}`));
    const [url, init] = fetch.mock.calls[0]!;
    expect(url).toBe("/api/campaigns/property/financing");
    const input = FinancingRequestSchema.parse(JSON.parse(String(init?.body)));
    expect(input.financing.purchasePriceMinor).toBe(40_000_000);
    expect(input).not.toHaveProperty("brand");
    expect(input).not.toHaveProperty("calculated");
    expect(screen.getByRole("button", { name: COPY.saved })).toBeDisabled();
  });
  it("preserves all entries and the retry key when the save is uncertain", async () => {
    const fetch = stubSave(503, { error: "FINANCING_UNAVAILABLE" });
    render(<FinancingForm context={context()} source={REF} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: COPY.save }));
    expect(await screen.findByRole("alert")).toHaveTextContent(COPY.failed);
    await user.click(screen.getByRole("button", { name: COPY.save }));
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    expect(fetch.mock.calls[0]?.[1]?.body).toBe(fetch.mock.calls[1]?.[1]?.body);
    expect(screen.getByLabelText("Purchase price ($)")).toHaveValue("400000.00");
  });
  it("rejects an arbitrary redirect in a malformed success response", async () => {
    stubSave(200, { ...result, campaignRef: "https://untrusted.example" });
    render(<FinancingForm context={context()} source={REF} />);
    await userEvent.setup().click(screen.getByRole("button", { name: COPY.save }));
    expect(await screen.findByRole("alert")).toHaveTextContent(COPY.failed);
    expect(mocked.push).not.toHaveBeenCalled();
  });
  it("requires explicit zero rather than silently rounding extra decimals", async () => {
    const fetch = stubSave();
    render(<FinancingForm context={context()} source={REF} />);
    fireEvent.change(screen.getByLabelText("Purchase price ($)"), {
      target: { value: "400000.999" },
    });
    await userEvent.setup().click(screen.getByRole("button", { name: COPY.save }));
    expect(await screen.findByRole("alert")).toHaveTextContent(COPY.invalid);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("adds up to five independent options and never offers a sixth", async () => {
    render(<FinancingForm context={context()} source={REF} />);
    const user = userEvent.setup();
    for (let index = 0; index < 4; index++)
      await user.click(screen.getByRole("button", { name: "Add comparison option" }));
    expect(screen.getByRole("button", { name: "Add comparison option" })).toBeDisabled();
    expect(document.querySelectorAll("details > summary")).toHaveLength(10); // five scenarios and five cost sections
  });
  it("clears author quote confirmation after an amount changes", async () => {
    render(<FinancingForm context={context()} source={REF} />);
    const user = userEvent.setup();
    const checkbox = screen.getByRole("checkbox", {
      name: "I have checked these inputs against the stated quote source",
    });
    await user.click(checkbox);
    expect(checkbox).toBeChecked();
    fireEvent.change(screen.getByLabelText("Note rate %"), { target: { value: "6.125" } });
    expect(checkbox).not.toBeChecked();
  });
  it.each([{ canSave: false }, { brandReady: false }, { partners: [] }])(
    "blocks unavailable setup %j",
    (change) => {
      render(<FinancingForm context={{ ...context(), ...change }} source={REF} />);
      expect(screen.getByRole("button", { name: COPY.save })).toBeDisabled();
      expect(screen.getByLabelText("Property address")).toBeDisabled();
    },
  );
  it("does not double-submit while the first request is pending", async () => {
    let release: ((response: Response) => void) | undefined;
    const fetch = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          release = resolve;
        }),
    );
    vi.stubGlobal("fetch", fetch);
    const view = render(<FinancingForm context={context()} source={REF} />);
    const form = view.container.querySelector("form")!;
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(fetch).toHaveBeenCalledTimes(1);
    release?.(Response.json(result));
    await waitFor(() => expect(mocked.push).toHaveBeenCalled());
  });
  it("offers a safe return to campaigns after a changed-key conflict", async () => {
    stubSave(409, { error: "FINANCING_SAVE_CONFLICT" });
    render(<FinancingForm context={context()} source={REF} />);
    await userEvent.setup().click(screen.getByRole("button", { name: COPY.save }));
    expect(await screen.findByRole("alert")).toHaveTextContent(COPY.conflict);
    expect(
      within(document.querySelector("header")!).getByRole("link", { name: COPY.back }),
    ).toHaveAttribute("href", "/marketing/campaigns");
  });
});
import { installSelectLayoutForTest } from "../../testing/select-layout.test-support.js";
