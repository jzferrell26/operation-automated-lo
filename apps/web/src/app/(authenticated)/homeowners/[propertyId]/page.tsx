import type { Metadata } from "next";
import { notFound } from "next/navigation.js";
import { HomePropertyIdSchema } from "@oalo/contracts";
import { PAGE_TITLES } from "../../../../copy/page-titles.js";
import { HomeownerWorkspace } from "../../../../features/homeowners/workspace.js";
import { homePageBrand } from "../../../../server/homeowners/page-brand.js";

/** Writing review delta check, D-6: the tab says which page this is. */
export const metadata: Metadata = { title: PAGE_TITLES.homeownerReport };

export default async function HomeownerReportPage({
  params,
}: {
  params: Promise<{ propertyId: string }>;
}) {
  const { propertyId } = await params;
  if (!HomePropertyIdSchema.safeParse(propertyId).success) notFound();
  return (
    <HomeownerWorkspace
      view="detail"
      propertyId={propertyId}
      initialBrand={await homePageBrand()}
    />
  );
}
