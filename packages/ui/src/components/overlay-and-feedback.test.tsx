import { readFileSync } from "node:fs";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { Badge, getBadgeGlyph, type BadgeTone } from "./Badge.js";
import { LiveRegion, resolveAnnouncement } from "./LiveRegion.js";
import { Stepper, resolveStepperPosition, type StepperStep } from "./Stepper.js";
import { Dialog, Sheet, resolveTabTarget } from "./overlay.js";

const overlaySource = readFileSync(new URL("./overlay.tsx", import.meta.url), "utf8");

const layerContent = {
  children: "Pausing stops new sends. Delivery already in flight is not recalled.",
  description: "Campaign version 3, Open House Boost.",
  onClose: vi.fn(),
  title: "Pause this campaign",
} as const;

const guidedSteps: readonly StepperStep[] = [
  { id: "install", state: "complete", title: "Install and permissions" },
  { description: "Licence and disclosures", id: "brand", state: "complete", title: "Brand" },
  { id: "routing", state: "current", title: "HighLevel routing" },
  { id: "meta", state: "blocked", title: "Meta connection" },
  { id: "review", state: "upcoming", title: "Results review" },
];

function fakeElement(name: string): HTMLElement {
  return { name } as unknown as HTMLElement;
}

describe("dismissable layer focus policy", () => {
  it("wraps Tab only at the ends of the layer", () => {
    const first = fakeElement("first");
    const middle = fakeElement("middle");
    const last = fakeElement("last");
    const order = [first, middle, last];

    expect(resolveTabTarget(order, last, false)).toBe(first);
    expect(resolveTabTarget(order, first, true)).toBe(last);
    expect(resolveTabTarget(order, middle, false)).toBeNull();
    expect(resolveTabTarget(order, middle, true)).toBeNull();
    expect(resolveTabTarget([], first, false)).toBeNull();
  });

  it("never hides the page from assistive technology, so nothing survives a close", () => {
    expect(overlaySource).not.toMatch(/aria-hidden\s*[=:]/u);
    expect(overlaySource).not.toContain("setAttribute");
    expect(overlaySource).toContain('aria-modal={modal ? "true" : undefined}');
    expect(overlaySource).toContain("openerRef.current?.focus()");
    expect(overlaySource).toContain('event.key === "Escape"');
  });
});

describe("Dialog", () => {
  it("renders nothing until it is open", () => {
    expect(renderToStaticMarkup(createElement(Dialog, { ...layerContent, open: false }))).toBe("");
  });

  it("is a modal layer with an accessible name, description, and close control", () => {
    const markup = renderToStaticMarkup(createElement(Dialog, { ...layerContent, open: true }));
    const titleId = /aria-labelledby="([^"]+)"/u.exec(markup)?.[1];
    const descriptionId = /aria-describedby="([^"]+)"/u.exec(markup)?.[1];

    expect(markup).toContain('role="dialog"');
    expect(markup).toContain('aria-modal="true"');
    expect(markup).toContain('data-overlay-kind="dialog"');
    expect(markup).toContain(`id="${titleId}"`);
    expect(markup).toContain(`id="${descriptionId}"`);
    expect(markup).toContain('aria-label="Close"');
  });

  it("uses the alert role and the compact panel for a consequential confirmation", () => {
    const markup = renderToStaticMarkup(
      createElement(Dialog, { ...layerContent, open: true, size: "sm", urgent: true }),
    );

    expect(markup).toContain('role="alertdialog"');
    expect(markup).toContain('data-panel-size="sm"');
  });

  it("renders a footer region only when a footer is supplied", () => {
    const withFooter = renderToStaticMarkup(
      createElement(Dialog, {
        ...layerContent,
        footer: createElement("button", { type: "button" }, "Confirm pause"),
        open: true,
      }),
    );

    expect(withFooter).toContain("Confirm pause");
  });
});

