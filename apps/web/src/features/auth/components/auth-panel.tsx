import { Card } from "@oalo/ui";
import type { ReactNode } from "react";

import styles from "./auth-form.module.css";

/**
 * The frame every auth page shares: one centred panel, a title, an optional lead, and the form.
 * PRD-006d reviews this; keeping it in one component means that review changes one file.
 *
 * It is a `<main>`. An account screen has no shell around it, so without this the page has no
 * landmark at all and every one of its contents sits outside one: axe fails `landmark-one-main`
 * and `region` on all seven screens, and a screen-reader user has no way to skip to the form.
 * Measured during the PRD-006d review.
 */
export function AuthPanel({
  title,
  lead,
  children,
}: Readonly<{ title: string; lead?: string; children: ReactNode }>): ReactNode {
  return (
    <main className={styles.page}>
      <Card className={styles.panel}>
        <header className={styles.header}>
          <h1>{title}</h1>
          {lead === undefined ? null : <p>{lead}</p>}
        </header>
        {children}
      </Card>
    </main>
  );
}
