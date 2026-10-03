import type { Metadata } from "next";

import { PAGE_TITLES } from "../../copy/page-titles.js";
import { GoneScreen } from "../../features/workspace/gone-screen.js";

/** Writing review W-13: the tab says the page is gone. */
export const metadata: Metadata = { title: PAGE_TITLES.gone };

/** PRD-009f D1. What `notFound()` shows on the three CRM addresses. */
export default function GoneNotFound() {
  return <GoneScreen />;
}
