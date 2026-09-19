import { useId, type HTMLAttributes, type ReactElement, type ReactNode } from "react";

import { Icon, type IconName, type IconTone } from "./Icon.js";
import { joinClassNames } from "./internal.js";
import "./primitives.css";

export type OnboardingItemState = "not_started" | "in_progress" | "blocked" | "complete" | "stale";

const onboardingStatePresentation: Readonly<
  Record<OnboardingItemState, { icon: IconName; label: string; tone: IconTone }>
> = Object.freeze({
  not_started: { icon: "circle-dot", label: "Not started", tone: "neutral" },
  in_progress: { icon: "clock", label: "Started", tone: "warning" },
  blocked: { icon: "alert-triangle", label: "Stuck", tone: "critical" },
  complete: { icon: "check", label: "Done", tone: "success" },
  stale: { icon: "clock", label: "Needs a refresh", tone: "warning" },
});

export interface OnboardingEvidence {
  summary: string;
  verifiedAt: string;
  verifierVersion: string;
  providerIds?: readonly string[];
}

interface OnboardingItemBase {
  id: string;
  title: string;
  description?: ReactNode;
  action?: ReactElement;
}

export interface IncompleteOnboardingItem extends OnboardingItemBase {
  state: Exclude<OnboardingItemState, "complete">;
  reason?: string;
  responsibleParty?: string;
  nextAction?: string;
  evidence?: never;
}

export interface CompleteOnboardingItem extends OnboardingItemBase {
  state: "complete";
  evidence: OnboardingEvidence;
  reason?: never;
  responsibleParty?: never;
  nextAction?: never;
}

export type OnboardingChecklistItemModel = IncompleteOnboardingItem | CompleteOnboardingItem;

export interface OnboardingChecklistItemProps extends HTMLAttributes<HTMLLIElement> {
  item: OnboardingChecklistItemModel;
  locked?: boolean;
}

export function OnboardingChecklistItem({
  className,
  item,
  locked = false,
  ...props
}: OnboardingChecklistItemProps) {
  const titleId = useId();
  const presentation = onboardingStatePresentation[item.state];

  return (
    <li
      {...props}
      aria-labelledby={titleId}
      className={joinClassNames("oalo-checklist-item", className)}
      data-locked={locked || undefined}
      data-state={item.state}
    >
      <div className="oalo-checklist-item__heading">
        <h3 id={titleId}>{item.title}</h3>
        <span className="oalo-state-label">
          <span aria-hidden="true" className="oalo-state-label__glyph">
            <Icon decorative name={presentation.icon} size="sm" tone={presentation.tone} />
          </span>
          {presentation.label}
        </span>
      </div>
      {item.description ? (
        <div className="oalo-checklist-item__description">{item.description}</div>
      ) : null}
      {locked ? (
        <p className="oalo-checklist-item__locked">Locked until the steps above are done.</p>
      ) : null}
      {item.state === "complete" ? (
        <>
          <OnboardingEvidenceDetails evidence={item.evidence} />
          <OnboardingSupportDetails evidence={item.evidence} />
        </>
      ) : null}
      {item.state !== "complete" && (item.reason || item.responsibleParty || item.nextAction) ? (
        <dl className="oalo-evidence-list">
          {item.reason ? (
            <div>
              <dt>Why</dt>
              <dd>{item.reason}</dd>
            </div>
          ) : null}
          {item.responsibleParty ? (
            <div>
              <dt>Who can do this</dt>
              <dd>{item.responsibleParty}</dd>
            </div>
          ) : null}
          {item.nextAction ? (
            <div>
              <dt>What to do next</dt>
              <dd>{item.nextAction}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}
      {!locked && item.action ? <div className="oalo-state-actions">{item.action}</div> : null}
    </li>
  );
}

function OnboardingEvidenceDetails({ evidence }: { evidence: OnboardingEvidence }) {
  return (
    <dl className="oalo-evidence-list">
      <div>
        <dt>What we checked</dt>
        <dd>{evidence.summary}</dd>
      </div>
      <div>
        <dt>Checked on</dt>
        <dd>{evidence.verifiedAt}</dd>
      </div>
    </dl>
  );
}

/**
 * The checker's version and the account references behind a finished step.
 *
 * Both are real and both are kept, but neither is something a loan officer reads: they are what
 * support asks for. PRD-006b D8 gives them one collapsed region, closed by default, with plain
 * labels, and `data-support-details` so the rendered-output guard can subtract this region before
 * asserting that no identifier appears anywhere else on the page.
 */
function OnboardingSupportDetails({ evidence }: { evidence: OnboardingEvidence }) {
  return (
    <details data-support-details>
      <summary>Details for support</summary>
      <dl className="oalo-evidence-list">
        <div>
          <dt>Checker version</dt>
          <dd className="oalo-data-text">{evidence.verifierVersion}</dd>
        </div>
        {evidence.providerIds?.map((providerId) => (
          <div key={providerId}>
            <dt>Account reference</dt>
            <dd className="oalo-data-text">{providerId}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}

export interface OnboardingChecklistProps extends Omit<
  HTMLAttributes<HTMLElement>,
  "children" | "title"
> {
  title: ReactNode;
  description?: ReactNode;
  items: readonly OnboardingChecklistItemModel[];
  locked?: boolean;
}

/** Read-only projection of server-verified onboarding state, in logical DOM order. */
export function OnboardingChecklist({
  className,
  description,
  items,
  locked = false,
  title,
  ...props
}: OnboardingChecklistProps) {
  const titleId = useId();
  const completedCount = items.filter((item) => item.state === "complete").length;

  return (
    <section
      {...props}
      aria-labelledby={titleId}
      className={joinClassNames("oalo-checklist", className)}
      data-locked={locked || undefined}
    >
      <div className="oalo-checklist__heading">
        <div>
          <h2 id={titleId}>{title}</h2>
          {description ? <div className="oalo-checklist__description">{description}</div> : null}
        </div>
        <p
          aria-label={`${completedCount} of ${items.length} done`}
          className="oalo-checklist__progress"
        >
          {completedCount} of {items.length} done
        </p>
      </div>
      <ol className="oalo-checklist__items">
        {items.map((item) => (
          <OnboardingChecklistItem item={item} key={item.id} locked={locked} />
        ))}
      </ol>
    </section>
  );
}
