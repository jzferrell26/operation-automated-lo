import { HomeownerWorkspace } from "../../../features/homeowners/workspace.js";
import { homePageBrand } from "../../../server/homeowners/page-brand.js";
export default async function HomeownersPage() {
  return <HomeownerWorkspace initialBrand={await homePageBrand()} />;
}
