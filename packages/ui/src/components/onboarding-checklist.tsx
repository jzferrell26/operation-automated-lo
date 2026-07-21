import { useId, type HTMLAttributes, type ReactElement, type ReactNode } from "react";

import { Icon, type IconName, type IconTone } from "./Icon.js";
import { joinClassNames } from "./internal.js";
import "./primitives.css";

export type OnboardingItemState = "not_started" | "in_progress" | "blocked" | "complete" | "stale";

const onboardingStatePresentation: Readonly<
  Record<OnboardingItemState, { icon: IconName; label: string; tone: IconTone }>
> = Object.freeze({
  not_started: { icon: "circle-dot", label: "Not started", tone: "neutral" },
  in_progress: { icon: "clock", label: "In progress", tone: "warning" },
  blocked: { icon: "alert-triangle", label: "Blocked", tone: "critical" },
  complete: { icon: "check", label: "Complete", tone: "success" },
  stale: { icon: "clock", label: "Stale", tone: "warning" },
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
        <p className="oalo-checklist-item__locked">Locked until the prior phase is complete.</p>
      ) : null}
      {item.state === "complete" ? <OnboardingEvidenceDetails evidence={item.evidence} /> : null}
      {item.state !== "complete" && (item.reason || item.responsibleParty || item.nextAction) ? (
        <dl className="oalo-evidence-list">
          {item.reason ? (
            <div>
              <dt>Reason</dt>
              <dd>{item.reason}</dd>
            </div>
          ) : null}
          {item.responsibleParty ? (
            <div>
              <dt>Responsible party</dt>
              <dd>{item.responsibleParty}</dd>
            </div>
          ) : null}
          {item.nextAction ? (
            <div>
              <dt>Next safe action</dt>
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
        <dt>Evidence</dt>
        <dd>{evidence.summary}</dd>
      </div>
      <div>
        <dt>Verified</dt>
        <dd>{evidence.verifiedAt}</dd>
      </div>
      <div>
        <dt>Verifier version</dt>
        <dd className="oalo-data-text">{evidence.verifierVersion}</dd>
      </div>
      {evidence.providerIds?.map((providerId) => (
        <div key={providerId}>
          <dt>Provider reference</dt>
          <dd className="oalo-data-text">{providerId}</dd>
        </div>
      ))}
    </dl>
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
          aria-label={`${completedCount} of ${items.length} complete`}
          className="oalo-checklist__progress"
        >
          {completedCount}/{items.length} complete
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
