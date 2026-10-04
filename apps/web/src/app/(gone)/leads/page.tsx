import { notFound } from "next/navigation.js";

/** PRD-009f D1. Leads is gone; `../not-found.tsx` says where the work went. */
export default function GoneLeadsPage(): never {
  notFound();
}
