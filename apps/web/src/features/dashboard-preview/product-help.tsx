"use client";

import { Dialog } from "@oalo/ui";
import styles from "./walkthrough.module.css";

/**
 * The preview's Help. PRD-009a (D-15, 009F-AC-005): the floating walkthrough, its guides, and the
 * setup summary that sent people to the removed setup page retire with the product's, so Help says what the
 * demo is and nothing more. It keeps the one class of `walkthrough.module.css` it uses.
 */
export function ProductHelp({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog title="Help" open={open} onClose={onClose}>
      <p className={styles.helpNote}>
        This is a demo workspace with sample data. Your changes are saved on this device, and
        nothing is sent, published, or charged.
      </p>
    </Dialog>
  );
}
