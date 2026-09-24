"use client";
import { useCallback, useEffect, useState } from "react";
import {
  HomeReportSchema,
  HomeWorkspaceSchema,
  type HomeBrand,
  type HomeMortgage,
  type HomeReport,
  type HomeReportInput,
  type HomeWorkspace,
} from "@oalo/contracts";
import { nextMonthlyRefresh } from "@oalo/application/homeowner-reports";
import { z } from "zod";
import { useDashboardPreview } from "../dashboard-preview/preview-provider.js";
import { sampleLeads } from "../dashboard-preview/model.js";
import { createSampleHomeReport, storeSampleHomeReport } from "./model.js";
import { getInternalJson, postInternalJson } from "../http/internal-api.js";

export type HomeAction =
  | { action: "recover-lookup"; propertyId: string; confirmed: true }
  | { action: "resolve-delivery"; reportId: string; confirmed: true }
  | { action: "create"; input: HomeReportInput }
  | {
      action: "revise";
      reportId: string;
      requestId: string;
      mortgage: HomeMortgage;
      brand: HomeBrand;
    }
  | { action: "refresh"; propertyId: string; requestId: string; confirmed: true }
  | {
      action: "enrollment";
      propertyId: string;
      cadence: "off" | "monthly";
      paused: boolean;
      deliverUpdates: boolean;
      confirmed: true;
    }
  | { action: "share" | "deliver"; reportId: string; confirmed: true }
  | { action: "revoke" | "resolve-review"; propertyId: string }
  | { action: "delete"; propertyId: string; confirmed: true };
const CommandResponse = z.object({
  report: HomeReportSchema.optional(),
  message: z.string().optional(),
  url: z.string().url().optional(),
  expiresAt: z.string().optional(),
});
export type HomeCommandResponse = z.infer<typeof CommandResponse>;
const empty: HomeWorkspace = {
  mode: "unconfigured",
  canWrite: false,
  valuationConnected: false,
  ghlConnected: false,
  deliveryEnabled: false,
  monthlyLookupLimit: 0,
  lookupsThisMonth: 0,
  properties: [],
};

async function api(path: string, body?: unknown): Promise<unknown> {
  const response = await (body === undefined
    ? getInternalJson(path)
    : postInternalJson(path, body));
  const result: unknown = await response.json();
  if (!response.ok) {
    const parsed = z.object({ message: z.string() }).safeParse(result);
    throw new Error(
      parsed.success ? parsed.data.message : "The report request could not be completed.",
    );
  }
  return result;
}

