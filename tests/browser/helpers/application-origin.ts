import { test } from "@playwright/test";

/** Derive the sole allowed app origin from the running project, never a guessed shared port. */
export function configuredApplicationOrigin(): string {
  const configured = test.info().project.use.baseURL;
  if (typeof configured !== "string")
    throw new Error("The browser project's application origin must be configured.");
  return new URL(configured).origin;
}
