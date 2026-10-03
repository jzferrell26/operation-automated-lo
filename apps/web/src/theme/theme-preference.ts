export const THEME_STORAGE_KEY = "oalo:theme-preference";

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = Exclude<ThemePreference, "system">;

export type ThemeStorage = Pick<Storage, "getItem" | "removeItem" | "setItem">;

/**
 * PRD-009a D4 and design D-5 (`00-direction.md` section 2.6). With nothing stored, the product
 * starts in Light, the design target, whatever the device prefers. Before 2026-10-01 a first visit
 * followed the operating system, so a device set to dark opened in Dark.
 */
export const FIRST_VISIT_THEME_PREFERENCE: ThemePreference = "light";

export function isThemePreference(value: string | null): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

/** The stored choice, or `null` when nothing (or nothing recognised) is stored. */
export function readStoredThemePreference(
  storage: Pick<ThemeStorage, "getItem">,
): ThemePreference | null {
  const storedPreference = storage.getItem(THEME_STORAGE_KEY);
  return isThemePreference(storedPreference) ? storedPreference : null;
}

/**
 * Every choice is stored, System included. Until PRD-009a choosing System removed the key, which
 * was the same as a first visit; with a first visit now Light, that would lose the choice on the
 * next reload. A stored `system` still follows live device changes (`ThemeRuntimeProvider`).
 */
export function writeThemePreference(
  storage: Pick<ThemeStorage, "setItem">,
  preference: ThemePreference,
): void {
  storage.setItem(THEME_STORAGE_KEY, preference);
}

export function resolveTheme(
  preference: ThemePreference,
  systemPrefersDark: boolean,
): ResolvedTheme {
  if (preference === "system") {
    return systemPrefersDark ? "dark" : "light";
  }

  return preference;
}

export function applyResolvedTheme(root: HTMLElement, theme: ResolvedTheme): void {
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
}
