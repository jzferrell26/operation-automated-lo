import type { Metadata } from "next";
import { headers } from "next/headers.js";
import { notFound, redirect } from "next/navigation.js";
import { z } from "zod";
import { PublishedFunnelSurface } from "../../../../../features/funnels/published-surface.js";
import { funnelDefinition } from "../../../../../features/funnels/catalog.js";
import { publicSnapshot } from "../../../../../server/funnel-public-http.js";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: { absolute: "Your mortgage next step" },
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export default async function PublicFunnelPage({
  params,
}: Readonly<{ params: Promise<{ id: string; step?: string[] }> }>) {
  const input = await params;
  if (!z.uuid().safeParse(input.id).success || (input.step?.length ?? 0) > 1) notFound();
  let result;
  try {
    result = await publicSnapshot(input.id, (await headers()).get("cookie") ?? "", process.env);
  } catch {
    notFound();
  }
  if (!result) notFound();
  const selected = funnelDefinition(result.snapshot.kind).steps.find(
    (item) => item.id === (input.step?.[0] ?? "landing"),
  );
  if (!selected) notFound();
  if (selected.id !== "landing" && !result.hasAccess) redirect(`/f/${input.id}`);
  return <PublishedFunnelSurface id={input.id} snapshot={result.snapshot} step={selected.id} />;
}
