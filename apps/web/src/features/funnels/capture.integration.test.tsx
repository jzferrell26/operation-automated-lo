import { render, screen, waitFor, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { FunnelSurface } from "./surface.js";
import { FUNNELS } from "./catalog.js";
import { FunnelCaptureError, type FunnelCapture } from "./visitor-model.js";

const brand = {
  name: "Alex Example",
  company: "Example Lending",
  nmls: "123456",
  companyNmls: "123457",
  disclosure: "Example disclosure",
  colorPresetId: "navy",
};
function surface(capture: FunnelCapture, date = "2030-10-12T18:00:00Z") {
  const step = vi.fn();
  render(
    <FunnelSurface
      kind="live-webinar"
      fields={{ ...FUNNELS[0]!.defaults, eventStartsAt: date }}
      brand={brand}
      step="landing"
      onStep={step}
      capture={capture}
      published
    />,
  );
  return step;
}
async function fill() {
  const user = userEvent.setup();
  await user.click(screen.getAllByRole("button", { name: "Save my seat" })[0]!);
  const form = within(screen.getByRole("dialog"));
  await user.type(form.getByLabelText("First name", { exact: true }), "Example");
  await user.type(form.getByLabelText("Email address", { exact: true }), "visitor@example.org");
  await user.click(form.getByRole("checkbox"));
  return { user, form };
}
describe("real visitor recovery", () => {
  it("keeps the same key and values after an uncertain save, then navigates only on confirmation", async () => {
    const capture = vi
      .fn<FunnelCapture>()
      .mockRejectedValueOnce(new Error("network interrupted"))
      .mockResolvedValue({ accepted: true });
    const step = surface(capture);
    const { user, form } = await fill();
    await user.click(form.getByRole("button", { name: "Save my seat" }));
    expect(await form.findByRole("alert")).toHaveTextContent("Retry with the same details");
    expect(step).not.toHaveBeenCalled();
    expect(form.getByLabelText("Email address", { exact: true })).toHaveValue(
      "visitor@example.org",
    );
    await user.click(form.getByRole("button", { name: "Save my seat" }));
    await waitFor(() => expect(step).toHaveBeenCalledWith("confirmation"));
    expect(capture.mock.calls[0]?.[0]).toEqual(capture.mock.calls[1]?.[0]);
  });
  it("requires an explicit separate-request action after a conflicting submission", async () => {
    const capture = vi
      .fn<FunnelCapture>()
      .mockRejectedValueOnce(new FunnelCaptureError("conflict"))
      .mockResolvedValue({ accepted: true });
    const step = surface(capture);
    const { user, form } = await fill();
    await user.click(form.getByRole("button", { name: "Save my seat" }));
    expect(await form.findByRole("alert")).toHaveTextContent("has not been overwritten");
    expect(capture).toHaveBeenCalledTimes(1);
    await user.click(form.getByRole("button", { name: "Start a separate request" }));
    expect(capture).toHaveBeenCalledTimes(1);
    expect(step).not.toHaveBeenCalled();
    await user.click(form.getByRole("button", { name: "Save my seat" }));
    await waitFor(() => expect(step).toHaveBeenCalledWith("confirmation"));
    expect(capture.mock.calls[0]?.[0].requestId).not.toBe(capture.mock.calls[1]?.[0].requestId);
  });
  it("explains rate limiting instead of claiming an accepted registration", async () => {
    const capture = vi.fn<FunnelCapture>().mockRejectedValue(new FunnelCaptureError("limited"));
    const step = surface(capture);
    const { user, form } = await fill();
    await user.click(form.getByRole("button", { name: "Save my seat" }));
    expect(await form.findByRole("alert")).toHaveTextContent("wait a few minutes");
    expect(step).not.toHaveBeenCalled();
    expect(form.getByLabelText("First name", { exact: true })).toHaveValue("Example");
  });
  it("does not offer registrations after the live event starts", () => {
    const capture = vi.fn<FunnelCapture>();
    surface(capture, "2020-10-12T18:00:00Z");
    for (const action of screen.getAllByRole("button", {
      name: "Registration is closed",
    })) {
      expect(action).toBeDisabled();
    }
    expect(capture).not.toHaveBeenCalled();
  });
  it("does not put editor instructions or a pretend video play button on a published cover", () => {
    surface(vi.fn<FunnelCapture>());
    expect(screen.queryByText("Your invitation video or event cover goes here.")).toBeNull();
    expect(screen.queryByRole("button", { name: "Play webinar invitation" })).toBeNull();
    expect(screen.getByText("Practical information for your next move.")).toBeInTheDocument();
  });
});
