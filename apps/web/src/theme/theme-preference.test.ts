import { describe, expect, it } from "vitest";

import { getThemeBootstrapScript } from "./theme-bootstrap.js";
import {
  THEME_STORAGE_KEY,
  readStoredThemePreference,
  resolveTheme,
  writeThemePreference,
  type ThemeStorage,
} from "./theme-preference.js";

function createStorage(
  initialValues: Record<string, string> = {},
): ThemeStorage & { values: Map<string, string> } {
  const values = new Map(Object.entries(initialValues));

  return {
    values,
    getItem(key) {
      return values.get(key) ?? null;
    },
    removeItem(key) {
      values.delete(key);
    },
    setItem(key, value) {
      values.set(key, value);
    },
  };
}

describe("theme preference", () => {
  it("uses the operating system on a first visit and while System is selected", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
  });

  it("persists only explicit Light and Dark choices", () => {
    const storage = createStorage();

    writeThemePreference(storage, "dark");
    expect(readStoredThemePreference(storage)).toBe("dark");
    expect(storage.values.get(THEME_STORAGE_KEY)).toBe("dark");

    writeThemePreference(storage, "system");
    expect(readStoredThemePreference(storage)).toBeNull();
    expect(storage.values.has(THEME_STORAGE_KEY)).toBe(false);
  });

  it("treats a legacy System value as absent rather than a manual override", () => {
    const storage = createStorage({ [THEME_STORAGE_KEY]: "system" });
    expect(readStoredThemePreference(storage)).toBeNull();
  });

  it("emits a deterministic, parser-blocking bootstrap with no request input", () => {
    const script = getThemeBootstrapScript();

    expect(script).toContain("localStorage.getItem");
    expect(script).toContain("prefers-color-scheme: dark");
    expect(script).toContain('root.setAttribute("data-theme",resolved)');
    expect(script).not.toContain("location");
    expect(script).not.toContain("fetch");
  });
});
