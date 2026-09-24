"use client";

import { Card, Icon, Link, Select, type IconName } from "@oalo/ui";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation.js";
import { leadStages, sampleLeads, type PreviewCampaign, type PreviewState } from "./model.js";
import styles from "./workspace.module.css";

export const exampleCampaignHref = "/marketing/campaigns/synthetic-open-house-001";
export const examplePageHref = "/public/synthetic-open-house-v3";
export const personName = (name: string) => (name === "Preview owner" ? "Alex Morgan" : name);
export const monogram = (name: string) =>
  name
    .split(/\s+/u)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "info" | "success" | "warning" | "critical";
}) {
  return (
    <span className={styles.tag} data-tone={tone}>
      <span aria-hidden="true" />
      {children}
    </span>
  );
}
export function PageHeader({
  title,
  description,
  eyebrow,
  children,
}: {
  title: string;
  description?: string | undefined;
  eyebrow?: string | undefined;
  children?: ReactNode;
}) {
  return (
    <header className={styles.header}>
      <div>
        {eyebrow ? <span className={styles.eyebrow}>{eyebrow}</span> : null}
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      <div className={styles.actions}>{children}</div>
    </header>
  );
}
export function ActionLink({
  href,
  children,
  secondary = false,
}: {
  href: string;
  children: ReactNode;
  secondary?: boolean;
}) {
  return (
    <Link
      href={href}
      variant="action"
      className={secondary ? styles.secondaryAction : styles.primaryAction}
    >
      {children}
    </Link>
  );
}
export function SectionTitle({
  title,
  detail,
  href,
  link = "View all",
}: {
  title: string;
  detail?: string;
  href?: string;
  link?: string;
}) {
  return (
    <div className={styles.sectionHead}>
      <div>
        <h2>{title}</h2>
        {detail ? <p>{detail}</p> : null}
      </div>
      {href ? (
        <Link href={href} className={styles.textLink}>
          {link}
          <Icon name="arrow-right" decorative size="sm" />
        </Link>
      ) : null}
    </div>
  );
}
export function StatCards({
  items,
}: {
  items: readonly {
    label: string;
    value: string | number;
    detail: string;
    icon: IconName;
    href?: string;
  }[];
}) {
  return (
    <div className={styles.stats} data-product-guide="metrics">
      {items.map((item, index) => (
        <Card className={styles.stat} padding="none" key={item.label}>
          <div className={styles.statTop}>
            <span>{item.label}</span>
            <span className={styles.iconTile} data-accent={index % 4}>
              <Icon name={item.icon} decorative size="sm" />
            </span>
          </div>
          <strong>{item.value}</strong>
          <div className={styles.statBottom}>
            <small>{item.detail}</small>
            {item.href ? (
              <Link href={item.href} aria-label={`View ${item.label.toLowerCase()}`}>
                <Icon name="arrow-up-right" decorative size="sm" />
              </Link>
            ) : null}
          </div>
        </Card>
      ))}
    </div>
  );
}
export function SelectField({
  label,
  value,
  onChange,
  options,
  compact = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  compact?: boolean;
}) {
  return (
    <Select
      label={label}
      value={value}
      onValueChange={onChange}
      options={options}
      compact={compact}
    />
  );
}
export function CampaignBadge({ campaign }: { campaign: PreviewCampaign }) {
  return (
    <Badge
      tone={campaign.blocking ? "critical" : campaign.state === "approved" ? "success" : "warning"}
    >
      {campaign.blocking
        ? "Needs changes"
        : campaign.state === "approved"
          ? "Approved"
          : "Awaiting approval"}
    </Badge>
  );
}
export function PipelineVisual({ state }: { state: PreviewState }) {
  const counts = leadStages.map(
    (stage) =>
      sampleLeads.filter((lead) => (state.leadStages[lead.id] ?? lead.stage) === stage).length,
  );
  const total = sampleLeads.length;
  const circumference = 2 * Math.PI * 62;
  let offset = 0;
  return (
    <div className={styles.pipelineVisual} data-product-guide="pipeline">
      <figure className={styles.donut}>
        <svg
          viewBox="0 0 160 160"
          role="img"
          aria-label={`Pipeline: ${leadStages.map((stage, index) => `${counts[index]} ${stage.toLowerCase()}`).join(", ")}`}
        >
          <circle cx="80" cy="80" r="62" className={styles.donutTrack} />
          {counts.map((count, index) => {
            const length = (count / total) * circumference;
            const segmentOffset = offset;
            offset += length;
            return count > 0 ? (
              <circle
                key={leadStages[index]}
                cx="80"
                cy="80"
                r="62"
                className={styles.donutSegment}
                data-stage={index}
                strokeDasharray={`${Math.max(length - 5, 0)} ${circumference}`}
                strokeDashoffset={-segmentOffset}
                transform="rotate(-90 80 80)"
              />
            ) : null;
          })}
        </svg>
        <figcaption>
          <strong>{total}</strong>
          <span>Total leads</span>
        </figcaption>
      </figure>
      <div className={styles.pipelineLegend}>
        {leadStages.map((stage, index) => (
          <div key={stage}>
            <span className={styles.legendDot} data-stage={index} />
            <span>{stage}</span>
            <strong>{counts[index]}</strong>
            <small>{Math.round(((counts[index] ?? 0) / total) * 100)}%</small>
          </div>
        ))}
      </div>
    </div>
  );
}
export function QuietNote({ children }: { children: ReactNode }) {
  return (
    <p className={styles.quietNote}>
      <Icon name="info" decorative size="sm" />
      {children}
    </p>
  );
}
export function ProfileAvatar({ name, index = 0 }: { name: string; index?: number }) {
  return (
    <span className={styles.profileAvatar} data-accent={index % 4}>
      {monogram(name)}
    </span>
  );
}
export function MarketingTabs() {
  const pathname = usePathname();
  return (
    <nav className={styles.tabs} aria-label="Marketing sections">
      {[
        ["Campaigns", "/marketing/campaigns"],
        ["Property sites", "/marketing/property-sites"],
        ["Creative library", "/marketing/creative"],
        ["Ads", "/marketing/ads"],
        ["Email & SMS", "/marketing/messaging"],
        ["Templates", "/marketing/blueprints"],
      ].map(([label, href]) => (
        <Link
          key={href}
          href={href ?? "/marketing"}
          aria-current={
            href && (pathname === href || pathname.startsWith(`${href}/`)) ? "page" : undefined
          }
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
