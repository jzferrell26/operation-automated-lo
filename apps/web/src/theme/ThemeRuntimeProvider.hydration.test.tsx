/** @vitest-environment jsdom */

import { act, useContext } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  ThemeRuntimeContext,
  ThemeRuntimeProvider,
  useThemeRuntime,
  type ThemeRuntime,
} from "./ThemeRuntimeProvider.js";
import { THEME_STORAGE_KEY } from "./theme-preference.js";

/**
 * PRD-009d, the duplicate step 2 form (CI run 36989783019 and the design-quality runs of
 * 2026-10-02).
 *
 * Every signed-in page streams inside a loading boundary. When a page was slow to render, the
 * browser hydrated the document while that boundary was still waiting for the server. The theme
 * provider wraps the whole document, and it changed the value it hands down on mount (ready, then
 * the stored preference), so React gave up waiting and rendered the page again on the client; the
 * server's copy then arrived as well, and step 2 carried two "Headline" and two "Add a city or
 * state" fields. Measured in a real browser with the step 2 loader held back 1.5 seconds: the page
 * was rendered on the client in 10 of 10 loads with the old provider, and 0 of 10 with this one.
 *
 * So the value the provider hands down must never change. These tests pin that, and that the
 * theme control still sees every change through the store.
 */

describe("the theme runtime's value for the life of the page", () => {
  let root: Root | undefined;
  let container: HTMLDivElement | undefined;
  let deviceListener: (() => void) | undefined;
  let deviceDark = true;

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    window.localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    vi.unstubAllGlobals();
  });

  async function mount(stored: string | null) {
    if (stored !== null) window.localStorage.setItem(THEME_STORAGE_KEY, stored);
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({
        get matches() {
          return deviceDark;
        },
        media: "(prefers-color-scheme: dark)",
        addEventListener: (_type: string, listener: () => void) => {
          deviceListener = listener;
        },
        removeEventListener: () => {
          deviceListener = undefined;
        },
      })),
    );
    const handedDown: unknown[] = [];
    const seen: ThemeRuntime[] = [];
    function ContextProbe() {
      handedDown.push(useContext(ThemeRuntimeContext));
      return null;
    }
    function ControlProbe() {
      seen.push(useThemeRuntime());
      return null;
    }
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    await act(async () => {
      root?.render(
        <ThemeRuntimeProvider>
          <ContextProbe />
          <ControlProbe />
        </ThemeRuntimeProvider>,
      );
    });
    return { handedDown, seen };
  }

  it.each([
    ["nothing stored", null],
    ["Light stored", "light"],
    ["Dark stored", "dark"],
    ["System stored", "system"],
  ])("hands down one value through mount and every change, with %s", async (_label, stored) => {
    deviceDark = true;
    const { handedDown, seen } = await mount(stored);
    const runtime = seen.at(-1);
    expect(runtime?.isReady).toBe(true);

    act(() => runtime?.setPreference("dark"));
    act(() => runtime?.setPreference("system"));
    deviceDark = false;
    act(() => deviceListener?.());

    expect(new Set(handedDown).size).toBe(1);
    expect(handedDown[0]).not.toBeNull();
    // The control still sees each change through the store.
    expect(seen.at(-1)).toMatchObject({ preference: "system", resolvedTheme: "light" });
    expect(document.documentElement.dataset.theme).toBe("light");
  });
});
