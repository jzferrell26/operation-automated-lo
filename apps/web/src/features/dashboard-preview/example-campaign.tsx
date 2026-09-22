"use client";

import { useState } from "react";
import { Button, Card, Icon, Link } from "@oalo/ui";
import {
  ActionLink,
  Badge,
  examplePageHref,
  PageHeader,
  ProfileAvatar,
  QuietNote,
  SectionTitle,
  StatCards,
} from "./product-components.js";
import { sampleLeads } from "./model.js";
import styles from "./workspace.module.css";

export function ExampleCampaign() {
  const [tab, setTab] = useState("Campaign overview");
  return (
    <div className={styles.page}>
      <PageHeader
        title="Cedar Street Open House Boost"
        eyebrow="Example campaign"
        description="214 Cedar Street · An open house with a clear next step."
      >
        <ActionLink href="/marketing/campaigns/new">
          Create your own campaign <Icon name="plus" decorative size="sm" />
        </ActionLink>
      </PageHeader>
      <div className={styles.reportHeading}>
        <div className={styles.viewToggle} role="group" aria-label="Campaign details">
          {["Campaign overview", "Creative & assets", "Leads"].map((label) => (
            <Button
              variant="ghost"
              key={label}
              aria-pressed={tab === label}
              onClick={() => setTab(label)}
            >
              {label}
            </Button>
          ))}
        </div>
        <Badge tone="info">Example · Not running</Badge>
      </div>
      <StatCards
        items={[
          {
            label: "Daily budget",
            value: "$25",
            detail: "Example budget · no spend",
            icon: "calendar",
          },
          {
            label: "Total budget",
            value: "$75",
            detail: "Example budget · no spend",
            icon: "credit-card",
          },
          {
            label: "Realtor partner",
            value: "Jordan Avery",
            detail: "Northside Realty",
            icon: "users",
          },
          { label: "Campaign type", value: "Open house", detail: "Open House Boost", icon: "home" },
        ]}
      />
      {tab === "Campaign overview" ? (
        <div className={styles.columns}>
          <Card className={styles.panel} padding="none">
            <SectionTitle
              title="A place for your next chapter."
              detail="The property story at the center of your campaign."
            />
            <div className={styles.panelInset}>
              <div className={styles.coverArt}>
                <Icon name="home" decorative size="lg" />
              </div>
              <div className={styles.detailRows}>
                <div>
                  <span>Property</span>
                  <strong>214 Cedar Street</strong>
                </div>
                <div>
                  <span>Message</span>
                  <strong>Tour a place to call home</strong>
                </div>
                <div>
                  <span>Call to action</span>
                  <strong>Plan your visit</strong>
                </div>
                <div>
                  <span>Ad category</span>
                  <strong>Housing</strong>
                </div>
              </div>
            </div>
            <div className={styles.panelFoot}>
              <Link href={examplePageHref} external>
                Open example property page
              </Link>
              <Badge tone="info">Demo property</Badge>
            </div>
          </Card>
          <Card className={styles.approvalPanel} padding="md">
            <ProfileAvatar name="Jordan Avery" />
            <h2>Better, together.</h2>
            <p>
              Jordan Avery
              <br />
              Northside Realty
            </p>
            <p>A complete campaign keeps the property and the Realtor relationship connected.</p>
            <ActionLink href="/partners" secondary>
              View your partners
            </ActionLink>
            <div className={styles.divider} />
            <h3>Ready to make one yours?</h3>
            <p>Create a campaign to try content review and demo approval.</p>
            <ActionLink href="/marketing/campaigns/new">Create campaign</ActionLink>
          </Card>
        </div>
      ) : tab === "Creative & assets" ? (
        <div className={styles.assetGrid}>
          {[
            ["Feed creative", "/synthetic-assets/open-house-feed-v3.svg"],
            ["Story creative", "/synthetic-assets/open-house-story-v3.svg"],
          ].map(([title, href]) => (
            <Card className={styles.assetCard} padding="none" key={title}>
              <div className={styles.assetFrame}>
                <img src={href} alt={`${title} for Cedar Street`} />
              </div>
              <div className={styles.assetDetails}>
                <h2>{title}</h2>
                <Badge tone="info">Example asset</Badge>
                <Link href={href ?? "/marketing/creative"} download variant="action">
                  <Icon name="download" decorative size="sm" /> Download creative
                </Link>
              </div>
            </Card>
          ))}
          <Card className={styles.card} padding="md">
            <span className={styles.iconTile}>
              <Icon name="globe" decorative />
            </span>
            <h2>Property website</h2>
            <p>A dedicated place for the listing and its next conversation.</p>
            <Link href={examplePageHref} external variant="action">
              Open property page
            </Link>
            <QuietNote>
              New websites and print assets will be generated with connected services.
            </QuietNote>
          </Card>
        </div>
      ) : (
        <Card className={styles.panel} padding="none">
          <SectionTitle
            title="Meet the next conversations."
            detail="Example leads from the open house."
            href="/leads/pipeline"
            link="Open pipeline"
          />
          <div className={styles.sourceRows}>
            {sampleLeads
              .filter((lead) => lead.source === "Cedar Street open house")
              .map((lead, index) => (
                <div key={lead.id}>
                  <ProfileAvatar name={lead.name} index={index} />
                  <span>
                    <strong>{lead.name}</strong>
                    <small>{lead.email}</small>
                  </span>
                  <Link href="/leads">View leads</Link>
                </div>
              ))}
          </div>
        </Card>
      )}
    </div>
  );
}
