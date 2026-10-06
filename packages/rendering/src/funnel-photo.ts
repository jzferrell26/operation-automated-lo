import sharp from "sharp";

/** Decode before use, reject active/multiframe formats, re-encode pixels without EXIF/GPS. */
export async function normalizeFunnelPhoto(bytes: Uint8Array): Promise<Uint8Array> {
  if (bytes.byteLength < 12 || bytes.byteLength > 3_000_000)
    throw new Error("Unsupported photo size");
  const decoder = sharp(bytes, {
    limitInputPixels: 16_000_000,
    failOn: "warning",
    animated: false,
  });
  const meta = await decoder.metadata();
  if (!["jpeg", "png", "webp"].includes(meta.format ?? "") || (meta.pages ?? 1) > 1)
    throw new Error("Unsupported photo format");
  // A saved, metadata-free WebP is decoded again but not recompressed on every text edit.
  // This keeps uploaded pixels stable without trusting MIME labels or a browser upload flag.
  if (
    meta.format === "webp" &&
    bytes.byteLength <= 295_000 &&
    (meta.width ?? 1401) <= 1400 &&
    (meta.height ?? 1401) <= 1400 &&
    !meta.exif &&
    !meta.xmp &&
    !meta.icc &&
    !meta.iptc &&
    !meta.orientation
  ) {
    await decoder.clone().raw().toBuffer();
    return bytes;
  }
  const output = await decoder
    .rotate()
    .resize({ width: 1400, height: 1400, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 75 })
    .toBuffer();
  if (output.byteLength > 295_000) throw new Error("Photo remains too large");
  return output;
}
