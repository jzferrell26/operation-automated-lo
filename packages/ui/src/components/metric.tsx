import { useId, type HTMLAttributes, type ReactNode } from "react";

import { Icon, type IconName, type IconTone } from "./Icon.js";
import { joinClassNames } from "./internal.js";
import "./primitives.css";

export type MetricState =
  | "current"
  | "stale"
  | "unavailable"
  | "not_connected"
  | "partial"
  | "uncertain"
  | "permission_restricted";

const metricStatePresentation: Readonly<
  Record<MetricState, { icon: IconName; label: string; tone: IconTone }>
> = Object.freeze({
  current: { icon: "check", label: "Current", tone: "success" },
  stale: { icon: "clock", label: "Needs a refresh", tone: "warning" },
  unavailable: { icon: "info", label: "Unavailable", tone: "neutral" },
  not_connected: { icon: "alert-triangle", label: "Not connected", tone: "warning" },
  partial: { icon: "circle-dot", label: "Partial", tone: "info" },
  uncertain: { icon: "loader", label: "Uncertain, reconciling", tone: "uncertain" },
  permission_restricted: {
    icon: "lock",
    label: "No access",
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

/** No source is wired up at all, so there is nothing to observe and nothing to reconcile. */
type NotConnectedMetricProps = Readonly<{
  state: "not_connected";
  value?: never;
  nextAction: string;
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
    | NotConnectedMetricProps
    | PartialMetricProps
    | UncertainMetricProps
    | PermissionRestrictedMetricProps
  );

function visibleMetricValue(props: MetricProps): string | number {
  switch (props.state) {
    case "unavailable":
      return "Unavailable";
    case "not_connected":
      return "Not connected";
    case "permission_restricted":
      return "No access";
    default:
      return props.value;
  }
}

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
  const visibleValue = visibleMetricValue(props);

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
          <dt>Last updated</dt>
          <dd>{freshness}</dd>
        </div>
        {synthetic ? (
          <div>
            <dt>Data type</dt>
            <dd>Not live data</dd>
          </div>
        ) : null}
        {state === "stale" || state === "not_connected" ? (
          <div>
            <dt>What to do next</dt>
            <dd>{props.nextAction}</dd>
          </div>
        ) : null}
        {state === "partial" ? (
          <div>
            <dt>Still waiting on</dt>
            <dd>{props.pendingSources.join(", ")}</dd>
          </div>
        ) : null}
        {state === "uncertain" ? (
          <>
            <div>
              <dt>Checking</dt>
              <dd>We are reading this back now</dd>
            </div>
            {props.correlationId ? (
              <div>
                <dt>Support reference</dt>
                <dd className="oalo-data-text">{props.correlationId}</dd>
              </div>
            ) : null}
          </>
        ) : null}
        {state === "permission_restricted" ? (
          <>
            <div>
              <dt>Who can do this</dt>
              <dd>{props.requiredRole}</dd>
            </div>
            <div>
              <dt>How to get access</dt>
              <dd>{props.accessPath}</dd>
            </div>
          </>
        ) : null}
      </dl>
    </article>
  );
}
