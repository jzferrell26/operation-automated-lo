// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { useState } from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { Select } from "@oalo/ui";

const choices = [
  { value: "new", label: "New" },
  { value: "blocked", label: "Not available", disabled: true },
  { value: "contacted", label: "Contacted" },
  { value: "application", label: "Application", description: "Ready for the next step" },
];
function Demo() {
  const [value, setValue] = useState("new");
  return (
    <form aria-label="Example form">
      <Select name="stage" label="Stage" value={value} onValueChange={setValue} options={choices} />
    </form>
  );
}
beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(
    new DOMRect(16, 120, 240, 44),
  );
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
describe("Select interactions", () => {
  it("skips unavailable options, cancels with Escape, and commits only on selection", () => {
    render(<Demo />);
    const trigger = screen.getByRole("combobox", { name: "Stage" });
    trigger.focus();
    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    expect(trigger).toHaveTextContent("New");
    expect(screen.getByRole("option", { name: "Contacted" })).toHaveAttribute(
      "data-active",
      "true",
    );
    fireEvent.keyDown(trigger, { key: "Escape" });
    expect(trigger).toHaveTextContent("New");
    expect(screen.queryByRole("listbox")).toBeNull();
    fireEvent.keyDown(trigger, { key: "End" });
    fireEvent.keyDown(trigger, { key: "Enter" });
    expect(trigger).toHaveTextContent("Application");
    expect(new FormData(screen.getByRole("form") as HTMLFormElement).get("stage")).toBe(
      "application",
    );
  });
  it("uses type-ahead and commits with Tab without moving focus into the options", () => {
    render(<Demo />);
    const trigger = screen.getByRole("combobox", { name: "Stage" });
    trigger.focus();
    fireEvent.keyDown(trigger, { key: "c" });
    expect(screen.getByRole("option", { name: "Contacted" })).toHaveAttribute(
      "data-active",
      "true",
    );
    expect(trigger).toHaveFocus();
    fireEvent.keyDown(trigger, { key: "Tab" });
    expect(trigger).toHaveTextContent("Contacted");
    expect(screen.queryByRole("listbox")).toBeNull();
  });
  it("keeps a disabled control closed", () => {
    const changed = vi.fn();
    render(<Select label="Stage" value="new" onValueChange={changed} options={choices} disabled />);
    fireEvent.click(screen.getByRole("combobox"));
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(changed).not.toHaveBeenCalled();
  });
});
