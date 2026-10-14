// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { useState } from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { Dialog, Select } from "@oalo/ui";
import { userEvent } from "@testing-library/user-event";

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
function ModalDemo({ urgent }: Readonly<{ urgent: boolean }>) {
  const [open, setOpen] = useState(false);
  return (
    <main>
      <button onClick={() => setOpen(true)}>Edit stage</button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Edit stage" urgent={urgent}>
        <Demo />
      </Dialog>
    </main>
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
  it.each([false, true])(
    "preserves the actual modal's focus trap and Escape ownership (urgent=%s)",
    async (urgent) => {
      render(<ModalDemo urgent={urgent} />);
      const user = userEvent.setup();
      const opener = screen.getByRole("button", { name: "Edit stage" });
      await user.click(opener);
      const role = urgent ? "alertdialog" : "dialog";
      const modal = screen.getByRole(role, { name: "Edit stage" });
      const trigger = screen.getByRole("combobox", { name: "Stage" });
      await user.click(trigger);
      expect(modal).toContainElement(screen.getByRole("listbox"));
      await user.keyboard("{End}{Escape}");
      expect(screen.getByRole(role)).toBe(modal);
      expect(trigger).toHaveFocus();
      expect(trigger).toHaveTextContent("New");
      await user.keyboard("{End}{Enter}");
      expect(trigger).toHaveTextContent("Application");
      await user.tab();
      expect(screen.getByRole("button", { name: "Close" })).toHaveFocus();
      await user.tab({ shift: true });
      expect(trigger).toHaveFocus();
      await user.keyboard("{Escape}");
      expect(screen.queryByRole(role)).toBeNull();
      expect(opener).toHaveFocus();
    },
  );
  it.each(["main", "role"] as const)(
    "keeps an open popup in its containing %s landmark",
    async (landmark) => {
      const content = <Demo />;
      render(
        <div data-product-shell="true">
          {landmark === "main" ? <main>{content}</main> : <div role="main">{content}</div>}
        </div>,
      );
      const user = userEvent.setup();
      const trigger = screen.getByRole("combobox", { name: "Stage" });
      await user.click(trigger);
      expect(screen.getByRole("main")).toContainElement(screen.getByRole("listbox"));
      expect(trigger).toHaveFocus();
      await user.keyboard("{Escape}");
      expect(screen.queryByRole("listbox")).toBeNull();
      expect(trigger).toHaveFocus();
    },
  );
  it.each(["dialog", "alertdialog"] as const)(
    "keeps %s ownership ahead of the main landmark",
    async (role) => {
      render(
        <main>
          <div role={role} aria-label="Edit stage">
            <Demo />
          </div>
        </main>,
      );
      const user = userEvent.setup();
      const trigger = screen.getByRole("combobox", { name: "Stage" });
      await user.click(trigger);
      expect(screen.getByRole(role)).toContainElement(screen.getByRole("listbox"));
      await user.keyboard("{End}{Enter}");
      expect(trigger).toHaveTextContent("Application");
      expect(trigger).toHaveFocus();
      expect(screen.queryByRole("listbox")).toBeNull();
    },
  );
  it("preserves the themed shell fallback when no containing landmark exists", async () => {
    const { container } = render(
      <div data-product-shell="true">
        <Demo />
      </div>,
    );
    await userEvent.setup().click(screen.getByRole("combobox", { name: "Stage" }));
    expect(container.firstElementChild).toContainElement(screen.getByRole("listbox"));
  });
  it("preserves the body fallback outside a shell or landmark", async () => {
    const { container } = render(<Demo />);
    await userEvent.setup().click(screen.getByRole("combobox", { name: "Stage" }));
    const listbox = screen.getByRole("listbox");
    expect(document.body).toContainElement(listbox);
    expect(container).not.toContainElement(listbox);
  });
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
