import { handleVisitor } from "../../../../server/funnel-public-http.js";
export async function POST(
  request: Request,
  { params }: Readonly<{ params: Promise<{ id: string }> }>,
) {
  return handleVisitor(request, (await params).id);
}
