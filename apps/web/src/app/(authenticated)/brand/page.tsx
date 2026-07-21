import { BrandProfileScreen } from "../../../features/brand/components/brand-profile-screen.js";
import { loadSyntheticBrandProfile } from "../../../features/brand/model/synthetic-brand-profile.js";

export default function BrandProfilePage() {
  return <BrandProfileScreen profile={loadSyntheticBrandProfile()} />;
}
