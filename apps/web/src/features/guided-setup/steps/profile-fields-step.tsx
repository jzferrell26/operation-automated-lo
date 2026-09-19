"use client";

import { TextField } from "@oalo/ui";
import { useId, useState } from "react";

import { GUIDED_SETUP_STEPS } from "../../../copy/guided-setup-messages.js";
import { GUIDED_SETUP_ANCHORS } from "../anchor-registry.js";
import { normalizeProfileInput, type SetupProfile } from "../model/profile.js";
import styles from "../guided-setup.module.css";

/**
 * PRD-006c D3 steps 2 and 3. Both collect a few of the user's own fields and save them to the
 * profile, so they are one component with two field lists rather than two components that would
 * drift apart. The step's own form carries the anchor, which is why the panel points at nothing on
 * the page for these two: the field being edited is inside the panel, so nothing can cover it.
 */

export type ProfileFieldName = keyof SetupProfile;

export type ProfileFieldSpec = Readonly<{
  label: string;
  name: ProfileFieldName;
  optional: boolean;
  autoComplete: string;
}>;

export const YOUR_DETAILS_FIELDS: readonly ProfileFieldSpec[] = Object.freeze([
  Object.freeze({
    label: GUIDED_SETUP_STEPS.yourDetails.nameLabel,
    name: "displayName",
    optional: false,
    autoComplete: "name",
  }),
  Object.freeze({
    label: GUIDED_SETUP_STEPS.yourDetails.companyLabel,
    name: "company",
    optional: false,
    autoComplete: "organization",
  }),
  Object.freeze({
    label: GUIDED_SETUP_STEPS.yourDetails.nmlsLabel,
    name: "nmlsNumber",
    optional: true,
    autoComplete: "off",
  }),
  Object.freeze({
    label: GUIDED_SETUP_STEPS.yourDetails.phoneLabel,
    name: "phone",
    optional: true,
    autoComplete: "tel",
  }),
]);

export const REALTOR_PARTNER_FIELDS: readonly ProfileFieldSpec[] = Object.freeze([
  Object.freeze({
    label: GUIDED_SETUP_STEPS.realtorPartner.realtorNameLabel,
    name: "realtorName",
    optional: false,
    autoComplete: "off",
  }),
  Object.freeze({
    label: GUIDED_SETUP_STEPS.realtorPartner.brokerageLabel,
    name: "realtorBrokerage",
    optional: true,
    autoComplete: "organization",
  }),
]);

export type ProfileFieldsStepProps = Readonly<{
  anchor:
    typeof GUIDED_SETUP_ANCHORS.setupDetailsForm | typeof GUIDED_SETUP_ANCHORS.setupRealtorForm;
  fields: readonly ProfileFieldSpec[];
  legend: string;
  onValuesChange: (values: Readonly<Record<string, string>>) => void;
  values: Readonly<Record<string, string>>;
}>;

export function ProfileFieldsStep({
  anchor,
  fields,
  legend,
  onValuesChange,
  values,
}: ProfileFieldsStepProps) {
  const groupId = useId();
  return (
    <fieldset className={styles.stepFields} data-tour={anchor}>
      <legend>{legend}</legend>
      {fields.map((field) => (
        <TextField
          autoComplete={field.autoComplete}
          id={`${groupId}-${field.name}`}
          key={field.name}
          label={field.label}
          name={field.name}
          onChange={(event) => {
            onValuesChange({ ...values, [field.name]: event.currentTarget.value });
          }}
          requirement={field.optional ? "optional" : "required"}
          value={values[field.name] ?? ""}
        />
      ))}
    </fieldset>
  );
}

/**
 * Whether the step's required fields are filled, which is what enables "Continue". The check runs
 * through the same schema the route validates with, so the browser and the server agree on what
 * "filled in" means rather than each having an opinion.
 */
export function profileFieldsAreValid(
  fields: readonly ProfileFieldSpec[],
  values: Readonly<Record<string, string>>,
): boolean {
  return fields.every((field) => field.optional || (values[field.name] ?? "").trim().length > 0);
}

/** The values the two steps have gathered so far, as the profile the route will store. */
export function profileFromValues(values: Readonly<Record<string, string>>): SetupProfile {
  return normalizeProfileInput(values);
}

/** The controlled form state both steps share, seeded from whatever is already saved. */
export function useProfileValues(
  initial: Readonly<Record<string, string>>,
): readonly [Readonly<Record<string, string>>, (next: Readonly<Record<string, string>>) => void] {
  const [values, setValues] = useState<Readonly<Record<string, string>>>(initial);
  return [values, setValues] as const;
}
