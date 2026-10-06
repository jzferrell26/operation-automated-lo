import { handleFinancingSave } from "../../../../../server/financing-http.js";

export async function POST(request: Request) {
  return handleFinancingSave(request);
}
