import type { CSSProperties } from "react";

import { SAMPLE_AD_LABEL } from "../../../copy/launch-messages.js";
import { AD_BRAND_TILE_LETTER_COLOR, adBrandColorValue } from "../../workspace/ad-brand.js";
import type { LaunchBand } from "../launch-model.js";
import styles from "./ad-creative.module.css";
import { BrandBand } from "./brand-band.js";

/**
 * PRD-009d D3. The paper and ink of an ad: white with navy text in both themes (D-24), so the
 * band's contrast never depends on the theme. The navy is the light theme's strongest text colour.
 * They are set here rather than in the stylesheet because a feature stylesheet carries no colour
 * literal; the brand colour is set the same way, from its preset id, only when the band renders.
 */
export const AD_PAPER = "#FFFFFF";
export const AD_INK = "#061E35";

export type AdShape = "tall" | "square";

export function adColorVariables(colorPresetId: string): CSSProperties {
  return {
    "--ad-band-paper": AD_PAPER,
    "--ad-band-ink": AD_INK,
    "--ad-brand": adBrandColorValue(colorPresetId),
    "--ad-tile-letters": AD_BRAND_TILE_LETTER_COLOR,
  } as CSSProperties;
}

export type AdCreativeProps = Readonly<{
  art: Readonly<{ tall: string; square: string }>;
  alt: string;
  shape: AdShape;
  advertiser: LaunchBand;
  sample: boolean;
}>;

/**
 * One library ad as a picture: the library's art, which nobody but the curator changes, above the
 * brand band drawn from the person's Brand (design section 5.4). The art comes from the
 * application's own origin and its alternative text is the catalog's.
 */
export function AdCreative({ art, alt, shape, advertiser, sample }: AdCreativeProps) {
  return (
    <div
      className={styles.creative}
      data-ad-creative=""
      data-shape={shape}
      style={adColorVariables(advertiser.colorPresetId)}
    >
      <img alt={alt} className={styles.art} src={shape === "tall" ? art.tall : art.square} />
      <BrandBand advertiser={advertiser} />
      {sample ? <span className={styles.sampleLabel}>{SAMPLE_AD_LABEL}</span> : null}
    </div>
  );
}
