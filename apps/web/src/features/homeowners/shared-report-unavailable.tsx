import { Card, Icon } from "@oalo/ui";
import {
  SHARED_REPORT_UNAVAILABLE_BODY,
  SHARED_REPORT_UNAVAILABLE_TITLE,
} from "../../copy/shared-report-messages.js";
import "@oalo/ui/product-tokens.css";
import styles from "./homeowners.module.css";

/**
 * The page a homeowner lands on when a report link cannot be shown.
 *
 * It takes no props on purpose. A component that could be told why the link failed could show it,
 * and the route sends an unknown, an expired, and a turned-off link here alike so that the page
 * never says which links exist (PRD-008c). It sits in the same frame as the report it stands in
 * for, so a homeowner who followed a link from a message sees the same product, not a framework
 * error. Nothing on it links back into the product: this reader has no account to sign in to.
 */
export function SharedReportUnavailable() {
  return (
    <main className={`${styles.workspace} ${styles.sharedPage}`} data-product-shell="true">
      <Card className={styles.empty} padding="md">
        <Icon name="file-text" decorative size="lg" />
        <h1>{SHARED_REPORT_UNAVAILABLE_TITLE}</h1>
        <p>{SHARED_REPORT_UNAVAILABLE_BODY}</p>
      </Card>
    </main>
  );
}
