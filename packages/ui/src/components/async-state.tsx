import { useId, type HTMLAttributes, type ReactElement, type ReactNode } from "react";

import { Icon, type IconName, type IconTone } from "./Icon.js";
import { joinClassNames } from "./internal.js";
import "./primitives.css";

export type AsyncStateKind = "loading" | "empty" | "error" | "permission_restricted" | "degraded";

const asyncStatePresentation: Readonly<
  Record<AsyncStateKind, { icon: IconName; label: string; tone: IconTone }>
> = Object.freeze({
  loading: { icon: "loader", label: "Loading", tone: "info" },
  empty: { icon: "circle-dot", label: "Empty", tone: "neutral" },
  error: { icon: "circle-x", label: "Error", tone: "critical" },
  permission_restricted: {
    icon: "lock",
    label: "No access",
    tone: "uncertain",
  },
  degraded: { icon: "clock", label: "Having trouble", tone: "warning" },
});

type AsyncStateBaseProps = Omit<HTMLAttributes<HTMLElement>, "children" | "title"> & {
  title: ReactNode;
  description: ReactNode;
  primaryAction?: ReactElement;
  secondaryAction?: ReactElement;
  details?: ReactNode;
};

type StandardAsyncStateProps = AsyncStateBaseProps & {
  kind: Exclude<AsyncStateKind, "permission_restricted">;
  reason?: never;
  requiredRole?: never;
  responsibleParty?: never;
};

type PermissionRestrictedAsyncStateProps = AsyncStateBaseProps & {
  kind: "permission_restricted";
  reason: string;
  requiredRole: string;
  responsibleParty: string;
};

export type AsyncStateProps = StandardAsyncStateProps | PermissionRestrictedAsyncStateProps;

export function AsyncState(props: AsyncStateProps) {
  const { className, description, details, kind, primaryAction, secondaryAction, title } = props;
  const sectionProps = { ...props } as Partial<AsyncStateProps> & Record<string, unknown>;
  for (const componentProp of [
    "className",
    "description",
    "details",
    "kind",
    "primaryAction",
    "reason",
    "requiredRole",
    "responsibleParty",
    "secondaryAction",
    "title",
  ]) {
    delete sectionProps[componentProp];
  }
  const titleId = useId();
  const presentation = asyncStatePresentation[kind];
  const isUrgent = kind === "error";
  const permissionDetails =
    kind === "permission_restricted" ? (
      <dl className="oalo-evidence-list">
        <div>
          <dt>Why</dt>
          <dd>{props.reason}</dd>
        </div>
        <div>
          <dt>Who can do this</dt>
          <dd>{props.requiredRole}</dd>
        </div>
        <div>
          <dt>Ask</dt>
          <dd>{props.responsibleParty}</dd>
        </div>
      </dl>
    ) : null;

  return (
    <section
      {...(sectionProps as HTMLAttributes<HTMLElement>)}
      aria-busy={kind === "loading" ? true : undefined}
      aria-labelledby={titleId}
      aria-live={isUrgent ? "assertive" : "polite"}
      className={joinClassNames("oalo-async-state", className)}
      data-state={kind}
      role={isUrgent ? "alert" : "status"}
    >
      <span className="oalo-state-label">
        <span aria-hidden="true" className="oalo-state-label__glyph">
          <Icon decorative name={presentation.icon} size="sm" tone={presentation.tone} />
        </span>
        {presentation.label}
      </span>
      <h2 className="oalo-async-state__title" id={titleId}>
        {title}
      </h2>
      <div className="oalo-async-state__description">{description}</div>
      {permissionDetails}
      {details ? <div className="oalo-async-state__details">{details}</div> : null}
      {primaryAction || secondaryAction ? (
        <div className="oalo-state-actions">
          {primaryAction}
          {secondaryAction}
        </div>
      ) : null}
    </section>
  );
}

type SpecializedStateProps = Omit<StandardAsyncStateProps, "kind">;

export type EmptyStateProps = SpecializedStateProps;
export function EmptyState(props: EmptyStateProps) {
  return <AsyncState kind="empty" {...props} />;
}

export type ErrorStateProps = SpecializedStateProps;
export function ErrorState(props: ErrorStateProps) {
  return <AsyncState kind="error" {...props} />;
}

export type PermissionStateProps = Omit<PermissionRestrictedAsyncStateProps, "kind">;
export function PermissionState(props: PermissionStateProps) {
  return <AsyncState kind="permission_restricted" {...props} />;
}

export type DegradedStateProps = SpecializedStateProps;
export function DegradedState(props: DegradedStateProps) {
  return <AsyncState kind="degraded" {...props} />;
}

export type LoadingStateProps = SpecializedStateProps;
export function LoadingState(props: LoadingStateProps) {
  return <AsyncState kind="loading" {...props} />;
}
