import { useId, type HTMLAttributes, type ReactNode } from "react";

import { Icon, type IconName, type IconTone } from "./Icon.js";
import { joinClassNames } from "./internal.js";
import "./primitives.css";

export type MetricState =
  "current" | "stale" | "unavailable" | "partial" | "uncertain" | "permission_restricted";

const metricStatePresentation: Readonly<
  Record<MetricState, { icon: IconName; label: string; tone: IconTone }>
> = Object.freeze({
  current: { icon: "check", label: "Current", tone: "success" },
  stale: { icon: "clock", label: "Stale", tone: "warning" },
  unavailable: { icon: "info", label: "Unavailable", tone: "neutral" },
  partial: { icon: "circle-dot", label: "Partial", tone: "info" },
  uncertain: { icon: "loader", label: "Uncertain, reconciling", tone: "uncertain" },
  permission_restricted: {
    icon: "lock",
    label: "Permission restricted",
    tone: "uncertain",
  },
});

type MetricBaseProps = Omit<HTMLAttributes<HTMLElement>, "children"> & {
  label: string;
  source: string;
  freshness: string;
  synthetic?: boolean;
  context?: ReactNode;
};

type CurrentMetricProps = Readonly<{
  state: "current";
  value: string | number;
}>;

type StaleMetricProps = Readonly<{
  state: "stale";
  value: string | number;
  nextAction: string;
}>;

type UnavailableMetricProps = Readonly<{
  state: "unavailable";
  value?: never;
}>;

type PartialMetricProps = Readonly<{
  state: "partial";
  value: string | number;
  pendingSources: readonly string[];
}>;

type UncertainMetricProps = Readonly<{
  state: "uncertain";
  value: string | number;
  correlationId?: string;
}>;

type PermissionRestrictedMetricProps = Readonly<{
  state: "permission_restricted";
  value?: never;
  requiredRole: string;
  accessPath: string;
}>;

export type MetricProps = MetricBaseProps &
  (
    | CurrentMetricProps
    | StaleMetricProps
    | UnavailableMetricProps
    | PartialMetricProps
    | UncertainMetricProps
    | PermissionRestrictedMetricProps
  );

/** A source-bearing metric that cannot collapse unavailable or restricted data into zero. */
export function Metric(props: MetricProps) {
  const { className, context, freshness, label, source, state, synthetic = false } = props;
  const articleProps = { ...props } as Partial<MetricProps> & Record<string, unknown>;
  for (const componentProp of [
    "accessPath",
    "className",
    "context",
    "correlationId",
    "freshness",
    "label",
    "nextAction",
    "pendingSources",
    "requiredRole",
    "source",
    "state",
    "synthetic",
    "value",
  ]) {
    delete articleProps[componentProp];
  }
  const labelId = useId();
  const presentation = metricStatePresentation[state];
  const visibleValue =
    state === "unavailable"
      ? "Unavailable"
      : state === "permission_restricted"
        ? "Restricted"
        : props.value;

  return (
    <article
      {...(articleProps as HTMLAttributes<HTMLElement>)}
      aria-labelledby={labelId}
      className={joinClassNames("oalo-metric", className)}
      data-state={state}
    >
      <div className="oalo-metric__heading">
        <h3 className="oalo-metric__label" id={labelId}>
          {label}
        </h3>
        <span className="oalo-state-label">
          <span aria-hidden="true" className="oalo-state-label__glyph">
            <Icon decorative name={presentation.icon} size="sm" tone={presentation.tone} />
          </span>
          {presentation.label}
        </span>
      </div>
      <p className="oalo-metric__value">{visibleValue}</p>
      {context ? <div className="oalo-metric__context">{context}</div> : null}
      <dl className="oalo-evidence-list">
        <div>
          <dt>Source</dt>
          <dd>{source}</dd>
        </div>
        <div>
          <dt>Freshness</dt>
          <dd>{freshness}</dd>
        </div>
        {synthetic ? (
          <div>
            <dt>Data type</dt>
            <dd>Synthetic data</dd>
          </div>
        ) : null}
        {state === "stale" ? (
          <div>
            <dt>Next safe action</dt>
            <dd>{props.nextAction}</dd>
          </div>
        ) : null}
        {state === "partial" ? (
          <div>
            <dt>Sources pending</dt>
            <dd>{props.pendingSources.join(", ")}</dd>
          </div>
        ) : null}
        {state === "uncertain" ? (
          <>
            <div>
              <dt>Reconciliation</dt>
              <dd>Read-back in progress</dd>
            </div>
            {props.correlationId ? (
              <div>
                <dt>Correlation ID</dt>
                <dd className="oalo-data-text">{props.correlationId}</dd>
              </div>
            ) : null}
          </>
        ) : null}
        {state === "permission_restricted" ? (
          <>
            <div>
              <dt>Required role</dt>
              <dd>{props.requiredRole}</dd>
            </div>
            <div>
              <dt>Access path</dt>
              <dd>{props.accessPath}</dd>
            </div>
          </>
        ) : null}
      </dl>
    </article>
  );
}
