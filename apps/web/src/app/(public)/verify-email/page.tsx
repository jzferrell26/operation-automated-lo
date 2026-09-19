import type { Metadata } from "next";

import { assertAuthPageIsServed } from "../../../features/auth/auth-page-gate.js";
import { AuthPanel } from "../../../features/auth/components/auth-panel.js";
import { VerifyEmailForm } from "../../../features/auth/components/verify-email-form.js";
import { VERIFY_EMAIL_COPY } from "../../../features/auth/strings.js";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Confirm your email",
  description: "Confirm the email address on your Automated LO account.",
};

function tokenFrom(value: string | string[] | undefined): string {
  if (typeof value === "string") return value;
  return value?.[0] ?? "";
}

/** PRD-006a D5 and 006A-AC-021. Same header treatment as the reset page. */
export default async function VerifyEmailPage({
  searchParams,
}: Readonly<{ searchParams: Promise<Readonly<Record<string, string | string[] | undefined>>> }>) {
  assertAuthPageIsServed();
  const parameters = await searchParams;
  const token = tokenFrom(parameters["token"]);
  return (
    <AuthPanel title={VERIFY_EMAIL_COPY.title}>
      {token.length === 0 ? <p>{VERIFY_EMAIL_COPY.expired}</p> : <VerifyEmailForm token={token} />}
    </AuthPanel>
  );
}
