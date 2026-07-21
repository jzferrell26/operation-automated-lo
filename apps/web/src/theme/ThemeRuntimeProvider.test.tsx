/** @vitest-environment jsdom */

import { act, useState, type Dispatch, type SetStateAction } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  ThemeRuntimeProvider,
  useThemeRuntime,
  type ThemeRuntime,
} from "./ThemeRuntimeProvider.js";
import { THEME_STORAGE_KEY } from "./theme-preference.js";

type MatchMediaController = Readonly<{
  emit: (matches: boolean) => void;
}>;

function installMatchMedia(initialMatches: boolean): MatchMediaController {
  let matches = initialMatches;
  const listeners = new Set<(event: MediaQueryListEvent) => void>();

  const mediaQuery = {
    get matches() {
      return matches;
    },
    media: "(prefers-color-scheme: dark)",
    onchange: null,
    addEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) =>
      listeners.add(listener),
    removeEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) =>
      listeners.delete(listener),
    addListener: (listener: (event: MediaQueryListEvent) => void) => listeners.add(listener),
    removeListener: (listener: (event: MediaQueryListEvent) => void) => listeners.delete(listener),
    dispatchEvent: () => true,
  } as unknown as MediaQueryList;

  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => mediaQuery),
  );

  return {
    emit(nextMatches) {
      matches = nextMatches;
      const event = { matches, media: mediaQuery.media } as MediaQueryListEvent;
      listeners.forEach((listener) => listener(event));
    },
  };
}

describe("ThemeRuntimeProvider", () => {
  let container: HTMLDivElement | undefined;
  let root: Root | undefined;

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.style.removeProperty("color-scheme");
    window.localStorage.clear();
    vi.unstubAllGlobals();
  });

  it("follows live OS changes for System while preserving local application state", async () => {
    const media = installMatchMedia(true);
    let runtime: ThemeRuntime | undefined;
    let setDraft: Dispatch<SetStateAction<string>> | undefined;

    function Probe() {
      runtime = useThemeRuntime();
      const [draft, updateDraft] = useState("initial");
      setDraft = updateDraft;
      return <output>{draft}</output>;
    }

    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(
        <ThemeRuntimeProvider>
          <Probe />
        </ThemeRuntimeProvider>,
      );
    });

    expect(runtime?.preference).toBe("system");
    expect(document.documentElement.dataset.theme).toBe("dark");

    act(() => setDraft?.("preserved draft"));
    act(() => media.emit(false));
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(container.textContent).toBe("preserved draft");

    act(() => runtime?.setPreference("dark"));
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    act(() => media.emit(false));
    expect(document.documentElement.dataset.theme).toBe("dark");

    act(() => runtime?.setPreference("system"));
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
    act(() => media.emit(true));
    expect(document.documentElement.dataset.theme).toBe("dark");
  });
});
