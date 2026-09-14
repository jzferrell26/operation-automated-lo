import { BrandProfileScreen } from "../../../features/brand/components/brand-profile-screen.js";
import { loadAuthenticatedWorkspace } from "../../../server/authenticated-workspace-data.js";

export default function BrandProfilePage() {
  return <BrandProfileScreen profile={loadAuthenticatedWorkspace().brand} />;
}
