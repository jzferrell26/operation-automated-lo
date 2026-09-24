import { handleHomeReportDetail } from "../../../../../server/homeowners/http.js";
export async function GET(request:Request,{params}:{params:Promise<{reportId:string}>}){return handleHomeReportDetail(request,(await params).reportId);}
