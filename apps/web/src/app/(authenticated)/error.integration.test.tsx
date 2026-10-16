import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AuthenticatedError from "./error.js";

const navigation = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation.js", () => ({ useRouter: () => navigation }));

beforeEach(() => navigation.refresh.mockReset());

describe("authenticated workspace server retry", () => {
  it("requests a fresh server render before resetting the failed boundary", async () => {
    const order: string[] = [];
    navigation.refresh.mockImplementation(() => order.push("refresh"));
    const reset = vi.fn(() => order.push("reset"));
    render(<AuthenticatedError error={new Error("synthetic internal failure")} reset={reset} />);
    expect(order).toEqual([]);

    await userEvent.setup().click(screen.getByRole("button", { name: "Try again" }));

    expect(order).toEqual(["refresh", "reset"]);
    expect(navigation.refresh).toHaveBeenCalledOnce();
    expect(reset).toHaveBeenCalledOnce();
  });

  it("keeps the support digest and hides the underlying database failure", () => {
    const { container } = render(
      <AuthenticatedError
        error={Object.assign(new Error("DB_ACQUISITION_TIMEOUT private synthetic detail"), {
          digest: "synthetic-support-reference",
        })}
        reset={vi.fn()}
      />,
    );
    expect(screen.getByRole("heading", { name: "We couldn't load your workspace" })).toBeVisible();
    expect(screen.getByText("synthetic-support-reference")).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/DB_ACQUISITION_TIMEOUT|private synthetic detail/u);
    expect(navigation.refresh).not.toHaveBeenCalled();
  });
});
