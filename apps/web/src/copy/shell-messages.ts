/**
 * PRD-009a. The words of the light top bar (design `00-direction.md` section 2.1). They live here,
 * not in `user-language.ts`, because 009f owns that file in PRD-009 and other lanes add their
 * strings in their own copy files. Every string follows the user-language contract.
 */

export const SHELL_SKIP_TO_CONTENT = "Skip to content";

/** The wordmark (D-14). A supplied logo is a later swap; the initials tile stands in for it. */
export const SHELL_WORDMARK = "Automated LO";
export const SHELL_WORDMARK_INITIALS = "ALO";

/** The menu's landmark name, and the name of the same six links inside the Menu sheet. */
export const SHELL_MAIN_MENU_LABEL = "Main";
export const SHELL_MENU_SHEET_LIST_LABEL = "Main menu";

export const SHELL_MENU_BUTTON = "Menu";
export const SHELL_MENU_SHEET_TITLE = "Menu";
export const SHELL_MENU_CLOSE = "Close the menu";

export const SHELL_HELP_BUTTON = "Help";
export const SHELL_HELP_TITLE = "Help";
export const SHELL_HELP_BODY =
  "Questions about Automated LO? Contact support and tell us which page you were on.";
export const SHELL_HELP_CLOSE = "Close help";

export const SHELL_ACCOUNT_TITLE = "Your account";
export const SHELL_ACCOUNT_CLOSE = "Close your account menu";

export function shellAccountButtonLabel(displayName: string): string {
  return `Your account: ${displayName}`;
}
