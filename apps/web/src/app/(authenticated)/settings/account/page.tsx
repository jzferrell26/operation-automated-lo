import type { Metadata } from "next";

import { assertAuthPageIsServed } from "../../../../features/auth/auth-page-gate.js";
import { ChangePasswordForm } from "../../../../features/auth/components/change-password-form.js";
import styles from "../../../../features/auth/components/auth-form.module.css";
import { CHANGE_PASSWORD } from "../../../../features/auth/strings.js";
import { canRenderDashboardPreview } from "../../../../server/dashboard-preview.js";
import { DashboardPreviewScreen } from "../../../../features/dashboard-preview/dashboard-screen.js";

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
  if (canRenderDashboardPreview()) return <DashboardPreviewScreen view="account" />;
  assertAuthPageIsServed();
  /**
   * PRD-008d, the second redraw of 2026-10-01, finding R-20. The page takes the whole content
   * column, so its title starts where every sibling page's title starts, and the form takes the
   * account form's own measure. Before, the section had no width of its own, so the shell centred
   * it at the width of its title: once D-009 put the title at the page step, the form shrank with
   * it to some 296px.
   */
  return (
    <section className={styles.accountPage}>
      <div className={styles.panel}>
        <div className={styles.header}>
          <h1>{CHANGE_PASSWORD.title}</h1>
        </div>
        <ChangePasswordForm />
      </div>
    </section>
  );
}
