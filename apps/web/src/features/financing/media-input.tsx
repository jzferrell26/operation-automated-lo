"use client";

import { useRef, useState } from "react";
import { Button, Select, Surface, TextField } from "@oalo/ui";
import {
  FinancingMediaAltTextSchema,
  FinancingRightsBasisSchema,
  type FinancingRightsBasis,
} from "@oalo/contracts";
import { FinancingCheck } from "./scenario-editor.js";
import {
  financingFileProblem,
  FinancingUploadResponseSchema,
  uploadFinancingPhotograph,
} from "./media-upload.js";
import type { FinancingFormDraft } from "./form-model.js";
import { FINANCING_API_PATH } from "./model.js";
import styles from "./financing.module.css";

export function FinancingMediaInput({
  media,
  disabled,
  change,
  pendingChange,
}: Readonly<{
  media: FinancingFormDraft["media"];
  disabled: boolean;
  change: (media: FinancingFormDraft["media"]) => void;
  pendingChange: (pending: boolean) => void;
}>) {
  const [file, setFile] = useState<File | null>(null);
  const [basis, setBasis] = useState<FinancingRightsBasis | "">("");
  const [confirmed, setConfirmed] = useState(false);
  const [altText, setAltText] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const [altProblem, setAltProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const requestId = useRef<string | null>(null);
  const uploading = useRef(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const clearFile = () => {
    setFile(null);
    setConfirmed(false);
    setAltText("");
    setAltProblem(null);
    requestId.current = null;
    if (fileInput.current) fileInput.current.value = "";
    pendingChange(false);
  };
  async function upload() {
    if (disabled || uploading.current || !file || !basis || !confirmed || media.length >= 6) return;
    const invalid = financingFileProblem(file);
    const altValid = FinancingMediaAltTextSchema.safeParse(altText).success;
    if (invalid || !altValid) {
      const altError = altValid
        ? null
        : "Describe the photograph using 1 to 300 printable characters.";
      setAltProblem(altError);
      setProblem(invalid ?? altError);
      return;
    }
    requestId.current ??= crypto.randomUUID();
    uploading.current = true;
    setBusy(true);
    setProblem(null);
    try {
      const response = await uploadFinancingPhotograph(file, requestId.current, basis);
      if (!response.ok) {
        setProblem(
          response.status === 409
            ? "This upload key already belongs to different content. Select the photograph again to start a new upload. Your file and rights choice are still here."
            : response.status === 429
              ? "Photograph processing is busy. Wait a few seconds and retry. Your file and rights choice are still here."
              : "The photograph upload could not be confirmed. Your file and rights choice are still here. Retry with the same details.",
        );
        return;
      }
      const result = FinancingUploadResponseSchema.safeParse(await response.json());
      if (!result.success) {
        setProblem("The photograph upload could not be confirmed. Retry with the same details.");
        return;
      }
      if (media.some((item) => item.mediaRef === result.data.mediaRef)) {
        setProblem("This photograph is already placed in the report.");
        return;
      }
      change([...media, { mediaRef: result.data.mediaRef, altText: altText.trim() }]);
      clearFile();
    } catch {
      // Preserve the file and request identity because the server may have completed the write.
      setProblem(
        "The photograph upload could not be confirmed. Your file and rights choice are still here. Retry with the same details.",
      );
    } finally {
      uploading.current = false;
      setBusy(false);
    }
  }
  function move(index: number, target: number) {
    const reordered = [...media];
    const [item] = reordered.splice(index, 1);
    if (item) {
      reordered.splice(target, 0, item);
      change(reordered);
    }
  }
  return (
    <Surface padding="lg" data-financing-media-input="">
      <h2 className={styles.propertySectionTitle}>Property photographs</h2>
      <p>
        Upload one JPEG or PNG at a time, up to six photographs. Each file must be no larger than 2
        MiB and measure 400 to 6000 pixels per side. The first photograph is the hero. Leave the
        gallery empty for a text-only report.
      </p>
      <fieldset className={styles.fieldset} disabled={disabled || busy}>
        {problem ? <p role="alert">{problem}</p> : null}
        <TextField
          label="Choose a property photograph"
          ref={fileInput}
          type="file"
          accept="image/jpeg,image/png"
          error={file ? (financingFileProblem(file) ?? undefined) : undefined}
          disabled={disabled || busy || media.length >= 6}
          onChange={(event) => {
            const chosen = event.currentTarget.files?.[0] ?? null;
            setFile(chosen);
            setConfirmed(false);
            setAltProblem(null);
            requestId.current = null;
            setProblem(chosen ? financingFileProblem(chosen) : null);
            pendingChange(chosen !== null);
          }}
        />
        {file ? <p className={styles.lead}>Selected photograph: {file.name}</p> : null}
        <Select
          label="Photograph usage rights"
          value={basis}
          placeholder="Choose the permission you have"
          disabled={disabled || busy}
          options={[
            { value: "owned", label: "I own the photograph" },
            { value: "licensed", label: "I have a license" },
            { value: "permission", label: "The owner gave permission" },
          ]}
          onValueChange={(value) => {
            setBasis(FinancingRightsBasisSchema.parse(value));
            setConfirmed(false);
            requestId.current = null;
          }}
        />
        <FinancingCheck
          label="I confirm these rights allow this photograph in this account's private financing materials"
          checked={confirmed}
          change={setConfirmed}
        />
        <TextField
          label="Photograph description (alt text)"
          value={altText}
          maxLength={300}
          error={altProblem ?? undefined}
          onChange={(event) => {
            setAltText(event.currentTarget.value);
            setAltProblem(null);
          }}
        />
        <div className={styles.actions}>
          <Button
            type="button"
            disabled={disabled || busy || !file || !basis || !confirmed || media.length >= 6}
            onClick={() => void upload()}
          >
            {busy ? "Uploading photograph" : "Upload photograph"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={disabled || busy || !file}
            onClick={clearFile}
          >
            Cancel selected photograph
          </Button>
        </div>
        <p role="status">
          {busy
            ? "Uploading your photograph. Keep this page open."
            : `${media.length} of 6 photographs placed.`}
        </p>
        {media.map((item, index) => (
          <div key={item.mediaRef} className={styles.scenario}>
            <h3>
              Photograph {index + 1}
              {index === 0 ? " (hero)" : ""}
            </h3>
            <img
              src={`${FINANCING_API_PATH}/media/${encodeURIComponent(item.mediaRef)}`}
              alt={item.altText || `Property photograph ${index + 1}`}
              width={600}
              height={400}
              className={styles.mediaPhoto}
              onError={() =>
                setProblem(
                  "A placed photograph could not be loaded. Check its availability before saving this report.",
                )
              }
            />
            <TextField
              label={`Photograph ${index + 1} description (alt text)`}
              value={item.altText}
              maxLength={300}
              onChange={(event) =>
                change(
                  media.map((placement) =>
                    placement.mediaRef === item.mediaRef
                      ? { ...placement, altText: event.currentTarget.value }
                      : placement,
                  ),
                )
              }
            />
            <div className={styles.actions}>
              <Button
                type="button"
                variant="secondary"
                disabled={disabled || index === 0}
                onClick={() => move(index, 0)}
              >
                Use photograph {index + 1} as hero
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={disabled || index === 0}
                onClick={() => move(index, index - 1)}
              >
                Move photograph {index + 1} earlier
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={disabled || index === media.length - 1}
                onClick={() => move(index, index + 1)}
              >
                Move photograph {index + 1} later
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={disabled}
                onClick={() =>
                  change(media.filter((placement) => placement.mediaRef !== item.mediaRef))
                }
              >
                Remove photograph {index + 1}
              </Button>
            </div>
          </div>
        ))}
        <p>
          Removing a photograph only removes its placement from this draft. It does not revoke
          rights or change earlier saved reports.
        </p>
      </fieldset>
    </Surface>
  );
}