export function useHomeWorkspace() {
  const demo = useDashboardPreview();
  const isDemo = demo !== null;
  const [remote, setRemote] = useState<HomeWorkspace>(empty);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(async () => {
    if (isDemo) return;
    try {
      const data = HomeWorkspaceSchema.parse(await api("/api/homeowner-reports"));
      setRemote(data);
      setError(null);
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "The report workspace could not be opened.",
      );
    } finally {
      setReady(true);
    }
  }, [isDemo]);
  useEffect(() => {
    void reload();
  }, [reload]);
  const workspace: HomeWorkspace = demo
    ? { ...empty, mode: "demo", canWrite: true, properties: demo.state.homeownerProperties }
    : remote;
  async function command(action: HomeAction): Promise<HomeCommandResponse> {
    setBusy(true);
    setError(null);
    try {
      if (!demo) {
        const result = CommandResponse.parse(await api("/api/homeowner-reports", action));
        await reload();
        return result;
      }
      let report: HomeReport | undefined;
      const properties = demo.state.homeownerProperties;
      if (action.action === "create") report = createSampleHomeReport(action.input, properties);
      if (action.action === "revise") {
        const prior = properties
          .flatMap((property) => property.reports)
          .find((item) => item.id === action.reportId);
        if (!prior) throw new Error("This report could not be found on this device.");
        report = createSampleHomeReport(
          {
            ...prior.input,
            requestId: action.requestId,
            propertyId: prior.propertyId,
            mortgage: action.mortgage,
            brand: action.brand,
          },
          properties,
          prior,
        );
      }
      if (action.action === "refresh") {
        const prior = properties.find((property) => property.id === action.propertyId)?.reports[0];
        if (!prior) throw new Error("Create a report before refreshing this property.");
        report = createSampleHomeReport(
          { ...prior.input, requestId: action.requestId, propertyId: prior.propertyId },
          properties,
        );
      }
      if (report) {
        const snapshot = report;
        if (
          !demo.save((state) => ({
            ...state,
            homeownerProperties: storeSampleHomeReport(state.homeownerProperties, snapshot),
          }))
        )
          throw new Error("The report was not saved. Check browser storage and try again.");
        return { report };
      }
      if (
        action.action === "share" ||
        action.action === "deliver" ||
        action.action === "resolve-delivery" ||
        action.action === "recover-lookup"
      )
        throw new Error(
          "Sharing and HighLevel delivery require a live workspace. You can download or print this sample report.",
        );
      if (action.action === "enrollment" && action.deliverUpdates)
        throw new Error(
          "This demo can save a schedule preference, but it does not deliver updates.",
        );
      if (!("propertyId" in action)) throw new Error("This report action could not be completed.");
      const saved = demo.save((state) => ({
        ...state,
        homeownerProperties: state.homeownerProperties.flatMap((property) => {
          if (property.id !== action.propertyId) return [property];
          if (action.action === "delete") return [];
          if (action.action === "enrollment")
            return [
              {
                ...property,
                enrollment: {
                  cadence: action.cadence,
                  paused: action.paused,
                  deliverUpdates: action.deliverUpdates,
                  nextRefreshAt:
                    action.cadence === "monthly" && !action.paused
                      ? nextMonthlyRefresh(new Date())
                      : null,
                },
              },
            ];
          if (action.action === "resolve-review") return [{ ...property, reviewRequestedAt: null }];
          return [property];
        }),
      }));
      if (!saved)
        throw new Error("This change was not saved. Check browser storage and try again.");
      return {
        message:
          action.action === "enrollment"
            ? "Demo update preference saved. No automatic lookups or delivery are scheduled."
            : action.action === "delete"
              ? "The sample property and its reports were removed."
              : "Report preferences updated.",
      };
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "The report action failed.");
      throw failure;
    } finally {
      setBusy(false);
    }
  }
  async function searchContacts(query: string) {
    if (demo)
      return sampleLeads
        .filter((lead) => `${lead.name} ${lead.email}`.toLowerCase().includes(query.toLowerCase()))
        .map((lead) => ({ id: lead.id, name: lead.name, email: lead.email }));
    const response = z
      .object({
        contacts: z.array(
          z.object({ id: z.string(), name: z.string(), email: z.string().nullable() }),
        ),
      })
      .parse(await api("/api/homeowner-reports/contacts", { query }));
    return response.contacts;
  }
  async function download(report: HomeReport) {
    setBusy(true);
    setError(null);
    try {
      const { createHomeReportPdf } = await import("./report-pdf.js");
      // Live data came from authenticated storage; the PDF renders that exact snapshot locally.
      const bytes = await createHomeReportPdf(report);
      const url = URL.createObjectURL(
        new Blob([new Uint8Array(bytes)], { type: "application/pdf" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = `homeowner-report-${report.id.slice(-8)}.pdf`;
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "The PDF could not be created. Use Print to save this report as a PDF.",
      );
    } finally {
      setBusy(false);
    }
  }
  const reportStatus = useCallback(
    async (reportId: string) => {
      if (isDemo) return null;
      return z
        .object({
          delivery: z.object({ status: z.string(), detailCode: z.string().nullable() }).nullable(),
        })
        .parse(await api(`/api/homeowner-reports/reports/${reportId}`)).delivery;
    },
    [isDemo],
  );
  return {
    workspace,
    ready: demo ? demo.ready : ready,
    busy,
    error: error ?? demo?.error ?? null,
    reload,
    command,
    searchContacts,
    reportStatus,
    download,
  };
}
