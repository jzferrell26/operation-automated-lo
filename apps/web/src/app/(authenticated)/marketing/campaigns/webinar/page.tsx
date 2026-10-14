import type { Metadata } from "next";
import { OpaqueReferenceSchema } from "@oalo/contracts";
import { WebinarAdPreparation } from "../../../../../features/webinar-ads/preparation.js";
export const metadata: Metadata = { title: "Prepare a webinar ad" };
export const dynamic = "force-dynamic";
export default async function WebinarPreparationPage({
  searchParams,
}: Readonly<{ searchParams: Promise<Record<string, string | string[] | undefined>> }>) {
  const search = await searchParams;
  const campaign = OpaqueReferenceSchema.safeParse(search["campaign"]);
  const version = OpaqueReferenceSchema.safeParse(search["version"]);
  return (
    <WebinarAdPreparation
      edit={
        campaign.success && version.success
          ? { campaignRef: campaign.data, campaignVersionRef: version.data }
          : undefined
      }
    />
  );
}
