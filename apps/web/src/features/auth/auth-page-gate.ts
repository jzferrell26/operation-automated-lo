import { notFound } from "next/navigation.js";

import {
  assertAuthSurface,
  selfServeSignUpEnabled,
} from "../../server/password-authentication-handler.js";

/**
 * PRD-006a D5 and 006A-AC-026. Every auth page reads the workspace mode first and answers 404
 * unless the deployment is serving the signed-in product.
 *
 * That is the same gate the routes apply, through the same function, so a page and its route can
 * never disagree about whether this deployment has a sign-in. It touches no database and makes no
 * network request: `authenticatedWorkspaceMode` reads environment variables and nothing else.
 */
export function assertAuthPageIsServed(environment: unknown = process.env): void {
  try {
    assertAuthSurface(environment);
  } catch {
    notFound();
  }
}

/** The sign-up page is 404 unless the operator turned sign-up on, by name, on this deployment. */
export function assertSignUpPageIsServed(environment: unknown = process.env): void {
  let parsed;
  try {
    parsed = assertAuthSurface(environment);
  } catch {
    return notFound();
  }
  if (!selfServeSignUpEnabled(parsed)) notFound();
}

export function signUpIsOffered(environment: unknown = process.env): boolean {
  try {
    return selfServeSignUpEnabled(assertAuthSurface(environment));
  } catch {
    return false;
  }
}
