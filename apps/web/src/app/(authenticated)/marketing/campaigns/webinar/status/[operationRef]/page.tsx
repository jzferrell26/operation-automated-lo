import type { Metadata } from "next";
import { notFound } from "next/navigation.js";
import { OpaqueReferenceSchema } from "@oalo/contracts";
import { WebinarPublisherStatus } from "../../../../../../../features/webinar-ads/publisher-status.js";

export const metadata: Metadata = { title: "Webinar ad publishing status" };
export const dynamic = "force-dynamic";
export default async function PublisherStatusPage({
  params,
}: Readonly<{ params: Promise<{ operationRef: string }> }>) {
  const parsed = OpaqueReferenceSchema.safeParse((await params).operationRef);
  if (!parsed.success) notFound();
  return <WebinarPublisherStatus key={parsed.data} operationRef={parsed.data} />;
}
