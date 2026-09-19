import type { Metadata } from "next";

import { assertAuthPageIsServed, signUpIsOffered } from "../../../features/auth/auth-page-gate.js";
import { AuthPanel } from "../../../features/auth/components/auth-panel.js";
import { SignInForm } from "../../../features/auth/components/sign-in-form.js";
import { SIGN_IN_COPY } from "../../../features/auth/strings.js";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sign in to Automated LO",
  description: "Sign in to your Automated LO workspace with your email and password.",
};

/**
 * PRD-006a D5 and 006A-AC-032. The sign-in page.
 *
 * The visible "Forgot your password?" link is the owner's second requirement and sits in the form
 * itself, not behind a menu.
 */
export default async function SignInPage({
  searchParams,
}: Readonly<{ searchParams: Promise<Readonly<Record<string, string | string[] | undefined>>> }>) {
  assertAuthPageIsServed();
  const parameters = await searchParams;
  return (
    <AuthPanel lead={SIGN_IN_COPY.lead} title={SIGN_IN_COPY.title}>
      <SignInForm signUpEnabled={signUpIsOffered()} signedOut={parameters["signedOut"] === "1"} />
    </AuthPanel>
  );
}
