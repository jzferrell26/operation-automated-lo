import type { Metadata } from "next";

import { assertAuthPageIsServed } from "../../../features/auth/auth-page-gate.js";
import { AuthPanel } from "../../../features/auth/components/auth-panel.js";
import { ForgotPasswordForm } from "../../../features/auth/components/forgot-password-form.js";
import { FORGOT_PASSWORD_COPY } from "../../../features/auth/strings.js";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Reset your Automated LO password",
  description: "Ask for a link to choose a new Automated LO password.",
};

/** PRD-006a D5 and 006A-AC-017. */
export default async function ForgotPasswordPage() {
  assertAuthPageIsServed();
  return (
    <AuthPanel lead={FORGOT_PASSWORD_COPY.lead} title={FORGOT_PASSWORD_COPY.title}>
      <ForgotPasswordForm />
    </AuthPanel>
  );
}
