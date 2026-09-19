import type { ReactNode } from "react";

import styles from "./auth-form.module.css";

/**
 * PRD-006a D5 and 006A-AC-032, with PRD-006d in mind.
 *
 * PRD-006d's `TextField`, `PasswordField`, `FormField`, and `Link` primitives are not merged yet.
 * Every auth input goes through this one wrapper so that swapping them in is a change to this
 * file and nothing else: the pages and forms name a label, a type, an autocomplete value, and an
 * optional helper, and never lay an input out themselves.
 *
 * `autoComplete` is required rather than optional. A password manager that cannot see what a
 * field is for will not fill it, and a sign-in a person cannot autofill is a sign-in they will
 * work around.
 */

export interface AuthFieldProps {
  readonly name: string;
  readonly label: string;
  readonly type: "email" | "password" | "text";
  readonly autoComplete: "email" | "current-password" | "new-password" | "name" | "organization";
  readonly required?: boolean;
  readonly helper?: string;
  readonly defaultValue?: string;
  readonly minLength?: number;
  readonly maxLength?: number;
}

export function AuthField({
  name,
  label,
  type,
  autoComplete,
  required = true,
  helper,
  defaultValue,
  minLength,
  maxLength,
}: AuthFieldProps): ReactNode {
  const helperId = helper === undefined ? undefined : `${name}-helper`;
  return (
    <label className={styles.field} htmlFor={name}>
      {label}
      <input
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        id={name}
        name={name}
        required={required}
        type={type}
        {...(helperId === undefined ? {} : { "aria-describedby": helperId })}
        {...(minLength === undefined ? {} : { minLength })}
        {...(maxLength === undefined ? {} : { maxLength })}
      />
      {helper === undefined ? null : (
        <p className={styles.helper} id={helperId}>
          {helper}
        </p>
      )}
    </label>
  );
}

export function AuthProblem({ children }: Readonly<{ children: ReactNode }>): ReactNode {
  return (
    <p className={styles.problem} role="alert">
      {children}
    </p>
  );
}

export function AuthNotice({ children }: Readonly<{ children: ReactNode }>): ReactNode {
  return (
    <p className={styles.notice} role="status">
      {children}
    </p>
  );
}
