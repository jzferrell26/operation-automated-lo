"use client";

import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ForwardedRef,
  type ReactNode,
} from "react";

import styles from "./Button.module.css";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

export type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-busy"> & {
  readonly loading?: boolean;
  readonly loadingLabel?: string;
  readonly size?: ButtonSize;
  readonly variant?: ButtonVariant;
};

function classNames(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    children,
    className,
    disabled = false,
    loading = false,
    loadingLabel = "Working",
    size = "md",
    type = "button",
    variant = "primary",
    ...buttonProps
  },
  ref,
) {
  const isDisabled = disabled || loading;

  return (
    <button
      {...buttonProps}
      ref={ref}
      type={type}
      className={classNames(styles.button, styles[variant], styles[size], className)}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      data-loading={loading || undefined}
      data-size={size}
      data-variant={variant}
    >
      {loading ? <span className={styles.spinner} aria-hidden="true" /> : null}
      <span>{children}</span>
      {loading ? <span className={styles.visuallyHidden}>{loadingLabel}</span> : null}
    </button>
  );
});

Button.displayName = "Button";

type SafeActionContext = Readonly<{
  explanation: string;
  requiredRole: string;
}>;

export type SafeActionConfirmation = Readonly<{
  effect: string;
  result: string;
  scope: string;
  title: string;
}>;

export type SafeActionDecision =
  | (SafeActionContext &
      Readonly<{
        state: "ready";
        confirmation: SafeActionConfirmation;
      }>)
  | (SafeActionContext &
      Readonly<{
        state: "blocked";
        prerequisite: string;
        responsibleParty: string;
        nextAction: string;
      }>)
  | (SafeActionContext &
      Readonly<{
        state: "permission_restricted";
        responsibleParty: string;
        nextAction: string;
      }>)
  | (SafeActionContext &
      Readonly<{
        state: "uncertain_reconciling";
        correlationId: string;
        lastSafeState: string;
        nextAction: string;
      }>)
  | (SafeActionContext &
      Readonly<{
        state: "loading";
        lastSafeState: string;
        progressLabel: string;
      }>)
  | (SafeActionContext &
      Readonly<{
        state: "error";
        lastSafeState: string;
        responsibleParty: string;
        nextAction: string;
        retrySafe: boolean;
      }>);

export type SafeActionProps = Omit<
  ButtonProps,
  "aria-describedby" | "children" | "disabled" | "loading" | "onClick"
> & {
  readonly confirmLabel?: string;
  readonly decision: SafeActionDecision;
  readonly descriptionId?: string;
  readonly label: string;
  readonly onConfirm: () => Promise<void> | void;
};

export type SafeActionActivation = "confirm" | "invoke" | "blocked";

/** Pure activation policy shared by the control and its focused contract tests. */
export function getSafeActionActivation(decision: SafeActionDecision): SafeActionActivation {
  if (decision.state === "ready") {
    return "confirm";
  }

  if (decision.state === "error" && decision.retrySafe) {
    return "invoke";
  }

  return "blocked";
}

function setForwardedRef<T>(ref: ForwardedRef<T>, value: T | null) {
  if (typeof ref === "function") {
    ref(value);
    return;
  }

  if (ref) {
    ref.current = value;
  }
}

