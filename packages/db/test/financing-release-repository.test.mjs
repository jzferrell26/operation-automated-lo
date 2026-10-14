import * as db from "../dist/index.js";
import * as app from "../../application/dist/index.js";
import { describe, it } from "node:test";
import { runFinancingReleaseAdapterCases } from "./financing-release-repository.unit-cases.mjs";
runFinancingReleaseAdapterCases(db, app, { describe, it });
