import { Card, Icon } from "@oalo/ui";

import styles from "./reporting.module.css";

/**
 * The one line every reporting screen opens with on a developer's own machine: what you are looking
 * at is sample data, and nothing here reaches anyone.
 *
 * It is one component rather than a block copied onto each screen, so the claim cannot drift
 * between the reports page and the campaign page and end up saying two different things.
 */
export function SampleDataNotice({ disclosure }: Readonly<{ disclosure: string }>) {
  return (
    <Card className={styles.safetyNotice} padding="md">
      <Icon decorative name="lock" size="sm" tone="info" />
      <div>
        <strong>Sample data, nothing live</strong>
        <p>{disclosure}</p>
      </div>
    </Card>
  );
}
