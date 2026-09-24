import type { Metadata } from "next";
import { notFound } from "next/navigation.js";
import { readSharedHomeReport } from "@oalo/db";
import { SharedHomeReport } from "../../../../features/homeowners/shared-report.js";
import { campaignDatabasePool } from "../../../../server/campaign-persistence-runtime.js";
import { HomeEnvironmentSchema, homeHash } from "../../../../server/homeowners/runtime.js";
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
  if (
    !/^[a-f0-9]{64}$/u.test(secret) ||
    HomeEnvironmentSchema.parse(process.env).OALO_HOMEOWNER_REPORTS !== "enabled"
  )
    notFound();
  const report = await readSharedHomeReport(campaignDatabasePool(process.env), homeHash(secret));
  if (!report) notFound();
  return <SharedHomeReport report={report} secret={secret} />;
}
