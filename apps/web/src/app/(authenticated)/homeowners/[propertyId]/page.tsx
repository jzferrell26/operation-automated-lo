import { notFound } from "next/navigation.js";
import { HomePropertyIdSchema } from "@oalo/contracts";
import { HomeownerWorkspace } from "../../../../features/homeowners/workspace.js";
import { homePageBrand } from "../../../../server/homeowners/page-brand.js";
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
