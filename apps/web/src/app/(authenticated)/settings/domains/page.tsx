import type { Metadata } from "next";
import { PAGE_TITLES } from "../../../../copy/page-titles.js";
import { DomainScreen } from "../../../../features/domains/domain-screen.js";
export const metadata: Metadata = { title: PAGE_TITLES.domains };
export default function DomainsPage() {
  return <DomainScreen />;
}