export const SafeAction = forwardRef<HTMLButtonElement, SafeActionProps>(function SafeAction(
  {
    confirmLabel,
    decision,
    descriptionId,
    label,
    onConfirm,
    size = "md",
    variant = "primary",
    ...buttonProps
  },
  ref,
) {
  const generatedId = useId();
  const contextId = descriptionId ?? `${generatedId}-safe-action-context`;
  const confirmationTitleId = `${generatedId}-confirmation-title`;
  const confirmationDescriptionId = `${generatedId}-confirmation-description`;
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const confirmRef = useRef<HTMLButtonElement | null>(null);
  const returnFocusRef = useRef(false);
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [invoking, setInvoking] = useState(false);

  useEffect(() => {
    if (confirmationOpen) {
      confirmRef.current?.focus();
      return;
    }

    if (returnFocusRef.current) {
      returnFocusRef.current = false;
      triggerRef.current?.focus();
    }
  }, [confirmationOpen]);

  const activation = getSafeActionActivation(decision);
  const disabled = invoking || activation === "blocked";
  const loading = invoking || decision.state === "loading";

  function closeConfirmation() {
    returnFocusRef.current = true;
    setConfirmationOpen(false);
  }

  async function invokeConfirmedAction() {
    setInvoking(true);
    closeConfirmation();

    try {
      await onConfirm();
    } finally {
      setInvoking(false);
    }
  }

  function handleAction() {
    if (activation === "confirm") {
      setConfirmationOpen(true);
      return;
    }

    if (activation === "invoke") {
      void invokeConfirmedAction();
    }
  }

  return (
    <div className={styles.safeAction} data-action-state={decision.state}>
      <Button
        {...buttonProps}
        ref={(element) => {
          triggerRef.current = element;
          setForwardedRef(ref, element);
        }}
        aria-describedby={contextId}
        aria-haspopup={decision.state === "ready" ? "dialog" : undefined}
        aria-expanded={decision.state === "ready" ? confirmationOpen : undefined}
        disabled={disabled}
        loading={loading}
        loadingLabel={decision.state === "loading" ? decision.progressLabel : "Working"}
        onClick={handleAction}
        size={size}
        variant={variant}
      >
        {label}
      </Button>

      <SafeActionContextDetails decision={decision} id={contextId} />

      {confirmationOpen && decision.state === "ready" ? (
        <div
          role="alertdialog"
          aria-labelledby={confirmationTitleId}
          aria-describedby={confirmationDescriptionId}
          className={styles.confirmation}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              closeConfirmation();
            }
          }}
        >
          <h2 id={confirmationTitleId}>{decision.confirmation.title}</h2>
          <div id={confirmationDescriptionId}>
            <dl className={styles.explanationDetails}>
              <div>
                <dt>Effect</dt>
                <dd>{decision.confirmation.effect}</dd>
              </div>
              <div>
                <dt>Scope</dt>
                <dd>{decision.confirmation.scope}</dd>
              </div>
              <div>
                <dt>Result</dt>
                <dd>{decision.confirmation.result}</dd>
              </div>
            </dl>
          </div>
          <div className={styles.confirmationActions}>
            <Button ref={confirmRef} onClick={() => void invokeConfirmedAction()} size="md">
              {confirmLabel ?? `Confirm ${label}`}
            </Button>
            <Button onClick={closeConfirmation} size="md" variant="secondary">
              Cancel
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
});

SafeAction.displayName = "SafeAction";

function SafeActionContextDetails({
  decision,
  id,
}: Readonly<{ decision: SafeActionDecision; id: string }>) {
  return (
    <div id={id} className={styles.explanation} data-testid="safe-action-context">
      <p>{decision.explanation}</p>
      <dl className={styles.explanationDetails}>
        <EvidenceDetail term="Required role">{decision.requiredRole}</EvidenceDetail>
        {decision.state === "blocked" ? (
          <>
            <EvidenceDetail term="Prerequisite">{decision.prerequisite}</EvidenceDetail>
            <EvidenceDetail term="Responsible party">{decision.responsibleParty}</EvidenceDetail>
            <EvidenceDetail term="Next safe action">{decision.nextAction}</EvidenceDetail>
          </>
        ) : null}
        {decision.state === "permission_restricted" ? (
          <>
            <EvidenceDetail term="Authorized resolver">{decision.responsibleParty}</EvidenceDetail>
            <EvidenceDetail term="Access path">{decision.nextAction}</EvidenceDetail>
          </>
        ) : null}
        {decision.state === "uncertain_reconciling" ? (
          <>
            <EvidenceDetail term="Last safe state">{decision.lastSafeState}</EvidenceDetail>
            <EvidenceDetail term="Correlation ID" valueClassName={styles.dataText}>
              {decision.correlationId}
            </EvidenceDetail>
            <EvidenceDetail term="Next safe action">{decision.nextAction}</EvidenceDetail>
          </>
        ) : null}
        {decision.state === "loading" ? (
          <EvidenceDetail term="Last safe state">{decision.lastSafeState}</EvidenceDetail>
        ) : null}
        {decision.state === "error" ? (
          <>
            <EvidenceDetail term="Last safe state">{decision.lastSafeState}</EvidenceDetail>
            <EvidenceDetail term="Responsible party">{decision.responsibleParty}</EvidenceDetail>
            <EvidenceDetail term="Next safe action">{decision.nextAction}</EvidenceDetail>
            <EvidenceDetail term="Retry">
              {decision.retrySafe ? "Safe to retry" : "Retry unavailable"}
            </EvidenceDetail>
          </>
        ) : null}
      </dl>
    </div>
  );
}

function EvidenceDetail({
  children,
  term,
  valueClassName,
}: Readonly<{ children: ReactNode; term: string; valueClassName?: string | undefined }>) {
  return (
    <div>
      <dt>{term}</dt>
      <dd {...(valueClassName ? { className: valueClassName } : {})}>{children}</dd>
    </div>
  );
}
