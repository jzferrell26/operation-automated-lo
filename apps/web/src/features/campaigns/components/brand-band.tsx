import { BAND_PLACEHOLDER } from "../../../copy/launch-messages.js";
import { brandInitials } from "../../workspace/ad-brand.js";
import type { LaunchBand } from "../launch-model.js";
import styles from "./ad-creative.module.css";

/**
 * PRD-009d D3 and 009D-AC-004, 009D-AC-023. The brand band along the bottom of a library ad.
 *
 * Its props accept only the frozen advertiser block (the band values a version froze at "Save and
 * check", or the viewer's own saved Brand on a card), and it reads only the keys that block has: an
 * object shaped like a Realtor partner, passed in alongside, has no key the band reads, so nothing
 * of it renders. Compliance control 9 holds by this structure, and the co-brand rule refuses a
 * Realtor or brokerage named inside the person's own Brand text before any version is saved.
 *
 * Every value is rendered as a React text child, never as markup.
 */

const NAME_REDUCED_AT = 24;
const NAME_FLOOR_AT = 40;

/** D3: a long name wraps, then shrinks in steps to the 14px floor, then truncates. */
export function bandNameSize(name: string): "regular" | "reduced" | "floor" {
  const length = [...name.trim()].length;
  if (length > NAME_FLOOR_AT) return "floor";
  if (length > NAME_REDUCED_AT) return "reduced";
  return "regular";
}

function nmlsLine(label: string | undefined, nmls: string): string {
  const parts = [label?.trim() ?? "", nmls.trim() === "" ? "" : `NMLS ${nmls.trim()}`];
  return parts.filter((part) => part !== "").join(", ");
}

export function BrandBand({ advertiser }: Readonly<{ advertiser: LaunchBand }>) {
  const name = advertiser.name.trim();
  if (name === "") {
    return (
      <div className={styles.band} data-brand-band="placeholder">
        <p className={styles.placeholder}>{BAND_PLACEHOLDER}</p>
        <p className={styles.disclosure}>{advertiser.disclosureLine}</p>
      </div>
    );
  }
  const company = [
    advertiser.company.trim(),
    advertiser.companyNmls.trim() === "" ? "" : `NMLS ${advertiser.companyNmls.trim()}`,
  ]
    .filter((part) => part !== "")
    .join(", ");
  return (
    <div className={styles.band} data-brand-band="brand">
      <div className={styles.bandRow}>
        <span aria-hidden="true" className={styles.tile}>
          {brandInitials(name)}
        </span>
        <span className={styles.identity}>
          <strong className={styles.name} data-name-size={bandNameSize(name)}>
            {name}
          </strong>
          <span className={styles.detail}>{nmlsLine(advertiser.title, advertiser.nmls)}</span>
        </span>
        {company === "" ? null : <span className={styles.company}>{company}</span>}
      </div>
      <p className={styles.disclosure}>{advertiser.disclosureLine}</p>
    </div>
  );
}
