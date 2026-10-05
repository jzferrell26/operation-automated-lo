import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PROPERTY_CAMPAIGN_COPY as COPY } from "../../copy/property-campaign-messages.js";
import { type PropertyCampaignFormData, PropertyCampaignRequestSchema } from "./model.js";
import { PropertyCampaignForm } from "./property-campaign-form.js";

const mocked = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation.js", () => ({ useRouter: () => ({ push: mocked.push }) }));

const DATA: PropertyCampaignFormData = {
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
    { id: "00000000-0000-4000-8000-000000000002", name: "Taylor Sample", company: "Example Homes" },
  ],
};

const SAVED = {
  campaignRef: "campaign_0123456789abcdef0123456789abcdef",
  versionNo: 1,
  providerPublicationAuthorized: false,
};

beforeEach(() => {
  mocked.push.mockReset();
  // jsdom has no layout. Give the real portalled Select an in-viewport trigger rectangle.
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    x: 20,
    y: 20,
    top: 20,
    bottom: 64,
    left: 20,
    right: 420,
    width: 400,
    height: 44,
    toJSON: () => ({}),
  });
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
      unobserve() {}
    },
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function stubSave(status = 200, body: unknown = SAVED) {
  const fetch = vi.fn(async (_url: unknown, _init?: RequestInit) =>
    Response.json(body, { status }),
  );
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

async function fill() {
  fireEvent.change(screen.getByLabelText(COPY.addressLabel), {
    target: { value: "123 Example Street, Dallas" },
  });
  fireEvent.change(screen.getByLabelText(COPY.descriptionLabel), {
    target: { value: "A made-up property for campaign testing." },
  });
  fireEvent.change(screen.getByLabelText(COPY.startsLabel), {
    target: { value: "2030-06-12T18:00" },
  });
  fireEvent.change(screen.getByLabelText(COPY.endsLabel), {
    target: { value: "2030-06-12T20:00" },
  });
  const user = userEvent.setup();
  await user.click(screen.getByRole("combobox", { name: COPY.stateLabel }));
  await user.click(screen.getByRole("option", { name: "Texas" }));
  await user.click(screen.getByRole("combobox", { name: COPY.partnerLabel }));
  await user.click(screen.getByRole("option", { name: "Jordan Sample, Example Realty" }));
}

describe("property preparation interactions", () => {
  it("starts with no selected partner, no consent, and a clear no-publication boundary", () => {
    render(<PropertyCampaignForm data={DATA} />);
    expect(screen.getByRole("heading", { level: 1, name: COPY.title })).toBeInTheDocument();
    expect(screen.getByText(COPY.boundary)).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: COPY.partnerLabel })).toHaveTextContent(
      COPY.partnerPlaceholder,
    );
    for (const checkbox of screen.getAllByRole("checkbox")) expect(checkbox).not.toBeChecked();
    expect(screen.queryByRole("button", { name: /launch|approve|publish/iu })).toBeNull();
  });

  it("submits only preparation input and navigates to the validated saved campaign", async () => {
    const fetch = stubSave();
    render(<PropertyCampaignForm data={DATA} />);
    await fill();
    await userEvent.setup().click(screen.getByRole("button", { name: COPY.save }));
    await waitFor(() =>
      expect(mocked.push).toHaveBeenCalledWith(`/marketing/campaigns/${SAVED.campaignRef}`),
    );
    expect(fetch).toHaveBeenCalledTimes(1);
    const [path, init] = fetch.mock.calls[0]!;
    expect(path).toBe("/api/campaigns/property");
    const input = PropertyCampaignRequestSchema.parse(JSON.parse(String(init?.body)));
    expect(input).toMatchObject({
      stateCode: "TX",
      partnerId: DATA.partners[0]?.id,
      propertyPermissionConfirmed: false,
      realtorPermissionConfirmed: false,
    });
    expect(input.startsAt).toBe(new Date("2030-06-12T18:00").toISOString());
    expect(init).toMatchObject({
      credentials: "same-origin",
      cache: "no-store",
      redirect: "error",
    });
    expect(screen.getByRole("button", { name: COPY.saved })).toBeDisabled();
  });

  it("preserves the form and request key after an uncertain save", async () => {
    const fetch = stubSave(503, { error: "PROPERTY_CAMPAIGN_SAVE_FAILED" });
    render(<PropertyCampaignForm data={DATA} />);
    await fill();
    await userEvent.setup().click(screen.getByRole("button", { name: COPY.save }));
    expect(await screen.findByRole("alert")).toHaveTextContent(COPY.saveFailed);
    expect(screen.getByLabelText(COPY.addressLabel)).toHaveValue("123 Example Street, Dallas");
    await userEvent.setup().click(screen.getByRole("button", { name: COPY.save }));
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    expect(fetch.mock.calls[0]?.[1]?.body).toBe(fetch.mock.calls[1]?.[1]?.body);
    expect(mocked.push).not.toHaveBeenCalled();
  });

  it("does not create a different draft automatically after a conflicting retry", async () => {
    const fetch = stubSave(409, { error: "PROPERTY_CAMPAIGN_SAVE_CONFLICT" });
    render(<PropertyCampaignForm data={DATA} />);
    await fill();
    await userEvent.setup().click(screen.getByRole("button", { name: COPY.save }));
    expect(await screen.findByRole("alert")).toHaveTextContent(COPY.conflict);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(screen.getAllByRole("link", { name: COPY.campaigns })[0]).toHaveAttribute(
      "href",
      "/marketing/campaigns",
    );
  });

  it("blocks invalid input locally and keeps the entered values", async () => {
    const fetch = stubSave();
    render(<PropertyCampaignForm data={DATA} />);
    await fill();
    fireEvent.change(screen.getByLabelText(COPY.endsLabel), {
      target: { value: "2030-06-11T20:00" },
    });
    await userEvent.setup().click(screen.getByRole("button", { name: COPY.save }));
    expect(await screen.findByRole("alert")).toHaveTextContent(COPY.invalid);
    expect(screen.getByLabelText(COPY.endsLabel)).toHaveAttribute("aria-invalid", "true");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("clears the identity attestation when the selected Realtor changes", async () => {
    render(<PropertyCampaignForm data={DATA} />);
    await fill();
    const user = userEvent.setup();
    await user.click(screen.getByRole("checkbox", { name: COPY.partnerPermission }));
    expect(screen.getByRole("checkbox", { name: COPY.partnerPermission })).toBeChecked();
    await user.click(screen.getByRole("combobox", { name: COPY.partnerLabel }));
    await user.click(screen.getByRole("option", { name: "Taylor Sample, Example Homes" }));
    expect(screen.getByRole("checkbox", { name: COPY.partnerPermission })).not.toBeChecked();
  });

  it.each([
    ["missing brand", { brandReady: false }],
    ["no partners", { partners: [] }],
    ["read-only role", { canSave: false }],
  ])("disables saving with %s instead of inventing setup", (_label, change) => {
    render(<PropertyCampaignForm data={{ ...DATA, ...change }} />);
    expect(screen.getByRole("button", { name: COPY.save })).toBeDisabled();
    expect(screen.getByLabelText(COPY.addressLabel)).toBeDisabled();
  });

  it("does not navigate from a malformed successful response", async () => {
    stubSave(200, { campaignRef: "https://evil.example", providerPublicationAuthorized: true });
    render(<PropertyCampaignForm data={DATA} />);
    await fill();
    await userEvent.setup().click(screen.getByRole("button", { name: COPY.save }));
    expect(await screen.findByRole("alert")).toHaveTextContent(COPY.saveFailed);
    expect(mocked.push).not.toHaveBeenCalled();
  });
});
