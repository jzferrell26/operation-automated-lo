import { notFound } from "next/navigation.js";

/** PRD-009f D1. The pipeline is gone; `../../not-found.tsx` says where the work went. */
export default function GonePipelinePage(): never {
  notFound();
}
