/**
 * What a person could read inside one element, for the review browser run.
 *
 * This is `reviewSurfaceText` from `apps/web/src/app/(authenticated)/review-surface-sweep.ts`
 * written to run inside a browser page. A Playwright `evaluate` serialises the function it is
 * given, so it cannot import the original, and it must not reach for anything outside its own
 * body: every constant it needs is declared inside it. Because that makes it a copy of an
 * algorithm, `tooling/tests/integration/review-browser/readable-surface.test.ts` runs both against
 * the same document and fails the day they read different things.
 *
 * It drops `<script>`, `<style>`, and `<template>` as well, which the original never meets in a
 * component render and a real document always carries: the framework's own payload is not
 * something anybody reads, and counting it would report words no person ever sees.
 */
export function readableSurfaceOf(root: Element): string {
  const supportRegion = "[data-support-details]";
  const readable = root.cloneNode(true) as HTMLElement;
  for (const hidden of readable.querySelectorAll(`${supportRegion}, script, style, template`)) {
    hidden.remove();
  }
  const fragments = [readable.textContent ?? ""];
  for (const code of readable.querySelectorAll("code")) {
    fragments.push(code.textContent ?? "");
  }
  for (const element of readable.querySelectorAll("*")) {
    for (const attribute of ["alt", "aria-label", "href", "placeholder", "title"]) {
      const value = element.getAttribute(attribute);
      if (value !== null && value.length > 0) fragments.push(value);
    }
    const describedBy = element.getAttribute("aria-describedby");
    if (describedBy === null) continue;
    for (const id of describedBy.split(/\s+/u).filter((token) => token.length > 0)) {
      const target = root.ownerDocument.getElementById(id);
      if (target !== null && target.closest(supportRegion) === null) {
        fragments.push(target.textContent ?? "");
      }
    }
  }
  return fragments.join("\n");
}
