import type { Page } from "@playwright/test";

/**
 * PRD-009d D9 and 009D-AC-022. Counts what a person does on the way to an approved campaign: every
 * button and link they activate, every field they type into, and any checkbox or file input they
 * touch, which the criterion says must be none.
 *
 * The count lives in the page, not in the spec, so it counts what reached the document rather than
 * what the spec meant to do: a click the spec makes on something that is not a control is not an
 * activation, and a field the spec fills is a typed field however it was filled. It is kept in
 * session storage under one key, so a full navigation part way through (a link, a refresh after an
 * approval) does not lose it. Only trusted events count, so nothing the page does to itself is
 * mistaken for the person.
 */

const STORAGE_KEY = "oalo-activation-count";

export type ActivationCount = Readonly<{
  /** The accessible text of each activated button or link, in order. */
  activations: readonly string[];
  /** The label of each distinct field typed into. */
  typedFields: readonly string[];
  /** Any checkbox or file input touched. */
  forbidden: readonly string[];
}>;

/** Installs the counter on every document the page loads from now on. Call once per page. */
export async function countActivations(page: Page): Promise<void> {
  await page.addInitScript((key: string) => {
    type Count = { activations: string[]; typedFields: string[]; forbidden: string[] };
    const read = (): Count => {
      try {
        const stored = window.sessionStorage.getItem(key);
        if (stored !== null) return JSON.parse(stored) as Count;
      } catch {
        // A counter that cannot read starts again; the spec's own total then fails loudly.
      }
      return { activations: [], typedFields: [], forbidden: [] };
    };
    const write = (count: Count) => window.sessionStorage.setItem(key, JSON.stringify(count));
    const nameOf = (element: Element): string => {
      const labelled = element.getAttribute("aria-label");
      if (labelled !== null && labelled.trim() !== "") return labelled.trim();
      const id = element.id;
      if (id !== "") {
        const label = document.querySelector(`label[for="${CSS.escape(id)}"]`);
        if (label !== null) return (label.textContent ?? "").trim();
      }
      const wrapping = element.closest("label");
      if (wrapping !== null) return (wrapping.textContent ?? "").trim();
      return (element.textContent ?? "").replace(/\s+/gu, " ").trim();
    };
    const FORBIDDEN = "input[type='checkbox' i], input[type='file' i]";
    document.addEventListener(
      "click",
      (event) => {
        if (!event.isTrusted || !(event.target instanceof Element)) return;
        const count = read();
        const forbidden = event.target.closest(FORBIDDEN);
        if (forbidden !== null) {
          count.forbidden.push(nameOf(forbidden));
          write(count);
          return;
        }
        const control = event.target.closest(
          "a[href], button, [role='button'], [role='link'], [role='menuitem'], summary",
        );
        if (control === null || control.matches(":disabled, [aria-disabled='true']")) return;
        count.activations.push(nameOf(control));
        write(count);
      },
      true,
    );
    document.addEventListener(
      "input",
      (event) => {
        if (!event.isTrusted || !(event.target instanceof Element)) return;
        const count = read();
        if (event.target.matches(FORBIDDEN)) {
          count.forbidden.push(nameOf(event.target));
        } else if (event.target.matches("input, textarea, [contenteditable='true']")) {
          const name = nameOf(event.target);
          if (!count.typedFields.includes(name)) count.typedFields.push(name);
        }
        write(count);
      },
      true,
    );
  }, STORAGE_KEY);
}

/** Starts a fresh count on the page's current document. */
export async function resetActivations(page: Page): Promise<void> {
  await page.evaluate((key) => window.sessionStorage.removeItem(key), STORAGE_KEY);
}

export async function readActivations(page: Page): Promise<ActivationCount> {
  return page.evaluate((key) => {
    const stored = window.sessionStorage.getItem(key);
    return stored === null
      ? { activations: [], typedFields: [], forbidden: [] }
      : (JSON.parse(stored) as ActivationCount);
  }, STORAGE_KEY);
}
