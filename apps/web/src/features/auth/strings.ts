/**
 * The auth feature's copy barrel. It holds no words of its own.
 *
 * PRD-006a built its own table here while PRD-006b's copy modules were still being written, so for
 * one batch the same sentences existed twice and could drift apart. PRD-006d closes that: every
 * export below is a re-export, `apps/web/src/copy/auth-messages.ts` is the single source for the
 * words on the seven account screens and in the two account emails (PRD-006b D10), and
 * `apps/web/src/features/http/user-messages.ts` is the single source for turning an error code into
 * a sentence that says what happened and what to do (PRD-006b D7).
 *
 * Nothing in the auth feature may declare a user-visible sentence. A new string is added to one of
 * those two modules and re-exported here, so the writing review keeps happening once.
 */

export {
  CHANGE_PASSWORD,
  CHOOSE_WORKSPACE,
  FORGOT_PASSWORD,
  PASSWORD_POLICY_MESSAGES,
  RESET_PASSWORD,
  RESET_PASSWORD_EMAIL,
  SIGN_IN,
  SIGN_UP,
  VERIFY_EMAIL,
  VERIFY_EMAIL_EMAIL,
  chooseWorkspaceOptionLabel,
} from "../../copy/auth-messages.js";

export { ROLE_LABELS } from "../../copy/user-language.js";

export {
  UNKNOWN_ERROR_MESSAGE,
  isMappedErrorCode,
  userMessageForCode,
  userMessageSentence,
} from "../http/user-messages.js";
export type { UserMessage } from "../http/user-messages.js";
