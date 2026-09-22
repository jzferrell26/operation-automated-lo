import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { FormField, resolveFieldWiring } from "./FormField.js";
import { Link, resolveExternalLinkSafety } from "./Link.js";
import { PasswordField, TextArea, TextField } from "./text-inputs.js";

function attributeValue(markup: string, attribute: string): string | undefined {
  return new RegExp(`\\s${attribute}="([^"]*)"`, "u").exec(markup)?.[1];
}

function describedIds(markup: string): readonly string[] {
  return (attributeValue(markup, "aria-describedby") ?? "").split(" ").filter(Boolean);
}

/**
 * HTML attribute names are case-insensitive, and this React build emits the
 * React property spelling (`autoComplete`, `readOnly`). The browser parses both
 * as the DOM attribute, so the contract is asserted without regard to case.
 */
function hasAttribute(markup: string, attribute: string, value?: string): boolean {
  const lowered = markup.toLowerCase();
  const needle = value === undefined ? ` ${attribute}` : ` ${attribute}="${value.toLowerCase()}"`;
  return lowered.includes(needle.toLowerCase());
}

const labelledField = {
  description: "We only use this to send sign-in links.",
  label: "Work email",
} as const;

describe("field wiring policy", () => {
  it("connects only the parts that are present", () => {
    const bare = resolveFieldWiring("f1", { hasDescription: false, hasError: false });
    expect(bare.control["aria-describedby"]).toBeUndefined();
    expect(bare.control["aria-invalid"]).toBeUndefined();
    expect(bare.control.required).toBeUndefined();
    expect(bare.control.id).toBe("f1-control");

    const described = resolveFieldWiring("f1", { hasDescription: true, hasError: false });
    expect(described.control["aria-describedby"]).toBe("f1-description");

    const failed = resolveFieldWiring("f1", { hasDescription: false, hasError: true });
    expect(failed.control["aria-describedby"]).toBe("f1-error");
    expect(failed.control["aria-invalid"]).toBe(true);

    const both = resolveFieldWiring("f1", {
      hasDescription: true,
      hasError: true,
      id: "email",
      required: true,
    });
    expect(both.control["aria-describedby"]).toBe("f1-description f1-error");
    expect(both.control.id).toBe("email");
    expect(both.control.required).toBe(true);
  });
});

describe("FormField", () => {
  it("labels the control it wraps and exposes the wiring to any child control", () => {
    const markup = renderToStaticMarkup(
      createElement(FormField, {
        ...labelledField,
        error: "Enter the email you signed up with.",
        requirement: "required",
        children: (control) => createElement("input", { ...control, type: "email" }),
      }),
    );

    const labelledControlId = attributeValue(markup, "for");
    expect(labelledControlId).toBeDefined();
    expect(markup).toContain(`<input id="${labelledControlId}"`);
    expect(markup).toContain("Work email");
    expect(markup).toContain("Required");
    expect(markup).toContain('aria-invalid="true"');
    expect(markup).toContain('data-field-invalid="true"');
    expect(markup).toContain('data-field-requirement="required"');
    expect(describedIds(markup)).toHaveLength(2);
    for (const id of describedIds(markup)) {
      expect(markup).toContain(`id="${id}"`);
    }
  });

  it("marks an optional field without implying an error", () => {
    const markup = renderToStaticMarkup(
      createElement(FormField, {
        label: "Nickname",
        requirement: "optional",
        children: (control) => createElement("input", control),
      }),
    );

    expect(markup).toContain("Optional");
    expect(markup).not.toContain("aria-invalid");
    expect(markup).not.toContain("required");
  });
});

