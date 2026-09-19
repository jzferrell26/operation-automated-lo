import type { Metadata } from "next";

import { assertAuthPageIsServed } from "../../../../features/auth/auth-page-gate.js";
import { ChangePasswordForm } from "../../../../features/auth/components/change-password-form.js";
import { CHANGE_PASSWORD_COPY } from "../../../../features/auth/strings.js";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your account",
  description: "Change the password on your Automated LO account.",
};

/**
 * PRD-006a D5 and 006A-AC-023. The change-password page.
 *
 * It sits inside the signed-in shell, so it inherits the layout's session and its rendered
 * cross-site token. A visitor with no session sees the signed-out shell the layout renders.
 */
export default async function AccountSettingsPage() {
  assertAuthPageIsServed();
  return (
    <section>
      <h1>{CHANGE_PASSWORD_COPY.title}</h1>
      <ChangePasswordForm />
    </section>
  );
}
