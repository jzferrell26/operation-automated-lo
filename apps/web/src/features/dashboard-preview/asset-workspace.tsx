"use client";

import { useState } from "react";
import { Button, Card, Dialog, EmptyState, Icon, Link, TextField } from "@oalo/ui";
import {
  ActionLink,
  Badge,
  CampaignBadge,
  exampleCampaignHref,
  examplePageHref,
  MarketingTabs,
  PageHeader,
  QuietNote,
  SectionTitle,
  SelectField,
} from "./product-components.js";
import { useRequiredDashboardPreview } from "./preview-provider.js";
import styles from "./workspace.module.css";
import pageStyles from "./module-pages.module.css";

const exampleAssets = [
  {
    title: "Feed creative",
    format: "Feed",
    size: "1080 × 1080",
    href: "/synthetic-assets/open-house-feed-v3.svg",
  },
  {
    title: "Story creative",
    format: "Story",
    size: "1080 × 1920",
    href: "/synthetic-assets/open-house-story-v3.svg",
  },
] as const;

export function AssetWorkspace({ creative = false }: { creative?: boolean }) {
  const { state } = useRequiredDashboardPreview();
  const [query, setQuery] = useState("");
  const [format, setFormat] = useState("All formats");
  const [preview, setPreview] = useState<(typeof exampleAssets)[number] | null>(null);
  const normalized = query.trim().toLowerCase();
  const assets = exampleAssets.filter(
    (asset) =>
      (format === "All formats" || format === asset.format) &&
      `${asset.title} Cedar Street example`.toLowerCase().includes(normalized),
  );
  const showSite = "Cedar Street 214 example property site".toLowerCase().includes(normalized);
  const drafts = state.campaigns.filter((campaign) =>
    `${campaign.headline} ${campaign.propertyAddress}`.toLowerCase().includes(normalized),
  );
  return (
    <>
      <PageHeader
        title={creative ? "Creative library" : "Property sites"}
        description={
          creative
            ? "Find the right format for your property story."
            : "Your listing experiences, organized by property."
        }
      >
        <ActionLink href="/marketing/campaigns/new">
          <Icon name="plus" decorative size="sm" /> Create campaign
        </ActionLink>
      </PageHeader>
      <MarketingTabs />
      <Card className={styles.panel} padding="none">
        <div className={pageStyles.toolbar}>
          <TextField
            label={creative ? "Search creative" : "Search property sites"}
            placeholder="Property, campaign, or format"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {creative ? (
            <SelectField
              label="Creative format"
              value={format}
              onChange={setFormat}
              options={["All formats", "Feed", "Story"]}
            />
          ) : (
            <div className={styles.actions}>
              <Badge tone="info">Example site + saved drafts</Badge>
            </div>
          )}
        </div>
      </Card>
      {creative ? (
        <>
          <div className={styles.assetGrid}>
            {assets.map((asset) => (
              <Card key={asset.title} className={styles.assetCard} padding="none">
                <Button
                  variant="ghost"
                  className={pageStyles.assetPreviewButton}
                  type="button"
                  onClick={() => setPreview(asset)}
                  aria-label={`Preview ${asset.title.toLowerCase()}`}
                >
                  <span className={pageStyles.assetPreviewContent}>
                    <span className={styles.assetFrame}>
                      <img
                        src={asset.href}
                        alt={`${asset.title} for the Cedar Street example campaign`}
                      />
                    </span>
                    <span className={pageStyles.assetPreviewLabel}>
                      <Icon name="eye" decorative size="sm" /> Preview asset
                    </span>
                  </span>
                </Button>
                <div className={styles.assetDetails}>
                  <div className={styles.row}>
                    <h2>{asset.title}</h2>
                    <Badge tone="info">Example</Badge>
                  </div>
                  <p>214 Cedar Street · {asset.size}</p>
                  <Link
                    href={asset.href}
                    download
                    variant="action"
                    className={styles.secondaryAction}
                  >
                    <Icon name="download" decorative size="sm" /> Download creative
                  </Link>
                </div>
              </Card>
            ))}
          </div>
          {!assets.length ? (
            <div className={pageStyles.empty}>
              <EmptyState
                title="No creative matches your filters"
                description="Try another property name or choose All formats."
              />
              <Button
                variant="outline"
                onClick={() => {
                  setQuery("");
                  setFormat("All formats");
                }}
              >
                Clear filters
              </Button>
            </div>
          ) : null}
        </>
      ) : showSite ? (
        <div className={pageStyles.mainAside}>
          <Card className={styles.siteCard} padding="none">
            <div className={styles.browserChrome}>
              <i />
              <i />
              <i />
              <span>214 Cedar Street</span>
              <Icon name="globe" decorative size="sm" />
            </div>
            <div className={styles.sitePreview}>
              <span>OPEN HOUSE</span>
              <Icon name="home" decorative size="lg" />
              <h2>
                A place for
                <br />
                your next chapter.
              </h2>
              <p>214 Cedar Street</p>
              <span className={styles.siteCta}>
                Explore the property <Icon name="arrow-right" decorative size="sm" />
              </span>
            </div>
            <div className={styles.assetDetails}>
              <div className={styles.row}>
                <h2>Cedar Street</h2>
                <Badge tone="info">Example site</Badge>
              </div>
              <p>A complete example of the buyer experience.</p>
              <div className={styles.actions}>
                <Link
                  href={examplePageHref}
                  external
                  variant="action"
                  className={styles.primaryAction}
                >
                  Open property page
                </Link>
                <ActionLink href={exampleCampaignHref} secondary>
                  View campaign
                </ActionLink>
              </div>
            </div>
          </Card>
          <Card className={pageStyles.asideCard} padding="md">
            <span className={styles.eyebrow}>Your next property</span>
            <h2>A focused experience for every listing.</h2>
            <p>
              Start with the property, your partner and the details buyers need. Review the campaign
              before preparing the assets.
            </p>
            <ActionLink href="/marketing/campaigns/new">Create a campaign</ActionLink>
            <QuietNote>
              The example site is available now. New site generation is not enabled in this demo.
            </QuietNote>
          </Card>
        </div>
      ) : null}
      {drafts.length ? (
        <Card className={styles.panel} padding="none">
          <SectionTitle
            title="Your saved campaigns"
            detail={
              creative
                ? "Review these campaigns before generating their creative."
                : "These drafts do not have generated property sites yet."
            }
          />
          <div className={pageStyles.queue}>
            {drafts.map((campaign) => (
              <Link
                key={campaign.campaignRef}
                href={campaign.detailHref}
                className={pageStyles.queueRow}
              >
                <span className={styles.iconTile}>
                  <Icon name="home" decorative />
                </span>
                <span>
                  <strong>{campaign.headline}</strong>
                  <small>{campaign.propertyAddress}</small>
                  <small>{creative ? "Creative not generated" : "Site not generated"}</small>
                </span>
                <CampaignBadge campaign={campaign} />
                <Icon name="arrow-up-right" decorative size="sm" />
              </Link>
            ))}
          </div>
        </Card>
      ) : null}
      {!creative && !showSite && !drafts.length ? (
        <div className={pageStyles.empty}>
          <EmptyState
            title="No properties found"
            description="Try another address or create a new campaign."
          />
          <Button variant="outline" onClick={() => setQuery("")}>
            Clear search
          </Button>
        </div>
      ) : null}
      {creative ? (
        <QuietNote>
          Downloads above are example SVG assets. New creative and PDF generation is not enabled in
          this demo.
        </QuietNote>
      ) : null}
      <Dialog
        title={preview?.title ?? "Creative preview"}
        description={preview ? `${preview.size} · Cedar Street example` : ""}
        open={preview !== null}
        onClose={() => setPreview(null)}
      >
        {preview ? (
          <div className={pageStyles.assetDialog}>
            <img src={preview.href} alt={`${preview.title} full preview`} />
            <Link href={preview.href} download variant="action">
              Download example SVG
            </Link>
          </div>
        ) : null}
      </Dialog>
    </>
  );
}
