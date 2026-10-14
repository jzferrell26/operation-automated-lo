import { createHash, randomUUID } from "node:crypto";
import sharp from "sharp";
import { expect, test } from "@playwright/test";
import { z } from "zod";

const Uploaded = z
  .object({
    mediaRef: z.string().regex(/^media_[a-f0-9]{32}$/u),
    sha256: z.string().regex(/^[a-f0-9]{64}$/u),
    mimeType: z.enum(["image/jpeg", "image/png"]),
    byteSize: z.number().int().positive(),
    width: z.literal(900),
    height: z.literal(600),
    normalizationVersion: z.literal("1.0.0"),
    metadataRetained: z.literal(false),
    rights: z
      .object({
        schemaVersion: z.literal(1),
        basis: z.literal("owned"),
        confirmed: z.literal(true),
        attestedBy: z.string(),
        attestedAt: z.iso.datetime({ offset: true }),
        scope: z.literal("tenant-private-financing"),
      })
      .strict(),
  })
  .strict();

for (const format of ["jpeg", "png"] as const) {
  test(`production route accepts and privately resolves actual ${format} bytes`, async ({
    request,
  }) => {
    const bytes = await sharp({
      create: { width: 900, height: 600, channels: 3, background: { r: 73, g: 132, b: 106 } },
    })
      [format]()
      .toBuffer();
    const url = "/api/campaigns/property/financing/media";
    const headers = {
      "Content-Type": `image/${format}`,
      "X-OALO-Media-Request-Id": randomUUID(),
      "X-OALO-Media-Rights-Basis": "owned",
      "X-OALO-Media-Rights-Confirmed": "true",
    };
    const first = await request.post(url, { headers, data: bytes });
    expect(first.status(), await first.text()).toBe(201);
    const uploaded = Uploaded.parse(await first.json());
    expect(first.headers()["cache-control"]).toContain("no-store");
    const replay = await request.post(url, { headers, data: bytes });
    expect(replay.status()).toBe(200);
    expect(await replay.json()).toEqual(uploaded);
    const image = await request.get(`${url}/${uploaded.mediaRef}`);
    expect(image.status()).toBe(200);
    expect(image.headers()["content-type"]).toBe(uploaded.mimeType);
    const normalized = await image.body();
    expect(normalized.length).toBe(uploaded.byteSize);
    expect(createHash("sha256").update(normalized).digest("hex")).toBe(uploaded.sha256);
    expect((await sharp(normalized).metadata()).width).toBe(900);
    expect(
      (
        await request.post(url, {
          headers: { ...headers, "X-OALO-Media-Rights-Basis": "permission" },
          data: bytes,
        })
      ).status(),
    ).toBe(409);
    const revoked = await request.post(`${url}/${uploaded.mediaRef}/revoke`);
    expect(revoked.status()).toBe(200);
    const retryRevoke = await request.post(`${url}/${uploaded.mediaRef}/revoke`);
    expect(await retryRevoke.json()).toEqual(await revoked.json());
    expect((await request.get(`${url}/${uploaded.mediaRef}`)).status()).toBe(410);
  });
}
