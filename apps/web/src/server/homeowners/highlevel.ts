import { HomeContactIdSchema } from "@oalo/contracts";
import { z } from "zod";
import { HomeownerError, readBoundedJson } from "./errors.js";

export const HomeGhlConnectionSchema = z
  .object({
    ghlLocationId: HomeContactIdSchema,
    accessToken: z.string().min(20).max(4096).regex(/^\S+$/u),
    reportUrlFieldId: HomeContactIdSchema,
    workflowId: z.string().regex(/^[A-Za-z0-9_-]{1,100}$/u),
  })
  .strict();
export type HomeGhlConnection = z.infer<typeof HomeGhlConnectionSchema>;
const ContactSchema = z
  .object({
    id: HomeContactIdSchema,
    locationId: HomeContactIdSchema,
    name: z.string().nullish(),
    contactName: z.string().nullish(),
    firstName: z.string().nullish(),
    lastName: z.string().nullish(),
    email: z.string().nullish(),
    dnd: z.boolean().optional(),
    dndSettings: z
      .record(z.string(), z.object({ status: z.string().optional() }).loose())
      .optional(),
    customFields: z
      .array(
        z
          .object({
            id: z.string(),
            value: z.unknown().optional(),
            fieldValue: z.unknown().optional(),
          })
          .loose(),
      )
      .optional(),
  })
  .loose();
export interface HomeContact {
  id: string;
  name: string;
  email: string | null;
  communicationAllowed: boolean;
}
export interface HomeContactPort {
  get(id: string): Promise<HomeContact>;
  search(query: string): Promise<HomeContact[]>;
  handoff(id: string, reportUrl: string): Promise<void>;
}

export function createHomeHighLevelPort(
  connection: HomeGhlConnection,
  fetcher: typeof fetch = fetch,
): HomeContactPort {
  const config = HomeGhlConnectionSchema.parse(connection);
  const urlFor = (path: string) => `https://services.leadconnectorhq.com${path}`;
  async function call(
    path: string,
    method: "GET" | "PUT" | "POST",
    body?: unknown,
  ): Promise<unknown> {
    const mutation = method === "PUT" || path.includes("/workflow/");
    try {
      const response = await fetcher(urlFor(path), {
        method,
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
          Version: "v3",
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(12_000),
      });
      if (!response.ok)
        throw new HomeownerError(
          mutation ? "HANDOFF_UNCERTAIN" : "CONTACT_UNAVAILABLE",
          mutation ? 502 : 422,
          mutation
            ? "HighLevel did not confirm the handoff. Check the contact before trying any further delivery."
            : "The HighLevel contact could not be verified. Check the connection and contact access.",
        );
      return await readBoundedJson(response, 500_000);
    } catch (error) {
      if (error instanceof HomeownerError) throw error;
      throw new HomeownerError(
        mutation ? "HANDOFF_UNCERTAIN" : "CONTACT_UNAVAILABLE",
        502,
        mutation
          ? "HighLevel did not confirm the handoff. It will not be repeated automatically."
          : "HighLevel could not be reached. Your saved reports are unchanged.",
      );
    }
  }
  function project(raw: unknown): HomeContact {
    const contact = ContactSchema.parse(raw);
    if (contact.locationId !== config.ghlLocationId)
      throw new HomeownerError(
        "CONTACT_NOT_ACCESSIBLE",
        404,
        "This contact is not available in your workspace.",
      );
    const name = (
      contact.name ??
      contact.contactName ??
      [contact.firstName, contact.lastName].filter(Boolean).join(" ")
    ).trim();
    if (name.length < 2 || name.length > 160)
      throw new HomeownerError(
        "CONTACT_NAME_REQUIRED",
        422,
        "Complete the contact's name in HighLevel before creating a report.",
      );
    const channelStatus = contact.dndSettings;
    const allowed =
      contact.dnd === false &&
      channelStatus !== undefined &&
      Object.values(channelStatus).every((channel) => channel.status === "inactive");
    return { id: contact.id, name, email: contact.email ?? null, communicationAllowed: allowed };
  }
  async function read(id: string) {
    HomeContactIdSchema.parse(id);
    const envelope = z
      .object({ contact: ContactSchema })
      .parse(await call(`/contacts/${encodeURIComponent(id)}`, "GET"));
    return { raw: envelope.contact, contact: project(envelope.contact) };
  }
  return {
    async get(id) {
      return (await read(id)).contact;
    },
    async search(query) {
      const safe = z.string().trim().min(2).max(100).parse(query);
      const envelope = z.object({ contacts: z.array(ContactSchema).max(100) }).parse(
        await call("/contacts/search", "POST", {
          locationId: config.ghlLocationId,
          page: 1,
          pageLimit: 20,
          query: safe,
        }),
      );
      return envelope.contacts.map(project);
    },
    async handoff(id, reportUrl) {
      const target = new URL(reportUrl);
      if (
        target.protocol !== "https:" ||
        target.username ||
        target.password ||
        !/^\/home-report\/[a-f0-9]{64}$/u.test(target.pathname) ||
        target.search ||
        target.hash
      )
        throw new HomeownerError(
          "INVALID_REPORT_LINK",
          400,
          "The report link could not be verified.",
        );
      const initial = await read(id);
      if (!initial.contact.communicationAllowed)
        throw new HomeownerError(
          "CONTACT_COMMUNICATION_BLOCKED",
          409,
          "HighLevel has not confirmed communication permission for this contact. Review their communication settings first.",
        );
      const result = await call(`/contacts/${encodeURIComponent(id)}`, "PUT", {
        customFields: [{ id: config.reportUrlFieldId, fieldValue: reportUrl }],
      });
      z.object({ succeeded: z.literal(true) }).parse(result);
      const verified = await read(id);
      const field = verified.raw.customFields?.find((item) => item.id === config.reportUrlFieldId);
      if (
        !verified.contact.communicationAllowed ||
        (field?.value ?? field?.fieldValue) !== reportUrl
      )
        throw new HomeownerError(
          "HANDOFF_UNCERTAIN",
          409,
          "The saved report link or communication permission could not be confirmed. No workflow was started.",
        );
      const workflow = await call(
        `/contacts/${encodeURIComponent(id)}/workflow/${encodeURIComponent(config.workflowId)}`,
        "POST",
        { eventStartTime: new Date().toISOString() },
      );
      if (!z.object({ succeeded: z.literal(true) }).safeParse(workflow).success)
        throw new HomeownerError(
          "HANDOFF_UNCERTAIN",
          502,
          "HighLevel did not confirm workflow activation. Check the contact before any further delivery.",
        );
    },
  };
}
