"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  applyResolvedTheme,
  readStoredThemePreference,
  resolveTheme,
  writeThemePreference,
  THEME_STORAGE_KEY,
  type ResolvedTheme,
  type ThemePreference,
} from "./theme-preference.js";

export type ThemeRuntime = Readonly<{
  isReady: boolean;
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
}>;

const ThemeRuntimeContext = createContext<ThemeRuntime | null>(null);

function getBrowserStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function resolveBrowserTheme(preference: ThemePreference): ResolvedTheme {
  return resolveTheme(preference, window.matchMedia("(prefers-color-scheme: dark)").matches);
}

export function ThemeRuntimeProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [isReady, setIsReady] = useState(false);
  const [preference, setPreferenceState] = useState<ThemePreference>("system");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light");

  useEffect(() => {
    const storage = getBrowserStorage();
    const storedPreference = storage ? readStoredThemePreference(storage) : null;

    if (storage?.getItem(THEME_STORAGE_KEY) === "system") {
      storage.removeItem(THEME_STORAGE_KEY);
    }

    setPreferenceState(storedPreference ?? "system");
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const synchronizeTheme = () => {
      const nextTheme = resolveTheme(preference, mediaQuery.matches);
      setResolvedTheme(nextTheme);
      applyResolvedTheme(document.documentElement, nextTheme);
    };

    synchronizeTheme();
    if (preference !== "system") {
      return;
    }

    mediaQuery.addEventListener("change", synchronizeTheme);
    return () => mediaQuery.removeEventListener("change", synchronizeTheme);
  }, [isReady, preference]);

  const setPreference = useCallback((nextPreference: ThemePreference) => {
    const storage = getBrowserStorage();
    if (storage) {
      writeThemePreference(storage, nextPreference);
    }

    if (typeof window !== "undefined") {
      const nextTheme = resolveBrowserTheme(nextPreference);
      setResolvedTheme(nextTheme);
      applyResolvedTheme(document.documentElement, nextTheme);
    }

    setPreferenceState(nextPreference);
  }, []);

  const value = useMemo<ThemeRuntime>(
    () => ({ isReady, preference, resolvedTheme, setPreference }),
    [isReady, preference, resolvedTheme, setPreference],
  );

  return <ThemeRuntimeContext value={value}>{children}</ThemeRuntimeContext>;
}

export function useThemeRuntime(): ThemeRuntime {
  const runtime = useContext(ThemeRuntimeContext);
  if (!runtime) {
    throw new Error("useThemeRuntime must be used inside ThemeRuntimeProvider.");
  }

  return runtime;
}
