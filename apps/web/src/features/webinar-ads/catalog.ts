import authored from "./catalog.json" with { type: "json" };
import { WebinarPackSchema } from "./model.js";

export const WEBINAR_ADS = WebinarPackSchema.parse(authored);
