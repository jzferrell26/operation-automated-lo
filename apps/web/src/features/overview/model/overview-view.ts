import type { DeepReadonly, Overview } from "../../ui-foundation/model/synthetic-ui.js";

/**
 * The frozen fixture schema can only describe observed metrics, so it has no way to say
 * "no provider is wired up at all". The review surface needs exactly that, so the rendered
 * metric union is widened here rather than loosening the fixture contract.
 */
export type NotConnectedOverviewMetric = Readonly<{
  id: string;
  label: string;
  source: string;
  freshness: string;
  synthetic: true;
  state: "not_connected";
  nextAction: string;
}>;

export type OverviewMetricView =
  DeepReadonly<Overview>["metrics"][number] | NotConnectedOverviewMetric;

export type OverviewView = Omit<DeepReadonly<Overview>, "metrics"> & {
  readonly metrics: readonly OverviewMetricView[];
};
