import { THEME_STORAGE_KEY } from "./theme-preference.js";

/**
 * Runs synchronously in the document head, before the browser can paint the
 * application. Its only input is the fixed application storage key.
 */
export function getThemeBootstrapScript(): string {
  const storageKey = JSON.stringify(THEME_STORAGE_KEY);

  return `(function(){var root=document.documentElement;var preference=null;try{preference=window.localStorage.getItem(${storageKey});if(preference!=="light"&&preference!=="dark"){if(preference==="system"){window.localStorage.removeItem(${storageKey});}preference=null;}}catch(_error){}var systemPrefersDark=window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches;var resolved=preference||(systemPrefersDark?"dark":"light");root.setAttribute("data-theme",resolved);root.style.colorScheme=resolved;}())`;
}
