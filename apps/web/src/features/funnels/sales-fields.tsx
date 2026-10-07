import { FormField, TextArea, TextField } from "@oalo/ui";
import { salesContent } from "./sales-content.js";
import type { FunnelFields, FunnelKind, FunnelSales, FunnelSalesTextKey } from "./model.js";

export const SALES_GROUPS = [
  {
    id: "sales-story",
    label: "Offer and story",
    fields: [
      ["headlineAccent", "Words to emphasize in the headline", false],
      ["storyTitle", "Story section headline", false],
      ["storyText", "Story description", true],
      ["solutionTitle", "Solution headline", false],
      ["solutionText", "Solution description", true],
      ["formTitle", "Registration or inquiry heading", false],
      ["formNote", "Registration or inquiry description", true],
    ],
  },
  {
    id: "sales-challenges",
    label: "Questions and challenges",
    fields: [
      ["problemTitle", "Challenges section headline", false],
      ["problemOneTitle", "First challenge", false],
      ["problemOneText", "First challenge explanation", true],
      ["problemTwoTitle", "Second challenge", false],
      ["problemTwoText", "Second challenge explanation", true],
      ["problemThreeTitle", "Third challenge", false],
      ["problemThreeText", "Third challenge explanation", true],
      ["problemFourTitle", "Fourth challenge", false],
      ["problemFourText", "Fourth challenge explanation", true],
    ],
  },
  {
    id: "sales-proof",
    label: "Presenter and real client feedback",
    fields: [
      ["presenterRole", "Presenter role", false],
      ["presenterCredentials", "Your verified experience or credentials", true],
      ["quoteText", "Real client quote (optional)", true],
      ["quoteName", "Client name for the quote", false],
      ["quoteContext", "Quote context (optional)", false],
    ],
  },
  {
    id: "sales-media",
    label: "Invitation video and policies",
    fields: [
      ["invitationVideoUrl", "Invitation video link (HTTPS)", false],
      ["privacyUrl", "Privacy Policy link (HTTPS)", false],
      ["termsUrl", "Terms of Use link (HTTPS)", false],
    ],
  },
] as const satisfies readonly {
  id: string;
  label: string;
  fields: readonly (readonly [FunnelSalesTextKey, string, boolean])[];
}[];

export function FunnelSalesFields({
  kind,
  fields,
  section,
  onChange,
}: Readonly<{
  kind: FunnelKind;
  fields: FunnelFields;
  section: string;
  onChange: (sales: FunnelSales) => void;
}>) {
  const sales = salesContent(kind, fields);
  const group = SALES_GROUPS.find((item) => item.id === section);
  return (
    <>
      {group?.fields.map(([key, label, multiline]) =>
        multiline ? (
          <TextArea
            key={key}
            label={label}
            value={sales[key]}
            maxLength={1200}
            rows={4}
            onChange={(event) =>
              onChange({
                ...sales,
                [key]: event.currentTarget.value,
                ...(key.startsWith("quote") ? { proofPermissionConfirmed: false } : {}),
              })
            }
          />
        ) : (
          <TextField
            key={key}
            label={label}
            value={sales[key]}
            maxLength={key.endsWith("Url") ? 1500 : 150}
            onChange={(event) =>
              onChange({
                ...sales,
                [key]: event.currentTarget.value,
                ...(key.startsWith("quote") ? { proofPermissionConfirmed: false } : {}),
              })
            }
          />
        ),
      )}
      {section === "sales-proof" ? (
        <>
          <p>
            Optional client feedback stays hidden until you confirm it is genuine and you have
            permission to use it. Do not use sample quotes.
          </p>
          <FormField label="This is genuine client feedback and I have permission to publish it.">
            {(control) => (
              <input
                {...control}
                type="checkbox"
                checked={sales.proofPermissionConfirmed}
                onChange={(event) =>
                  onChange({ ...sales, proofPermissionConfirmed: event.currentTarget.checked })
                }
              />
            )}
          </FormField>
        </>
      ) : null}
    </>
  );
}
