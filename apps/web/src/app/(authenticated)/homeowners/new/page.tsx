import { HomeownerWorkspace } from "../../../../features/homeowners/workspace.js";
import { homePageBrand } from "../../../../server/homeowners/page-brand.js";
export default async function NewHomeownerReportPage() {
  return <HomeownerWorkspace view="new" initialBrand={await homePageBrand()} />;
}
