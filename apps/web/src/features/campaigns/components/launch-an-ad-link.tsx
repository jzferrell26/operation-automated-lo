import { Icon, Link } from "@oalo/ui";

import styles from "./campaign-page.module.css";

/**
 * "Launch an ad", the one primary action of the Campaigns list and of a campaign saved before PRD-009:
 * a link that leads to step 1, drawn as the primary button, with the plus the mockups put before its
 * words (`campaigns-list.html`, `campaign-detail.html`; scored review pass 2, R2 N-2). The glyph is
 * decorative, so the link's name is its words alone.
 */
export function LaunchAnAdLink({ children, href }: Readonly<{ children: string; href: string }>) {
  return (
    <Link className={styles.primaryLink} href={href}>
      <Icon decorative name="plus" size="sm" />
      {children}
    </Link>
  );
}

/**
 * The link in a page header's action slot: the same wrappers on every page that has one, so the
 * actions share the column's end edge at 1440 and 1180, start where the words start at 768, and span
 * the column on a phone, as the mockups' `.page-head .actions` does (scored review pass 2, R2 N-3).
 */
export function LaunchAnAdHeaderAction({
  children,
  href,
}: Readonly<{ children: string; href: string }>) {
  return (
    <div className={styles.headActions} data-launch-an-ad-actions="">
      <div className={styles.actions}>
        <LaunchAnAdLink href={href}>{children}</LaunchAnAdLink>
      </div>
    </div>
  );
}
