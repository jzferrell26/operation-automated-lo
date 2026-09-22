import type { Metadata } from "next";

import { assertSignUpPageIsServed } from "../../../features/auth/auth-page-gate.js";
import { AuthPanel } from "../../../features/auth/components/auth-panel.js";
import { SignUpForm } from "../../../features/auth/components/sign-up-form.js";
import { SIGN_UP } from "../../../features/auth/strings.js";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Create your Automated LO account",
  description: "Create an Automated LO account with your name, email, and a password.",
};

/** PRD-006a D5 and 006A-AC-020. 404 unless the operator turned sign-up on for this deployment. */
export default async function SignUpPage() {
  assertSignUpPageIsServed();
  return (
    <AuthPanel lead={SIGN_UP.lead} title={SIGN_UP.title}>
      <SignUpForm />
    </AuthPanel>
  );
}
