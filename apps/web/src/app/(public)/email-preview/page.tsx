import { Stack } from "@oalo/ui";
import type { Metadata } from "next";
import { notFound } from "next/navigation.js";

import {
  buildEmailVerificationEmail,
  buildPasswordResetEmail,
} from "../../../server/email/email-templates.js";
import { canRenderSyntheticDemo } from "../../../server/authenticated-workspace-data.js";
import styles from "./email-preview.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Email preview",
  description: "The two account emails, rendered at the width a mail client gives them.",
};

/**
 * PRD-006d 006D-AC-014. The two transactional emails, rendered at 600px, so they can be reviewed
 * and screenshotted on the axes that apply to an email: hierarchy, typography, contrast, and copy.
 *
 * Three decisions worth stating.
 *
 * It renders through `buildPasswordResetEmail` and `buildEmailVerificationEmail`, the same two
 * functions that build the real message, rather than through a copy of the markup. A preview of a
 * second implementation would be a preview of nothing: it would stay pretty while the real email
 * drifted.
 *
 * Each email goes in its own frame with `srcDoc`, because an email is a whole document with its
 * own `lang` and `title`, and pasting its body into this page would let this page's typography and
 * colours decide how the email looks, which is exactly the question a reviewer is asking.
 *
 * It is gated to synthetic mode, which is local and preview deployments and the test runs, and is
 * 404 in review mode and anywhere else. The names and the links are placeholders; no real address,
 * no real person, and no real token ever reaches this page, so a screenshot of it is safe to keep.
 */

const PREVIEW_NAME = "Sample Person";
const PREVIEW_ADDRESS = "sample.person@example.com";
const PREVIEW_RESET_LINK = "https://example.com/reset-password?token=sample-reset-token";
const PREVIEW_VERIFY_LINK = "https://example.com/verify-email?token=sample-verification-token";

export default async function EmailPreviewPage() {
  if (!canRenderSyntheticDemo()) notFound();

  const emails = [
    {
      id: "reset-password",
      caption: "Sent when somebody asks to reset their password.",
      message: buildPasswordResetEmail({
        to: PREVIEW_ADDRESS,
        name: PREVIEW_NAME,
        link: PREVIEW_RESET_LINK,
        idempotencyKey: "preview-reset",
      }),
    },
    {
      id: "verify-email",
      caption: "Sent when somebody creates an account.",
      message: buildEmailVerificationEmail({
        to: PREVIEW_ADDRESS,
        name: PREVIEW_NAME,
        link: PREVIEW_VERIFY_LINK,
        idempotencyKey: "preview-verification",
      }),
    },
  ] as const;

  return (
    <main className={styles.page}>
      <Stack align="stretch" className={styles.header} gap="2">
        <h1 className={styles.title}>The two account emails</h1>
        <p className={styles.lead}>
          Each one is shown at 600 pixels, the width a mail client gives it. The names and the links
          are placeholders.
        </p>
      </Stack>

      {emails.map((email) => (
        <section aria-labelledby={`${email.id}-subject`} className={styles.email} key={email.id}>
          <div className={styles.meta}>
            <h2 id={`${email.id}-subject`}>{email.message.subject}</h2>
            <p>{email.caption}</p>
          </div>
          {/*
            The frame stays in the tab order. It holds a link, and taking a frame with focusable
            content out of the tab order is the trap `frame-focusable-content` exists to catch. The
            focus ring inside it belongs to the framed document, which is the email itself and is
            not this product's to style; the keyboard check in
            `tests/browser/helpers/design-quality.ts` says so and says why.
          */}
          <div className={styles.viewport}>
            <iframe
              className={styles.frame}
              data-email-preview={email.id}
              srcDoc={email.message.html}
              title={`${email.message.subject}, as a mail client renders it`}
            />
          </div>
        </section>
      ))}
    </main>
  );
}
