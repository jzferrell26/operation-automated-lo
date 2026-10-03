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

  async function mount(): Promise<{
    runtime: () => ThemeRuntime | undefined;
    setDraft: () => Dispatch<SetStateAction<string>> | undefined;
  }> {
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

    return { runtime: () => runtime, setDraft: () => setDraft };
  }

  /** PRD-009a D4 and design D-5: nothing stored means Light, on a device set to dark too. */
  it("opens a first visit in Light even when the device prefers dark (009A-AC-008)", async () => {
    installMatchMedia(true);
    const { runtime } = await mount();

    expect(runtime()?.preference).toBe("light");
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
  });

  it("stores System, follows live OS changes for it, and preserves local application state", async () => {
    const media = installMatchMedia(true);
    const { runtime, setDraft } = await mount();

    act(() => runtime()?.setPreference("system"));
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("system");
    expect(document.documentElement.dataset.theme).toBe("dark");

    act(() => setDraft()?.("preserved draft"));
    act(() => media.emit(false));
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(container?.textContent).toBe("preserved draft");

    act(() => runtime()?.setPreference("dark"));
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    act(() => media.emit(false));
    expect(document.documentElement.dataset.theme).toBe("dark");

    act(() => runtime()?.setPreference("system"));
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("system");
    act(() => media.emit(true));
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("keeps a stored System choice across a reload and keeps following the device", async () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "system");
    const media = installMatchMedia(false);
    const { runtime } = await mount();

    expect(runtime()?.preference).toBe("system");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("system");
    expect(document.documentElement.dataset.theme).toBe("light");
    act(() => media.emit(true));
    expect(document.documentElement.dataset.theme).toBe("dark");
  });
});
