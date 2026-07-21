export const THEME_STORAGE_KEY = "oalo:theme-preference";

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = Exclude<ThemePreference, "system">;

export type ThemeStorage = Pick<Storage, "getItem" | "removeItem" | "setItem">;

function isManualThemePreference(value: string | null): value is ResolvedTheme {
  return value === "light" || value === "dark";
}

export function readStoredThemePreference(
  storage: Pick<ThemeStorage, "getItem">,
): ResolvedTheme | null {
  const storedPreference = storage.getItem(THEME_STORAGE_KEY);
  return isManualThemePreference(storedPreference) ? storedPreference : null;
}

export function writeThemePreference(
  storage: Pick<ThemeStorage, "removeItem" | "setItem">,
  preference: ThemePreference,
): void {
  if (preference === "system") {
    storage.removeItem(THEME_STORAGE_KEY);
    return;
  }

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
