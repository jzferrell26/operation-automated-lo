import { Link } from "@oalo/ui";

import { GONE_PAGE } from "../../copy/user-language.js";
import "@oalo/ui/product-tokens.css";
import styles from "./workspace.module.css";

/**
 * PRD-009f D1. The page for an address whose job now lives in HighLevel.
 *
 * It reads nothing and carries no data, so it needs no session beyond the layout's. It is shown
 * only for the three CRM addresses: the words would be false anywhere else.
 */
export function GoneScreen() {
  return (
    <div className={styles.workspace} data-gone-page="true">
      <header className={styles.header}>
        <div>
          <h1>{GONE_PAGE.title}</h1>
          <p>{GONE_PAGE.lead}</p>
        </div>
      </header>
      <div className={styles.actions}>
        <Link href="/overview" variant="action">
          {GONE_PAGE.homeLabel}
        </Link>
      </div>
    </div>
  );
}
