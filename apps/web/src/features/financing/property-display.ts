import type { FinancingPropertyFacts } from "@oalo/contracts";
import { financingMoney } from "./display.js";

export const FINANCING_V1_PHOTO_NOTICE =
  "This first report version is text-only. Property photography, logos, and headshots are not connected yet.";

/** Saved property facts are presentation only and never feed loan arithmetic. */
export function financingPropertyFacts(facts: FinancingPropertyFacts) {
  const number = (value: number | null) =>
    value === null ? "Not supplied" : new Intl.NumberFormat("en-US").format(value);
  return [
    ["List price", financingMoney(facts.listPriceMinor)],
    ["Bedrooms", number(facts.bedrooms)],
    [
      "Bathrooms",
      number(facts.bathroomsHundredths === null ? null : facts.bathroomsHundredths / 100),
    ],
    [
      "Floor area",
      facts.floorAreaSqFt === null ? "Not supplied" : `${number(facts.floorAreaSqFt)} sq ft`,
    ],
  ] as const;
}

export const financingMediaReadPath = (mediaRef: string) =>
  `/api/campaigns/property/financing/media/${encodeURIComponent(mediaRef)}`;
