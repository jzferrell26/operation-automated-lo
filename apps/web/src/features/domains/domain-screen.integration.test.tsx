import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DomainScreen } from "./domain-screen.js";
import { domainFixture, domainState } from "./domain.test-support.js";
import { type DomainState, type DomainStatus } from "./model.js";
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
function requests(initial: DomainState, later: (Response | Error)[] = []) {
  const queue = [Response.json(initial), ...later];
  const network = vi.fn(async (_path: string, _options?: RequestInit) => {
    const value = queue.shift();
    if (value instanceof Error) throw value;
    return value ?? Response.json(initial);
  });
  vi.stubGlobal("fetch", network);
  return network;
}
async function loaded() {
  await screen.findByText("Latest saved domain state loaded.");
}
describe("guided domain setup", () => {
  it("announces a blocked initial read through the shared loading card without offering writes", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise<Response>(() => {})),
    );
    render(<DomainScreen />);
    const loading = screen.getByRole("status", { name: "Domain settings" });
    expect(loading).toHaveAttribute("data-state", "loading");
    expect(loading).toHaveAttribute("data-surface", "card");
    expect(loading).toHaveAttribute("aria-busy", "true");
    expect(loading).toHaveTextContent("Loading domain settings.");
    expect(screen.getByRole("button", { name: "Load latest saved state" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Review connection" })).toBeNull();
  });
  it("announces a failed initial read through the shared error card and permits only safe reload", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("private network detail")));
    render(<DomainScreen />);
    const failure = await screen.findByRole("alert", { name: "Domain settings need attention" });
    expect(failure).toHaveAttribute("data-state", "error");
    expect(failure).toHaveAttribute("data-surface", "card");
    expect(failure).toHaveAttribute("aria-live", "assertive");
    expect(screen.queryByText("private network detail")).toBeNull();
    expect(screen.getByRole("button", { name: "Load latest saved state" })).toBeEnabled();
    expect(screen.queryByRole("button", { name: "Review connection" })).toBeNull();
  });
  it("explains session edit restrictions through the shared permission card without a role chooser", async () => {
    requests(domainState(domainFixture(), { canEdit: false }));
    render(<DomainScreen />);
    await loaded();
    const restricted = screen.getByRole("status", { name: "Domain settings are view-only" });
    expect(restricted).toHaveAttribute("data-state", "permission_restricted");
    expect(restricted).toHaveAttribute("data-surface", "card");
    expect(restricted).toHaveTextContent(
      "This session can view domain settings. Changes are unavailable here.",
    );
    expect(restricted).toHaveTextContent("Your current session cannot change domain settings.");
    expect(restricted).toHaveTextContent(
      "Your signed-in loan officer session with access to change these settings.",
    );
    expect(restricted).toHaveTextContent(
      "Account support can help restore access for your session.",
    );
    expect(screen.queryByRole("combobox")).toBeNull();
    expect(screen.getByRole("button", { name: "Disconnect domain" })).toBeDisabled();
  });
  it("keeps the saved host and safe disconnect alongside the shared unavailable card", async () => {
    requests(domainState(domainFixture(), { available: false }));
    render(<DomainScreen />);
    await loaded();
    const degraded = screen.getByRole("status", { name: "Domain connection is unavailable" });
    expect(degraded).toHaveAttribute("data-state", "degraded");
    expect(degraded).toHaveAttribute("data-surface", "card");
    expect(degraded).toHaveTextContent("Your saved record is shown below");
    expect(screen.getByRole("heading", { name: "offers.loanoffice.com" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Check domain" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Disconnect domain" })).toBeEnabled();
  });
  it("does not let a pending check race a disconnect", async () => {
    let finish: ((response: Response) => void) | undefined;
    const pending = new Promise<Response>((resolve) => {
      finish = resolve;
    });
    const current = domainFixture();
    const network = vi
      .fn()
      .mockResolvedValueOnce(Response.json(domainState(current)))
      .mockReturnValueOnce(pending);
    vi.stubGlobal("fetch", network);
    const user = userEvent.setup();
    render(<DomainScreen />);
    await loaded();
    await user.click(screen.getByRole("button", { name: "Check domain" }));
    expect(screen.getByRole("button", { name: "Disconnect domain" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Load latest saved state" })).toBeDisabled();
    expect(network).toHaveBeenCalledTimes(2);
    finish?.(Response.json({ error: "DOMAIN_CONFLICT" }, { status: 409 }));
    await screen.findByRole("alert");
    expect(screen.getByRole("button", { name: "Disconnect domain" })).toBeDisabled();
  });
  it("uses the existing CSRF header and safe current-revision payload", async () => {
    const meta = document.createElement("meta");
    meta.name = "oalo-csrf-token";
    meta.content = "synthetic-session-proof";
    document.head.append(meta);
    try {
      const current = domainFixture();
      const network = requests(domainState(current), [Response.json({ domain: current })]);
      const user = userEvent.setup();
      render(<DomainScreen />);
      await loaded();
      await user.click(screen.getByRole("button", { name: "Check domain" }));
      await screen.findByText("Domain check finished. Review the saved status below.");
      expect(network.mock.calls[1]?.[1]).toMatchObject({
        headers: { "content-type": "application/json", "x-csrf-token": "synthetic-session-proof" },
        credentials: "same-origin",
        redirect: "error",
      });
    } finally {
      meta.remove();
    }
  });
  it("fails closed on an extended initial response without exposing its secret fields", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(Response.json({ ...domainState(), providerToken: "private-fixture" })),
    );
    render(<DomainScreen />);
    await screen.findByRole("alert");
    expect(screen.queryByRole("button", { name: "Review connection" })).toBeNull();
    expect(screen.queryByText("private-fixture")).toBeNull();
    expect(screen.getByRole("button", { name: "Load latest saved state" })).toBeEnabled();
  });
  it("validates before confirmation and preserves field focus", async () => {
    const network = requests(domainState());
    const user = userEvent.setup();
    render(<DomainScreen />);
    await loaded();
    await user.type(screen.getByLabelText("Domain or subdomain"), "https://bad.com/path");
    await user.click(screen.getByRole("button", { name: "Review connection" }));
    expect(screen.getByLabelText("Domain or subdomain")).toHaveFocus();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(network).toHaveBeenCalledTimes(1);
  });
  it("confirms exact hostname, normalizes it and guards duplicate writes", async () => {
    const network = requests(domainState(), [Response.json({ domain: domainFixture() })]);
    const user = userEvent.setup();
    render(<DomainScreen />);
    await loaded();
    await user.type(screen.getByLabelText("Domain or subdomain"), "Offers.LoanOffice.com.");
    await user.click(screen.getByRole("button", { name: "Review connection" }));
    const modal = screen.getByRole("dialog", { name: "Connect this domain?" });
    expect(modal).toHaveTextContent("offers.loanoffice.com");
    expect(network).toHaveBeenCalledTimes(1);
    await user.dblClick(within(modal).getByRole("button", { name: "Confirm connection" }));
    await screen.findByText("Connection saved. Add the ownership record to continue.");
    expect(network).toHaveBeenCalledTimes(2);
    expect(JSON.parse(String(network.mock.calls[1]?.[1]?.body))).toEqual({
      action: "connect",
      hostname: "offers.loanoffice.com",
      apex: false,
      defaultKind: "live-webinar",
      confirmed: true,
    });
  });
  it("Escape cancels confirmation and restores focus without connecting", async () => {
    const network = requests(domainState());
    const user = userEvent.setup();
    render(<DomainScreen />);
    await loaded();
    await user.type(screen.getByLabelText("Domain or subdomain"), "offers.loanoffice.com");
    const trigger = screen.getByRole("button", { name: "Review connection" });
    await user.click(trigger);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(trigger).toHaveFocus();
    expect(network).toHaveBeenCalledTimes(1);
  });
  it.each([
    "ownership_needed",
    "hosting_needed",
    "dns_needed",
    "certificate_needed",
    "attention",
    "ready",
    "disconnected",
  ] as const)("shows honest next steps for %s", async (status: DomainStatus) => {
    requests(
      domainState(
        domainFixture({
          status,
          claimed: status === "ready",
          readyUntil: status === "ready" ? "2035-01-01T00:00:00.000Z" : null,
        }),
      ),
    );
    render(<DomainScreen />);
    await loaded();
    expect(screen.getByRole("heading", { name: "offers.loanoffice.com" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /https:/u })).toBeNull();
    if (status === "ready")
      expect(screen.getByText("HTTPS passed the latest check.")).toBeInTheDocument();
    else expect(screen.queryByText("HTTPS passed the latest check.")).toBeNull();
  });
  it("blocks cooldown and expired proof, rather than calling it ready", async () => {
    requests(
      domainState(
        domainFixture({
          status: "ready",
          claimed: true,
          readyUntil: "2020-01-01T00:00:00.000Z",
          nextCheckAt: "2035-01-01T00:00:00.000Z",
        }),
      ),
    );
    render(<DomainScreen />);
    await loaded();
    expect(screen.getByText("Proof expired")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Check domain" })).toBeDisabled();
  });
  it("shows actual provider records and copies exact values, with safe failure guidance", async () => {
    const record = {
      type: "CNAME" as const,
      name: "offers.loanoffice.com",
      value: "actual-provider-target.host.com",
      purpose: "routing" as const,
    };
    requests(
      domainState(
        domainFixture({ status: "dns_needed", records: [...domainFixture().records, record] }),
      ),
    );
    const user = userEvent.setup();
    const clipboard = { writeText: vi.fn().mockResolvedValue(undefined) };
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: clipboard });
    render(<DomainScreen />);
    await loaded();
    await user.click(screen.getByRole("button", { name: "Copy value for record 2" }));
    expect(clipboard.writeText).toHaveBeenCalledWith(record.value);
    expect(screen.getByText("Copied record 2 value.")).toBeInTheDocument();
    clipboard.writeText.mockRejectedValueOnce(new Error("secret"));
    await user.click(screen.getByRole("button", { name: "Copy name for record 2" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Select and copy");
    expect(screen.queryByText("secret")).toBeNull();
  });
  it("disconnects with deliberate confirmation when the provider is disabled", async () => {
    const current = domainFixture();
    const network = requests(domainState(current, { available: false }), [
      Response.json({ domain: { ...current, status: "disconnected" } }),
    ]);
    const user = userEvent.setup();
    render(<DomainScreen />);
    await loaded();
    expect(screen.getByRole("button", { name: "Check domain" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Disconnect domain" }));
    await user.click(screen.getByRole("button", { name: "Confirm disconnect" }));
    await screen.findByText("Domain disconnected.");
    expect(JSON.parse(String(network.mock.calls[1]?.[1]?.body))).toEqual({
      action: "disconnect",
      id: current.id,
      expectedRevision: current.revision,
    });
  });
  it("keeps reconnect's saved kind and requires fresh confirmation", async () => {
    const current = domainFixture({ status: "disconnected", defaultKind: "refinance" });
    const network = requests(domainState(current), [Response.json({ domain: domainFixture() })]);
    const user = userEvent.setup();
    render(<DomainScreen />);
    await loaded();
    await user.type(screen.getByLabelText("Domain or subdomain"), current.hostname);
    await user.click(screen.getByRole("button", { name: "Review connection" }));
    await user.click(screen.getByRole("button", { name: "Confirm connection" }));
    await screen.findByText("Connection saved. Add the ownership record to continue.");
    expect(JSON.parse(String(network.mock.calls[1]?.[1]?.body)).defaultKind).toBe("refinance");
  });
  it("does not expose edits or manufacture verification for a read-only session", async () => {
    requests(domainState(domainFixture(), { canEdit: false }));
    render(<DomainScreen />);
    await loaded();
    expect(screen.getByRole("button", { name: "Check domain" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Disconnect domain" })).toBeDisabled();
  });
  it.each([
    Response.json({ error: "DOMAIN_CONFLICT" }, { status: 409 }),
    new Error("private network error"),
    Response.json({ domain: { bad: true } }),
  ])("requires current-state reload after a refused or uncertain change", async (failure) => {
    const current = domainFixture();
    const next = domainFixture({ revision: "33333333-3333-4333-8333-333333333333" });
    const network = requests(domainState(current), [
      failure,
      Response.json(domainState(next)),
      Response.json({ domain: { ...next, status: "certificate_needed" } }),
    ]);
    const user = userEvent.setup();
    render(<DomainScreen />);
    await loaded();
    await user.click(screen.getByRole("button", { name: "Check domain" }));
    await screen.findByRole("alert");
    expect(screen.getByRole("button", { name: "Check domain" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Load latest saved state" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Check domain" })).toBeEnabled());
    await user.click(screen.getByRole("button", { name: "Check domain" }));
    await screen.findByText("Domain check finished. Review the saved status below.");
    expect(JSON.parse(String(network.mock.calls[3]?.[1]?.body)).expectedRevision).toBe(
      next.revision,
    );
  });
  it("keeps typed input through a lost connect response and reload", async () => {
    requests(domainState(), [new Error("lost"), Response.json(domainState())]);
    const user = userEvent.setup();
    render(<DomainScreen />);
    await loaded();
    const input = screen.getByLabelText("Domain or subdomain");
    await user.type(input, "offers.loanoffice.com");
    await user.click(screen.getByRole("button", { name: "Review connection" }));
    await user.click(screen.getByRole("button", { name: "Confirm connection" }));
    await screen.findByRole("alert");
    expect(input).toHaveValue("offers.loanoffice.com");
    expect(input).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Load latest saved state" }));
    await waitFor(() => expect(input).toBeEnabled());
    expect(input).toHaveValue("offers.loanoffice.com");
  });
});
