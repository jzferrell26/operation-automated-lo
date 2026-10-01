import type { Metadata } from "next";
import { headers } from "next/headers.js";
import { notFound } from "next/navigation.js";
import { readSharedHomeReport } from "@oalo/db";
import { SharedHomeReport } from "../../../../features/homeowners/shared-report.js";
import { campaignDatabasePool } from "../../../../server/campaign-persistence-runtime.js";
import { homeHash, homeReportsEnabled } from "../../../../server/homeowners/runtime.js";
import { consumeSharedReportBudget } from "../../../../server/homeowners/share-throttle.js";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Your homeowner report",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};
export default async function SharedReportPage({
  params,
}: {
  params: Promise<{ secret: string }>;
}) {
  const { secret } = await params;
  if (!/^[a-f0-9]{64}$/u.test(secret) || !homeReportsEnabled(process.env)) notFound();
  // A caller that asks too often gets the same page as a link that cannot be shown, before any
  // lookup, so the page never says why (independent review, M-1).
  if (!consumeSharedReportBudget(await headers(), "read").allowed) notFound();
  const report = await readSharedHomeReport(campaignDatabasePool(process.env), homeHash(secret));
  if (!report) notFound();
  return <SharedHomeReport report={report} secret={secret} />;
}
