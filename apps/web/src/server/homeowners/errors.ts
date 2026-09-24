export class HomeownerError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "HomeownerError";
  }
}

export const HOME_REPORT_HEADERS = Object.freeze({
  "Cache-Control": "private, no-store, max-age=0",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
});

export async function readBoundedJson(
  response: Response | Request,
  maximum = 80_000,
): Promise<unknown> {
  const reader = response.body?.getReader();
  if (!reader) throw new HomeownerError("INVALID_BODY", 400, "The request could not be read.");
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      size += next.value.byteLength;
      if (size > maximum) {
        await reader.cancel();
        throw new HomeownerError("BODY_TOO_LARGE", 413, "The request is too large.");
      }
      chunks.push(next.value);
    }
    const all = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      all.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return JSON.parse(new TextDecoder().decode(all)) as unknown;
  } catch (error) {
    if (error instanceof HomeownerError) throw error;
    throw new HomeownerError(
      "INVALID_BODY",
      400,
      "The response could not be read. Please try again.",
    );
  } finally {
    reader.releaseLock();
  }
}
