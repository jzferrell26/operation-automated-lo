import { render, screen, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TEST_BAND } from "../campaigns/components/launch-flow.test-support.js";
import { WEBINAR_ADS } from "./catalog.js";
import { WebinarAdsPack } from "./pack.js";

afterEach(() => vi.unstubAllGlobals());
describe("webinar creative preparation", () => {
  it("explains the disabled review control and allows review after both fields meet the minimum", async () => {
    const user = userEvent.setup();
    render(<WebinarAdsPack advertiser={TEST_BAND} />);
    await user.click(
      screen.getByRole("button", { name: "Prepare this creative: Your first home, a clear plan" }),
    );
    const headline = screen.getByLabelText("Webinar ad headline"),
      text = screen.getByLabelText("Webinar ad text");
    await user.clear(headline);
    await user.clear(text);
    expect(headline).toHaveAttribute("aria-invalid", "true");
    expect(text).toHaveAttribute("aria-invalid", "true");
    const review = screen.getByRole("button", { name: "Review this draft" });
    expect(review).toBeDisabled();
    expect(review).toHaveAttribute("aria-describedby", "webinar-draft-minimum");
    expect(
      screen.getByText(
        "To review, add at least 3 visible characters to both the headline and ad text.",
      ),
    ).toBeVisible();
    await user.type(headline, "A plan");
    expect(review).toBeDisabled();
    await user.type(text, "Explore the next step.");
    expect(review).toBeEnabled();
    expect(review).not.toHaveAttribute("aria-describedby");
  });
  it("exposes all fifteen pending original creatives and filters by actual learning topic", async () => {
    const user = userEvent.setup();
    const { container } = render(<WebinarAdsPack advertiser={TEST_BAND} />);
    expect(screen.getByRole("status", { name: "Webinar preparation step" })).toBeEmptyDOMElement();
    expect(container.querySelectorAll("[data-webinar-creative]")).toHaveLength(15);
    expect(screen.getAllByRole("button", { name: /^Prepare this creative/ })).toHaveLength(15);
    await user.click(screen.getByRole("button", { name: "Understand the housing budget" }));
    expect(container.querySelectorAll("[data-webinar-creative]")).toHaveLength(3);
    await user.click(screen.getByRole("button", { name: "All fifteen" }));
    expect(container.querySelectorAll("[data-webinar-creative]")).toHaveLength(15);
    expect(screen.queryByRole("button", { name: /approve|launch/i })).toBeNull();
  });
  it("chooses, edits, previews both shapes, reviews, copies and downloads without any save or provider request", async () => {
    const user = userEvent.setup(),
      fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const clipboard = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
    const { container } = render(<WebinarAdsPack advertiser={TEST_BAND} />);
    await user.click(
      screen.getByRole("button", { name: "Prepare this creative: Your first home, a clear plan" }),
    );
    await user.clear(screen.getByLabelText("Webinar ad headline"));
    await user.type(screen.getByLabelText("Webinar ad headline"), "Your path starts with a plan.");
    await user.clear(screen.getByLabelText("Webinar ad text"));
    await user.type(
      screen.getByLabelText("Webinar ad text"),
      "Explore the process before your next move.",
    );
    expect(
      screen.getByRole("heading", { name: "Your path starts with a plan." }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Square" }));
    expect(container.querySelector("[data-ad-creative]")).toHaveAttribute("data-shape", "square");
    expect(screen.getByText(TEST_BAND.name)).toBeVisible();
    await user.click(screen.getByRole("button", { name: "On-demand webinar" }));
    await user.click(screen.getByRole("button", { name: "Review this draft" }));
    expect(screen.getByRole("link", { name: "Open your on-demand webinar" })).toHaveAttribute(
      "href",
      "/marketing/campaigns/funnels/on-demand",
    );
    await user.click(screen.getByRole("button", { name: "Copy draft words" }));
    expect(clipboard).toHaveBeenCalledWith(
      expect.stringContaining("Headline: Your path starts with a plan."),
    );
    expect(clipboard).toHaveBeenCalledWith(
      expect.stringContaining("Pending owner and lender review"),
    );
    expect(screen.getByRole("status", { name: "Webinar preparation step" })).toHaveTextContent(
      "Step 3 of 3: Review your draft",
    );
    expect(screen.getByRole("status", { name: "Draft clipboard status" })).toHaveTextContent(
      "Draft words copied",
    );
    for (const shape of ["tall", "square"] as const) {
      const link = screen.getByRole("link", { name: `Download ${shape} artwork` });
      expect(link).toHaveAttribute("href", WEBINAR_ADS[0]?.art[shape].path);
      expect(link).toHaveAttribute("download");
    }
    expect(screen.getByText(/Downloads do not include the brand band/)).toBeVisible();
    expect(screen.queryByRole("button", { name: /approve|launch/i })).toBeNull();
    expect(container.querySelector('a[href*="campaigns/new"]')).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Edit draft words" }));
    expect(screen.getByLabelText("Webinar ad headline")).toHaveValue(
      "Your path starts with a plan.",
    );
  });
  it("retains each creative's edits while choosing another and says when copy fails", async () => {
    const user = userEvent.setup();
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(new Error("denied"));
    render(<WebinarAdsPack advertiser={TEST_BAND} />);
    await user.click(
      screen.getByRole("button", { name: "Prepare this creative: Your first home, a clear plan" }),
    );
    await user.clear(screen.getByLabelText("Webinar ad headline"));
    await user.type(screen.getByLabelText("Webinar ad headline"), "A clearer plan.");
    await user.click(screen.getByRole("button", { name: "Back to creatives" }));
    await user.click(
      screen.getByRole("button", { name: "Prepare this creative: From renting to a buying plan" }),
    );
    expect(screen.getByLabelText("Webinar ad headline")).toHaveValue(WEBINAR_ADS[1]?.headline);
    await user.click(screen.getByRole("button", { name: "Back to creatives" }));
    await user.click(
      screen.getByRole("button", { name: "Prepare this creative: Your first home, a clear plan" }),
    );
    expect(screen.getByLabelText("Webinar ad headline")).toHaveValue("A clearer plan.");
    await user.click(screen.getByRole("button", { name: "Review this draft" }));
    await user.click(screen.getByRole("button", { name: "Copy draft words" }));
    expect(screen.getByRole("status", { name: "Draft clipboard status" })).toHaveTextContent(
      "Copy was unavailable",
    );
    expect(
      within(screen.getByRole("region", { name: "Fifteen webinar ad creatives" })).queryByRole(
        "button",
        { name: "Launch on Facebook" },
      ),
    ).toBeNull();
  });
});
