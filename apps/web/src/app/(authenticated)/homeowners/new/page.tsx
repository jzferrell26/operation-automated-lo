import type { Metadata } from "next";

import { PAGE_TITLES } from "../../../../copy/page-titles.js";
import { HomeownerWorkspace } from "../../../../features/homeowners/workspace.js";
import { homePageBrand } from "../../../../server/homeowners/page-brand.js";

/** Writing review delta check, D-6: the tab says which page this is. */
export const metadata: Metadata = { title: PAGE_TITLES.newHomeownerReport };

export default async function NewHomeownerReportPage() {
  return <HomeownerWorkspace view="new" initialBrand={await homePageBrand()} />;
}
