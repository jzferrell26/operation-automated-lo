"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import {
  FIRST_VISIT_THEME_PREFERENCE,
  applyResolvedTheme,
  readStoredThemePreference,
  resolveTheme,
  writeThemePreference,
  type ResolvedTheme,
  type ThemePreference,
} from "./theme-preference.js";

export type ThemeRuntime = Readonly<{
  isReady: boolean;
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
}>;

type ThemeState = Readonly<{
  isReady: boolean;
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
}>;

/**
 * What the theme runtime hands down: a store, the same object for the life of the page.
 *
 * PRD-009d, the duplicate step 2 form (2026-10-02). This provider wraps the whole document, and
 * the signed-in pages stream inside a loading boundary. When the provider's value changed on mount
 * (ready, then the stored preference), React had to give up hydrating any boundary still waiting
 * for the server, because it cannot know whether a consumer sits inside it. It rendered that page
 * again on the client, and the server's copy, still streaming, then arrived as well: two of every
 * field on a page that loaded slowly. So the value handed down never changes. The state lives in
 * the store, and the one consumer that shows it, the theme control, subscribes to it.
 */
export type ThemeRuntimeStore = Readonly<{
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => ThemeState;
  getServerSnapshot: () => ThemeState;
  start: () => () => void;
  setPreference: (preference: ThemePreference) => void;
}>;

export const ThemeRuntimeContext = createContext<ThemeRuntimeStore | null>(null);

const SERVER_STATE: ThemeState = Object.freeze({
  isReady: false,
  preference: FIRST_VISIT_THEME_PREFERENCE,
  resolvedTheme: "light",
});

function getBrowserStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function createThemeRuntimeStore(): ThemeRuntimeStore {
  let state: ThemeState = SERVER_STATE;
  const listeners = new Set<() => void>();
  let mediaQuery: MediaQueryList | null = null;

  function publish(next: ThemeState) {
    if (
      next.isReady === state.isReady &&
      next.preference === state.preference &&
      next.resolvedTheme === state.resolvedTheme
    ) {
      return;
    }
    state = Object.freeze(next);
    listeners.forEach((listener) => listener());
  }

  let followingDevice = false;

  function deviceQuery(): MediaQueryList {
    mediaQuery ??= window.matchMedia("(prefers-color-scheme: dark)");
    return mediaQuery;
  }

  /** Applies the preference to the document and tells the subscribers. */
  function apply(preference: ThemePreference) {
    const resolvedTheme = resolveTheme(preference, deviceQuery().matches);
    applyResolvedTheme(document.documentElement, resolvedTheme);
    publish({ isReady: true, preference, resolvedTheme });
  }

  /** Follows the device while the preference is System, and stops following otherwise. */
  function follow(preference: ThemePreference) {
    const shouldFollow = preference === "system";
    if (shouldFollow === followingDevice) return;
    followingDevice = shouldFollow;
    if (shouldFollow) deviceQuery().addEventListener("change", followDevice);
    else deviceQuery().removeEventListener("change", followDevice);
  }

  function followDevice() {
    if (state.preference === "system") apply("system");
  }

  function choose(preference: ThemePreference) {
    apply(preference);
    follow(preference);
  }

  return Object.freeze({
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot: () => state,
    getServerSnapshot: () => SERVER_STATE,
    start() {
      const storage = getBrowserStorage();
      choose((storage ? readStoredThemePreference(storage) : null) ?? FIRST_VISIT_THEME_PREFERENCE);
      return () => follow("light");
    },
    setPreference(preference: ThemePreference) {
      const storage = getBrowserStorage();
      if (storage) writeThemePreference(storage, preference);
      choose(preference);
    },
  });
}

/**
 * PRD-009a D4. The runtime agrees with the head script in `theme-bootstrap.ts`: nothing stored is
 * a first visit, which is Light, and a stored System follows the device and keeps following it.
 * The first visit is not written to storage, so a person who never chooses keeps getting the
 * product default if it ever changes.
 */
export function ThemeRuntimeProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [store] = useState(createThemeRuntimeStore);
  useEffect(() => store.start(), [store]);
  return <ThemeRuntimeContext value={store}>{children}</ThemeRuntimeContext>;
}

export function useThemeRuntime(): ThemeRuntime {
  const store = useContext(ThemeRuntimeContext);
  if (!store) {
    throw new Error("useThemeRuntime must be used inside ThemeRuntimeProvider.");
  }
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  return useMemo(() => ({ ...state, setPreference: store.setPreference }), [state, store]);
}