describe("TextField and TextArea", () => {
  it("renders every governed size and tone", () => {
    for (const size of ["md", "lg"] as const) {
      for (const tone of ["interface", "data"] as const) {
        const markup = renderToStaticMarkup(
          createElement(TextField, { ...labelledField, size, tone }),
        );
        expect(markup).toContain(`data-size="${size}"`);
        expect(markup).toContain(`data-tone="${tone}"`);
      }
    }
  });

  it("connects an inline error and passes autocomplete through untouched", () => {
    const markup = renderToStaticMarkup(
      createElement(TextField, {
        ...labelledField,
        autoComplete: "email",
        error: "That email is not recognised.",
        requirement: "required",
        type: "email",
      }),
    );

    expect(hasAttribute(markup, "autocomplete", "email")).toBe(true);
    expect(markup).toContain('type="email"');
    expect(markup).toContain('aria-invalid="true"');
    expect(markup).toContain("required");
    expect(markup).toContain("That email is not recognised.");
    const errorId = describedIds(markup).at(-1);
    expect(errorId).toBeDefined();
    expect(markup).toContain(`id="${errorId}"`);
  });

  it("renders the disabled, read-only, and placeholder states", () => {
    const disabled = renderToStaticMarkup(
      createElement(TextField, { ...labelledField, disabled: true }),
    );
    const readOnly = renderToStaticMarkup(
      createElement(TextField, { ...labelledField, readOnly: true, value: "held", onChange() {} }),
    );
    const placeholder = renderToStaticMarkup(
      createElement(TextField, { ...labelledField, placeholder: "name@example.com" }),
    );

    expect(hasAttribute(disabled, "disabled")).toBe(true);
    expect(hasAttribute(readOnly, "readonly", "")).toBe(true);
    expect(placeholder).toContain('placeholder="name@example.com"');
  });

  it("renders a multi-line control with its own row count", () => {
    const markup = renderToStaticMarkup(
      createElement(TextArea, {
        label: "Property description",
        description: "Only facts that are public and approved.",
        rows: 6,
      }),
    );

    expect(markup).toContain("<textarea");
    expect(markup).toContain('rows="6"');
    expect(markup).toContain('data-size="md"');
    expect(describedIds(markup)).toHaveLength(1);
  });
});

describe("PasswordField", () => {
  it("hides the value and names its reveal control without relying on a title", () => {
    const markup = renderToStaticMarkup(
      createElement(PasswordField, {
        autoComplete: "current-password",
        label: "Password",
        requirement: "required",
      }),
    );

    expect(markup).toContain('type="password"');
    expect(hasAttribute(markup, "autocomplete", "current-password")).toBe(true);
    expect(markup).toContain('aria-label="Show password"');
    expect(markup).toContain('aria-pressed="false"');
    expect(markup).not.toContain("title=");
    const controlId = attributeValue(markup, "id");
    expect(markup).toContain(`aria-controls="${controlId}"`);
  });

  it("connects its error and disables the reveal control with the field", () => {
    const markup = renderToStaticMarkup(
      createElement(PasswordField, {
        disabled: true,
        error: "Use at least 12 characters.",
        label: "New password",
      }),
    );

    expect(markup).toContain('aria-invalid="true"');
    expect(markup).toContain("Use at least 12 characters.");
    expect(markup.match(/disabled/gu)?.length).toBe(2);
  });
});

describe("Link", () => {
  it("opens an external destination without handing over the opener", () => {
    expect(resolveExternalLinkSafety(false)).toEqual({ rel: undefined, target: undefined });
    expect(resolveExternalLinkSafety(true)).toEqual({
      rel: "noopener noreferrer",
      target: "_blank",
    });

    const external = renderToStaticMarkup(
      createElement(Link, {
        children: "Meta business settings",
        external: true,
        href: "https://business.facebook.com",
      }),
    );

    expect(external).toContain('rel="noopener noreferrer"');
    expect(external).toContain('target="_blank"');
    expect(external).toContain("opens in a new tab");
  });

  it("renders the inline and action variants and keeps an internal link same-tab", () => {
    for (const variant of ["inline", "action"] as const) {
      const markup = renderToStaticMarkup(
        createElement(Link, { children: "Finish setup", href: "/onboarding", variant }),
      );
      expect(markup).toContain(`data-variant="${variant}"`);
      expect(markup).not.toContain("target=");
      expect(markup).not.toContain("rel=");
    }
  });
});
