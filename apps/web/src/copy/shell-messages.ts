/**
 * PRD-009a. The words of the light top bar (design `00-direction.md` section 2.1). They live here,
 * not in `user-language.ts`, because 009f owns that file in PRD-009 and other lanes add their
 * strings in their own copy files. Every string follows the user-language contract.
 */

import { ROLE_LABELS } from "./user-language.js";

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
/**
 * Amended 2026-10-02 by the writing review (MTK-008, W-12). It used to say "Contact support" and gave
 * no way to: the product carries no support address, link or form anywhere, and the panel is not
 * allowed a link or a second control. So it names the one person a loan officer can actually ask,
 * their workspace owner, and keeps the useful half of the old line, which page they were on.
 *
 * Amended again 2026-10-02 (pass 2, W-36). A sign-up makes the new person the workspace owner, so for
 * them "Ask your workspace owner" sent the usual reader to themselves. The owner is told what is true
 * and promises nothing; everyone else is still pointed at their owner. When a real support address
 * exists, "Email <address> and tell us which page you were on" replaces both, for everyone.
 */
export const SHELL_HELP_BODY_FOR_OWNER =
  "Questions about Automated LO? Write down which page you were on.";
export const SHELL_HELP_BODY_FOR_OTHERS =
  "Questions about Automated LO? Ask your workspace owner, and tell them which page you were on.";

/** The help sentence for a person, by the role label the session carries (`ROLE_LABELS`). */
export function shellHelpBody(roleLabel: string): string {
  return roleLabel === ROLE_LABELS.location_admin
    ? SHELL_HELP_BODY_FOR_OWNER
    : SHELL_HELP_BODY_FOR_OTHERS;
}
export const SHELL_HELP_CLOSE = "Close help";

export const SHELL_ACCOUNT_TITLE = "Your account";
export const SHELL_ACCOUNT_CLOSE = "Close your account menu";

export function shellAccountButtonLabel(displayName: string): string {
  return `Your account: ${displayName}`;
}
