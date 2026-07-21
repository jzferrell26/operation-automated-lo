import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import {
  Button,
  SafeAction,
  getSafeActionActivation,
  type ButtonSize,
  type ButtonVariant,
  type SafeActionDecision,
} from "./Button.js";
import { Icon, IconButton } from "./Icon.js";
import { ThemeSegmentedControl } from "./ThemeSegmentedControl.js";

const safeActionContext = Object.freeze({
  explanation: "This action changes provider state.",
  requiredRole: "Owner",
});

const safeActionDecisions = Object.freeze({
  ready: {
    ...safeActionContext,
    state: "ready",
    confirmation: {
      effect: "Pause delivery",
      result: "No new campaign sends will start.",
      scope: "Open House Boost campaign 42",
      title: "Confirm campaign pause",
    },
  },
  blocked: {
    ...safeActionContext,
    state: "blocked",
    prerequisite: "Routing verification is current",
    responsibleParty: "Location administrator",
    nextAction: "Recheck HighLevel routing",
  },
  permission_restricted: {
    ...safeActionContext,
    state: "permission_restricted",
    responsibleParty: "Compliance approver",
    nextAction: "Request approval from the compliance approver",
  },
  uncertain_reconciling: {
    ...safeActionContext,
    state: "uncertain_reconciling",
    correlationId: "corr-safe-42",
    lastSafeState: "Campaign delivery was active",
    nextAction: "Wait for provider read-back",
  },
  loading: {
    ...safeActionContext,
    state: "loading",
    lastSafeState: "Campaign delivery was active",
    progressLabel: "Pausing campaign",
  },
  error: {
    ...safeActionContext,
    state: "error",
    lastSafeState: "Campaign delivery was active",
    responsibleParty: "Location administrator",
    nextAction: "Retry the idempotent status update",
    retrySafe: true,
  },
} satisfies Readonly<Record<string, SafeActionDecision>>);

function renderSafeAction(decision: SafeActionDecision) {
  return renderToStaticMarkup(
    createElement(SafeAction, {
      decision,
      label: "Pause campaign",
      onConfirm: vi.fn(),
    }),
  );
}

describe("interactive controls", () => {
  it("renders every governed Button variant and size", () => {
    const variants: readonly ButtonVariant[] = ["primary", "secondary", "outline", "ghost"];
    const sizes: readonly ButtonSize[] = ["sm", "md", "lg"];

    for (const variant of variants) {
      for (const size of sizes) {
        const markup = renderToStaticMarkup(
          createElement(Button, { children: `${variant} ${size}`, size, variant }),
        );
        expect(markup).toContain(`data-variant="${variant}"`);
        expect(markup).toContain(`data-size="${size}"`);
      }
    }
  });

  it("makes loading buttons inert while retaining their label and progress name", () => {
    const markup = renderToStaticMarkup(
      createElement(Button, { loading: true, loadingLabel: "Saving", children: "Save" }),
    );

    expect(markup).toContain("disabled");
    expect(markup).toContain('aria-busy="true"');
    expect(markup).toContain("Save");
    expect(markup).toContain("Saving");
  });

  it("routes ready actions through confirmation before invocation", () => {
    const markup = renderSafeAction(safeActionDecisions.ready);

    expect(getSafeActionActivation(safeActionDecisions.ready)).toBe("confirm");
    expect(markup).toContain('aria-haspopup="dialog"');
    expect(markup).toContain('aria-expanded="false"');
    expect(markup).not.toContain('role="alertdialog"');
  });

  it("renders all six SafeAction states with their authorized activation policy", () => {
    const expected = [
      [safeActionDecisions.ready, "confirm", false],
      [safeActionDecisions.blocked, "blocked", true],
      [safeActionDecisions.permission_restricted, "blocked", true],
      [safeActionDecisions.uncertain_reconciling, "blocked", true],
      [safeActionDecisions.loading, "blocked", true],
      [safeActionDecisions.error, "invoke", false],
    ] as const;

    for (const [decision, activation, disabled] of expected) {
      const markup = renderSafeAction(decision);
      expect(markup).toContain(`data-action-state="${decision.state}"`);
      expect(getSafeActionActivation(decision)).toBe(activation);
      expect(markup.includes("disabled")).toBe(disabled);
      expect(markup).toContain(decision.explanation);
      expect(markup).toContain(decision.requiredRole);
    }

    expect(renderSafeAction(safeActionDecisions.blocked)).toContain(
      "Routing verification is current",
    );
    expect(renderSafeAction(safeActionDecisions.permission_restricted)).toContain(
      "Compliance approver",
    );
    expect(renderSafeAction(safeActionDecisions.uncertain_reconciling)).toContain("corr-safe-42");
    expect(renderSafeAction(safeActionDecisions.loading)).toContain("Pausing campaign");
    expect(renderSafeAction(safeActionDecisions.error)).toContain("Safe to retry");
  });

  it("blocks unsafe error retries", () => {
    const unsafeError: SafeActionDecision = { ...safeActionDecisions.error, retrySafe: false };
    const markup = renderSafeAction(unsafeError);

    expect(getSafeActionActivation(unsafeError)).toBe("blocked");
    expect(markup).toContain("disabled");
    expect(markup).toContain("Retry unavailable");
  });

  it("requires explicit names for semantic icons and icon buttons", () => {
    const iconMarkup = renderToStaticMarkup(
      createElement(Icon, {
        decorative: false,
        label: "Connection warning",
        name: "alert-triangle",
      }),
    );
    const buttonMarkup = renderToStaticMarkup(
      createElement(IconButton, { icon: "menu", label: "Open navigation" }),
    );

    expect(iconMarkup).toContain('role="img"');
    expect(iconMarkup).toContain('aria-label="Connection warning"');
    expect(buttonMarkup).toContain('aria-label="Open navigation"');
  });

  it("exposes Light, Dark, and System as one selected radio group", () => {
    const markup = renderToStaticMarkup(
      createElement(ThemeSegmentedControl, {
        onValueChange: vi.fn(),
        value: "system",
      }),
    );

    expect(markup).toContain('role="radiogroup"');
    expect(markup.match(/role="radio"/g)).toHaveLength(3);
    expect(markup).toContain("Light");
    expect(markup).toContain("Dark");
    expect(markup).toContain("System");
    expect(markup).toContain('data-theme-preference="system"');
    expect(markup).toContain('aria-checked="true"');
  });
});
