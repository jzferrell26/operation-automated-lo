// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Dialog, Sheet } from "@oalo/ui";

afterEach(cleanup);

describe("overlay focus ownership", () => {
  for (const Component of [Dialog, Sheet]) {
    it(`${Component.displayName} keeps the active field when its close callback changes`, () => {
      const previous = vi.fn();
      const latest = vi.fn();
      const { rerender } = render(
        <Component title="Edit details" open onClose={previous}>
          <label>
            Name
            <input defaultValue="Alex" />
          </label>
        </Component>,
      );
      const input = screen.getByRole("textbox", { name: "Name" });
      input.focus();
      rerender(
        <Component title="Edit details" open onClose={latest}>
          <label>
            Name
            <input defaultValue="Alex" />
          </label>
        </Component>,
      );
      expect(input).toHaveFocus();
      fireEvent.keyDown(input, { key: "Escape" });
      expect(latest).toHaveBeenCalledOnce();
      expect(previous).not.toHaveBeenCalled();
    });
  }
});
