import { FIRST_VISIT_THEME_PREFERENCE, THEME_STORAGE_KEY } from "./theme-preference.js";

/**
 * Runs synchronously in the document head, before the browser can paint the
 * application. Its only input is the fixed application storage key.
 *
 * PRD-009a D4: with nothing stored (or an unrecognised value) the first paint is
 * Light, whatever the device prefers; a stored `system` follows the device; a
 * stored `light` or `dark` is kept. It never writes or clears the key.
 */
export function getThemeBootstrapScript(): string {
  const storageKey = JSON.stringify(THEME_STORAGE_KEY);
  const firstVisit = JSON.stringify(FIRST_VISIT_THEME_PREFERENCE);

  return `(function(){var root=document.documentElement;var preference=null;try{preference=window.localStorage.getItem(${storageKey});}catch(_error){}if(preference!=="light"&&preference!=="dark"&&preference!=="system"){preference=${firstVisit};}var systemPrefersDark=preference==="system"&&window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches;var resolved=preference==="system"?(systemPrefersDark?"dark":"light"):preference;root.setAttribute("data-theme",resolved);root.style.colorScheme=resolved;}())`;
}
