const INTERNAL_PATH = /^\/(?!\/)/u;

export async function postInternalJson(path: string, body: unknown): Promise<Response> {
  if (!INTERNAL_PATH.test(path)) {
    throw new Error("Internal API requests must use an application-relative path");
  }

  const request = globalThis["fetch"];
  return request(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}
