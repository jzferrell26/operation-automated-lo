import type { Metadata } from "next";
import { notFound } from "next/navigation.js";
import { FunnelEditor } from "../../../../../../features/funnels/studio.js";
import { FunnelKindSchema } from "../../../../../../features/funnels/model.js";
import { funnelPageContext } from "../../../../../../server/funnel-page.js";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Edit your funnel",
  robots: { index: false, follow: false },
};
export default async function FunnelEditorPage({
  params,
}: Readonly<{ params: Promise<{ kind: string }> }>) {
  const kind = FunnelKindSchema.safeParse((await params).kind);
  if (!kind.success) notFound();
  return <FunnelEditor kind={kind.data} context={await funnelPageContext()} />;
}
