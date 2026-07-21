"use client";

import { Button, Card } from "@oalo/ui";
import { useState } from "react";

import type { DeepReadonly, Overview } from "../../ui-foundation/model/synthetic-ui.js";
import styles from "./overview.module.css";

type Activity = DeepReadonly<Overview["recentActivity"][number]>;
type ActivityFilter = "All" | Activity["module"];

const filters = ["All", "Marketing", "Partners", "Leads", "Brand", "System"] as const;

export function ActivityFeed({ activity }: Readonly<{ activity: readonly Activity[] }>) {
  const [filter, setFilter] = useState<ActivityFilter>("All");
  const visibleActivity =
    filter === "All" ? activity : activity.filter((item) => item.module === filter);

  return (
    <section aria-labelledby="recent-activity-title" className={styles.section}>
      <div className={styles.sectionHeading}>
        <div>
          <p className={styles.eyebrow}>Audit-friendly timeline</p>
          <h2 id="recent-activity-title">Recent Activity</h2>
        </div>
        <div aria-label="Filter recent activity" className={styles.filters} role="group">
          {filters.map((option) => (
            <Button
              aria-pressed={filter === option}
              key={option}
              onClick={() => setFilter(option)}
              size="sm"
              variant={filter === option ? "secondary" : "ghost"}
            >
              {option}
            </Button>
          ))}
        </div>
      </div>
      <div className={styles.listGrid}>
        {visibleActivity.map((item) => (
          <Card key={item.id} padding="sm">
            <p className={styles.itemMeta}>{item.module} · Synthetic</p>
            <strong>{item.summary}</strong>
            <time dateTime={item.occurredAt}>{formatTimestamp(item.occurredAt)}</time>
          </Card>
        ))}
      </div>
    </section>
  );
}

function formatTimestamp(timestamp: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(timestamp));
}
