import { describe, expect, it } from "vitest";

import { getThemeBootstrapScript } from "./theme-bootstrap.js";
import {
  FIRST_VISIT_THEME_PREFERENCE,
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

type BootstrapResult = Readonly<{ theme: string | null; colorScheme: string; reads: string[] }>;

/**
 * Runs the real head script against a stand-in document, the way the browser runs it before first
 * paint: no React, no hydration, only the stored value and the device's colour-scheme preference.
 */
function runBootstrap(stored: string | null, systemPrefersDark: boolean): BootstrapResult {
  const attributes = new Map<string, string>();
  const style = { colorScheme: "" };
  const reads: string[] = [];
  const document = {
    documentElement: {
      setAttribute: (name: string, value: string) => attributes.set(name, value),
      style,
    },
  };
  const window = {
    localStorage: {
      getItem: (key: string) => {
        reads.push(key);
        return stored;
      },
      removeItem: () => {
        throw new Error("The bootstrap must not clear the stored choice.");
      },
    },
    matchMedia: (query: string) => ({
      matches: query === "(prefers-color-scheme: dark)" && systemPrefersDark,
    }),
  };
  new Function("document", "window", getThemeBootstrapScript())(document, window);
  return { theme: attributes.get("data-theme") ?? null, colorScheme: style.colorScheme, reads };
}

describe("theme preference (009A-AC-008)", () => {
  it("starts a first visit in Light whatever the device prefers (design D-5)", () => {
    expect(FIRST_VISIT_THEME_PREFERENCE).toBe("light");
    expect(runBootstrap(null, true)).toMatchObject({ theme: "light", colorScheme: "light" });
    expect(runBootstrap(null, false)).toMatchObject({ theme: "light", colorScheme: "light" });
  });

  it("follows the device while System is the stored choice", () => {
    expect(runBootstrap("system", true)).toMatchObject({ theme: "dark", colorScheme: "dark" });
    expect(runBootstrap("system", false)).toMatchObject({ theme: "light", colorScheme: "light" });
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
  });

  it("keeps an explicit Light or Dark choice whatever the device prefers", () => {
    expect(runBootstrap("dark", false)).toMatchObject({ theme: "dark" });
    expect(runBootstrap("light", true)).toMatchObject({ theme: "light" });
  });

  it("treats an unknown stored value as a first visit", () => {
    expect(runBootstrap("solarized", true)).toMatchObject({ theme: "light" });
  });

  it("reads only the fixed storage key", () => {
    expect(runBootstrap(null, true).reads).toEqual([THEME_STORAGE_KEY]);
  });

  /**
   * Superseded on 2026-10-01 by PRD-009 (009a D4): choosing System used to remove the stored key,
   * which made it indistinguishable from a first visit. With a first visit now Light, that would
   * have thrown the choice away on the next reload, so System is stored like the other two.
   */
  it("stores every choice, System included, and reads each one back", () => {
    const storage = createStorage();

    writeThemePreference(storage, "dark");
    expect(storage.values.get(THEME_STORAGE_KEY)).toBe("dark");
    expect(readStoredThemePreference(storage)).toBe("dark");

    writeThemePreference(storage, "system");
    expect(storage.values.get(THEME_STORAGE_KEY)).toBe("system");
    expect(readStoredThemePreference(storage)).toBe("system");

    writeThemePreference(storage, "light");
    expect(readStoredThemePreference(storage)).toBe("light");
  });

  it("reads nothing stored, or an unknown value, as no choice", () => {
    expect(readStoredThemePreference(createStorage())).toBeNull();
    expect(readStoredThemePreference(createStorage({ [THEME_STORAGE_KEY]: "sepia" }))).toBeNull();
  });

  it("emits a deterministic, parser-blocking bootstrap with no request input", () => {
    const script = getThemeBootstrapScript();

    expect(script).toContain("localStorage.getItem");
    expect(script).toContain("prefers-color-scheme: dark");
    expect(script).toContain('root.setAttribute("data-theme",resolved)');
    expect(script).not.toContain("location");
    expect(script).not.toContain("fetch");
    expect(script).not.toContain("removeItem");
  });
});
