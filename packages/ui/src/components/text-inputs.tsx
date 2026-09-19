"use client";

import { forwardRef, useState, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";

import { renderTextControl, type TextControlBaseProps } from "./FormField.js";
import { Icon } from "./Icon.js";
import { joinClassNames } from "./internal.js";

import styles from "./field.module.css";

type GovernedControlAttributes = "aria-describedby" | "aria-invalid" | "id" | "required" | "size";

export type TextFieldProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  GovernedControlAttributes
> &
  TextControlBaseProps;

export type TextAreaProps = Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  GovernedControlAttributes
> &
  TextControlBaseProps;

export type PasswordFieldProps = Omit<TextFieldProps, "tone" | "type"> &
  Readonly<{
    hideLabel?: string | undefined;
    showLabel?: string | undefined;
  }>;

function splitFieldProps<P extends TextControlBaseProps>(
  props: P,
): Readonly<{ frame: TextControlBaseProps; rest: Omit<P, keyof TextControlBaseProps> }> {
  const { className, description, error, id, label, requirement, size, tone, ...rest } = props;
  return {
    frame: { className, description, error, id, label, requirement, size, tone },
    rest: rest as Omit<P, keyof TextControlBaseProps>,
  };
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  function TextField(props, ref) {
    const { frame, rest } = splitFieldProps(props);
    const { type = "text", ...inputProps } = rest;

    return renderTextControl(frame, (attributes) => (
      <input {...inputProps} {...attributes} ref={ref} type={type} />
    ));
  },
);

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  function TextArea(props, ref) {
    const { frame, rest } = splitFieldProps(props);
    const { rows = 4, ...textAreaProps } = rest;

    return renderTextControl(
      frame,
      (attributes) => <textarea {...textAreaProps} {...attributes} ref={ref} rows={rows} />,
      styles.textArea,
    );
  },
);

export const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(
  function PasswordField(props, ref) {
    const { frame, rest } = splitFieldProps(props);
    const {
      hideLabel = "Hide password",
      showLabel = "Show password",
      ...inputProps
    } = rest as Omit<PasswordFieldProps, keyof TextControlBaseProps>;
    const [revealed, setRevealed] = useState(false);

    return renderTextControl({ ...frame, tone: "interface" }, (attributes) => (
      <span className={styles.controlWrap}>
        <input
          {...inputProps}
          {...attributes}
          ref={ref}
          className={joinClassNames(attributes.className, styles.withAffix)}
          type={revealed ? "text" : "password"}
        />
        <button
          aria-controls={attributes.id}
          aria-label={revealed ? hideLabel : showLabel}
          aria-pressed={revealed}
          className={styles.affix}
          disabled={inputProps.disabled ?? false}
          onClick={() => setRevealed((current) => !current)}
          type="button"
        >
          <Icon decorative name={revealed ? "eye-off" : "eye"} size="sm" />
        </button>
      </span>
    ));
  },
);