describe("Sheet", () => {
  it("is a non-modal layer that leaves the page behind it operable", () => {
    const markup = renderToStaticMarkup(createElement(Sheet, { ...layerContent, open: true }));

    expect(markup).toContain('role="dialog"');
    expect(markup).not.toContain("aria-modal");
    expect(markup).toContain('data-overlay-kind="sheet"');
    expect(markup).toContain('data-anchor="inline-end"');
  });

  it("supports the block-end anchor used by the guided setup", () => {
    const markup = renderToStaticMarkup(
      createElement(Sheet, { ...layerContent, anchor: "block-end", open: true }),
    );

    expect(markup).toContain('data-anchor="block-end"');
  });
});

describe("Stepper", () => {
  it("counts completion from the explicit state, never from the visited position", () => {
    const position = resolveStepperPosition(guidedSteps);

    expect(position).toEqual({
      completedCount: 2,
      currentIndex: 2,
      percentComplete: 40,
      positionLabel: "Step 3 of 5",
      total: 5,
    });
    expect(resolveStepperPosition([])).toMatchObject({ percentComplete: 0, total: 0 });
    expect(
      resolveStepperPosition([{ id: "one", state: "complete", title: "One" }]).positionLabel,
    ).toBe("Step 1 of 1");
  });

  it("labels the progress bar and every step state without relying on color", () => {
    const markup = renderToStaticMarkup(
      createElement(Stepper, { label: "Guided setup", steps: guidedSteps }),
    );

    expect(markup).toContain('role="progressbar"');
    expect(markup).toContain('aria-valuenow="2"');
    expect(markup).toContain('aria-valuemax="5"');
    expect(markup).toContain('aria-valuetext="2 of 5 steps complete"');
    expect(markup).toContain("Step 3 of 5");
    expect(markup).toContain('aria-label="Guided setup"');

    for (const [state, label] of [
      ["complete", "Complete"],
      ["current", "In progress"],
      ["blocked", "Blocked"],
      ["upcoming", "Not started"],
    ] as const) {
      expect(markup).toContain(`data-step-state="${state}"`);
      expect(markup).toContain(label);
    }
    expect(markup).toContain("Licence and disclosures");
  });
});

describe("Badge", () => {
  it("pairs every tone with a distinct glyph and a text label", () => {
    const tones: readonly BadgeTone[] = [
      "success",
      "warning",
      "critical",
      "info",
      "neutral",
      "uncertain",
    ];
    const glyphs = new Set(tones.map((tone) => getBadgeGlyph(tone)));
    expect(glyphs.size).toBe(tones.length);

    for (const tone of tones) {
      const markup = renderToStaticMarkup(
        createElement(Badge, { children: `${tone} label`, tone }),
      );
      expect(markup).toContain(`data-tone="${tone}"`);
      expect(markup).toContain(`${tone} label`);
      expect(markup).toContain('aria-hidden="true"');
      expect(markup).toContain("<svg");
    }
  });

  it("accepts an explicit glyph for a status that needs a sharper cue", () => {
    const markup = renderToStaticMarkup(
      createElement(Badge, { children: "Reconnect required", icon: "lock", tone: "critical" }),
    );

    expect(markup).toContain('data-tone="critical"');
    expect(markup).toContain("Reconnect required");
  });
});

describe("LiveRegion", () => {
  it("announces a routine result politely and a failure assertively", () => {
    expect(resolveAnnouncement("status")).toEqual({
      "aria-atomic": "true",
      "aria-live": "polite",
      role: "status",
    });
    expect(resolveAnnouncement("alert")).toEqual({
      "aria-atomic": "true",
      "aria-live": "assertive",
      role: "alert",
    });

    const status = renderToStaticMarkup(
      createElement(LiveRegion, { message: "Step 3 of 7, HighLevel routing." }),
    );
    const alert = renderToStaticMarkup(
      createElement(LiveRegion, { message: "Sign-in failed.", urgency: "alert", visible: true }),
    );

    expect(status).toContain('role="status"');
    expect(status).toContain('aria-live="polite"');
    expect(status).toContain("oalo-visually-hidden");
    expect(alert).toContain('role="alert"');
    expect(alert).toContain('aria-live="assertive"');
    expect(alert).not.toContain("oalo-visually-hidden");
  });

  it("renders the region before it carries a message so the announcement is heard", () => {
    const empty = renderToStaticMarkup(createElement(LiveRegion, {}));

    expect(empty).toContain('role="status"');
    expect(empty).toContain('data-live-urgency="status"');
  });
});
