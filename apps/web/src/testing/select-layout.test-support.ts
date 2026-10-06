import { vi } from "vitest";

/** jsdom has no layout; exercise the shared portalled Select with one consistent visible anchor. */
export function installSelectLayoutForTest(): void {
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
}
