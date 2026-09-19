import type { Metadata } from "next";

import { assertAuthPageIsServed } from "../../../features/auth/auth-page-gate.js";
import { AuthPanel } from "../../../features/auth/components/auth-panel.js";
import { ResetPasswordForm } from "../../../features/auth/components/reset-password-form.js";
import { RESET_PASSWORD_COPY } from "../../../features/auth/strings.js";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Choose a new password",
  description: "Choose a new password for your Automated LO account.",
};

function tokenFrom(value: string | string[] | undefined): string {
  if (typeof value === "string") return value;
  return value?.[0] ?? "";
}

/**
 * PRD-006a D5 and 006A-AC-018. Rendering this page consumes nothing: the token is spent only when
 * the person submits a new password, so opening the link twice still works.
 *
 * `apps/web/src/proxy.ts` puts `Referrer-Policy: no-referrer` and `Cache-Control: no-store` on
 * this path, so the token in the query string does not travel in a `Referer` and the rendered
 * page is not cached.
 */
export default async function ResetPasswordPage({
  searchParams,
}: Readonly<{ searchParams: Promise<Readonly<Record<string, string | string[] | undefined>>> }>) {
  assertAuthPageIsServed();
  const parameters = await searchParams;
  const token = tokenFrom(parameters["token"]);
  return (
    <AuthPanel title={RESET_PASSWORD_COPY.title}>
      {token.length === 0 ? (
        <p>{RESET_PASSWORD_COPY.linkExpired}</p>
      ) : (
        <ResetPasswordForm token={token} />
      )}
    </AuthPanel>
  );
}
