import type { Metadata } from "next";
import { FunnelCatalog } from "../../../../../features/funnels/studio.js";
import { funnelPageContext } from "../../../../../server/funnel-page.js";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Funnel studio",
  robots: { index: false, follow: false },
};
export default async function FunnelCatalogPage() {
  return <FunnelCatalog context={await funnelPageContext()} />;
}
