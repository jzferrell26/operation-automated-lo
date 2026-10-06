import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { normalizeFunnelPhoto } from "@oalo/rendering";

describe("funnel photos contain validated pixels, not metadata or executable formats", () => {
  it("strips metadata, orients and bounds a real raster", async () => {
    const source = await sharp({
      create: { width: 2100, height: 1100, channels: 3, background: "#234f67" },
    })
      .withMetadata({ orientation: 6 })
      .jpeg()
      .toBuffer();
    const result = await normalizeFunnelPhoto(source);
    const meta = await sharp(result).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.exif).toBeUndefined();
    expect(meta.icc).toBeUndefined();
    expect(meta.orientation).toBeUndefined();
    expect(meta.width).toBeLessThanOrEqual(1400);
    expect(meta.height).toBeLessThanOrEqual(1400);
    expect(result.byteLength).toBeLessThanOrEqual(295000);
  });
  it("keeps already-normalized bytes identical through future text-only saves", async () => {
    const source = await sharp({
      create: { width: 600, height: 800, channels: 3, background: "#a38762" },
    })
      .png()
      .toBuffer();
    const normalized = await normalizeFunnelPhoto(source);
    const repeated = await normalizeFunnelPhoto(normalized);
    expect(Buffer.from(repeated).equals(Buffer.from(normalized))).toBe(true);
  });
  it("refuses SVG, oversized bodies and decompression-sized images", async () => {
    await expect(
      normalizeFunnelPhoto(
        Buffer.from(
          '<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30"><rect width="30" height="30"/></svg>',
        ),
      ),
    ).rejects.toThrow();
    await expect(normalizeFunnelPhoto(new Uint8Array(3000001))).rejects.toThrow();
    const bomb = await sharp({
      create: { width: 4100, height: 4100, channels: 3, background: "#fff" },
    })
      .png()
      .toBuffer();
    await expect(normalizeFunnelPhoto(bomb)).rejects.toThrow();
  });
});
