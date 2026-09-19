"use client";

import { useId, type HTMLAttributes, type ReactElement, type ReactNode } from "react";

import { Icon } from "./Icon.js";
import { joinClassNames } from "./internal.js";

import styles from "./field.module.css";

export type FieldRequirement = "required" | "optional";
export type FieldSize = "md" | "lg";
export type FieldTone = "interface" | "data";

/**
 * The attributes a governed control must receive so that its label,
 * description, and inline error stay connected. Design brief section 18.
 */
export type FieldControlAria = Readonly<{
  "aria-describedby"?: string;
  "aria-invalid"?: true;
  id: string;
  required?: true;
}>;

export type FieldWiring = Readonly<{
  control: FieldControlAria;
  descriptionId: string;
  errorId: string;
}>;

const requirementLabel: Readonly<Record<FieldRequirement, string>> = Object.freeze({
  optional: "Optional",
  required: "Required",
});

/**
 * Pure identifier and ARIA policy shared by the field wrapper and its focused
 * contract tests. A description or an error is connected to the control only
 * through `aria-describedby`, never through proximity alone.
 */
export function resolveFieldWiring(
  generatedId: string,
  options: Readonly<{
    hasDescription: boolean;
    hasError: boolean;
    id?: string | undefined;
    required?: boolean | undefined;
  }>,
): FieldWiring {
  const descriptionId = `${generatedId}-description`;
  const errorId = `${generatedId}-error`;
  const describedBy = [
    options.hasDescription ? descriptionId : undefined,
    options.hasError ? errorId : undefined,
  ]
    .filter((value): value is string => typeof value === "string")
    .join(" ");

  return {
    control: {
      id: options.id ?? `${generatedId}-control`,
      ...(describedBy === "" ? {} : { "aria-describedby": describedBy }),
      ...(options.hasError ? { "aria-invalid": true as const } : {}),
      ...(options.required === true ? { required: true as const } : {}),
    },
    descriptionId,
    errorId,
  };
}

export type FormFieldProps = Omit<HTMLAttributes<HTMLDivElement>, "children" | "id"> & {
  readonly children: (control: FieldControlAria) => ReactNode;
  readonly description?: ReactNode;
  readonly error?: ReactNode;
  readonly id?: string | undefined;
  readonly label: ReactNode;
  readonly requirement?: FieldRequirement | undefined;
};

export function FormField({
  children,
  className,
  description,
  error,
  id,
  label,
  requirement,
  ...fieldProps
}: FormFieldProps) {
  const generatedId = useId();
  const hasDescription = description !== undefined && description !== null && description !== false;
  const hasError = error !== undefined && error !== null && error !== false;
  const wiring = resolveFieldWiring(generatedId, {
    hasDescription,
    hasError,
    id,
    required: requirement === "required",
  });

  return (
    <div
      {...fieldProps}
      className={joinClassNames(styles.field, className)}
      data-field-invalid={hasError || undefined}
      data-field-requirement={requirement}
    >
      <span className={styles.labelRow}>
        <label className={styles.label} htmlFor={wiring.control.id}>
          {label}
        </label>
        {requirement ? (
          <span className={styles.requirement}>{requirementLabel[requirement]}</span>
        ) : null}
      </span>
      {hasDescription ? (
        <span className={styles.description} id={wiring.descriptionId}>
          {description}
        </span>
      ) : null}
      {children(wiring.control)}
      {hasError ? (
        <span className={joinClassNames(styles.message, styles.error)} id={wiring.errorId}>
          <span className={styles.messageGlyph}>
            <Icon decorative name="alert-triangle" size="sm" />
          </span>
          <span>{error}</span>
        </span>
      ) : null}
    </div>
  );
}

FormField.displayName = "FormField";

export type TextControlBaseProps = Readonly<{
  className?: string | undefined;
  description?: ReactNode;
  error?: ReactNode;
  id?: string | undefined;
  label: ReactNode;
  requirement?: FieldRequirement | undefined;
  size?: FieldSize | undefined;
  tone?: FieldTone | undefined;
}>;

export type TextControlAttributes = FieldControlAria &
  Readonly<{
    className: string;
    "data-size": FieldSize;
    "data-tone": FieldTone;
  }>;

/**
 * Shared scaffold for every governed text control. Keeping one implementation
 * here is what guarantees that `TextField`, `TextArea`, and `PasswordField`
 * present the same label row, description, states, and error wiring.
 */
export function renderTextControl(
  props: TextControlBaseProps,
  render: (attributes: TextControlAttributes) => ReactNode,
  extraClassName?: string,
): ReactElement {
  const { className, description, error, id, label, requirement, size, tone } = props;

  return (
    <FormField
      description={description}
      error={error}
      id={id}
      label={label}
      requirement={requirement}
    >
      {(control) =>
        render({
          ...control,
          className: joinClassNames(styles.control, extraClassName, className),
          "data-size": size ?? "md",
          "data-tone": tone ?? "interface",
        })
      }
    </FormField>
  );
}
