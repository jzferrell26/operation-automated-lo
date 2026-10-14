import { spawn } from "node:child_process";
import { request } from "node:http";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import assert from "node:assert/strict";

// Manual isolated production-build regression probe. No DB, provider, signing or customer keys.
// Native HTTP is deliberate: Node 24 fetch silently replaces a caller-supplied Host header.
const environment = {};
for (const name of [
  "PATH",
  "SystemRoot",
  "SYSTEMROOT",
  "TEMP",
  "TMP",
  "LOCALAPPDATA",
  "APPDATA",
  "USERPROFILE",
]) {
  if (process.env[name] !== undefined) environment[name] = process.env[name];
}
Object.assign(environment, {
  NODE_ENV: "production",
  OALO_ENVIRONMENT: "local",
  OALO_APP_URL: "https://127.0.0.1:3443",
  OALO_LOCAL_CAMPAIGN_STORE: resolve("tmp/domain-platform-transport-probe-store.json"),
});
function asset(host, proto) {
  return new Promise((resolveResult, reject) => {
    const headers = { host, ...(proto ? { "x-forwarded-proto": proto } : {}) };
    const req = request(
      {
        hostname: "127.0.0.1",
        port: 3100,
        path: "/funnel-media/homebuyers.webp",
        method: "GET",
        headers,
      },
      (response) => {
        let bytes = 0;
        response.on("data", (part) => {
          bytes += part.length;
          if (bytes > 2 * 1024 * 1024)
            response.destroy(new Error("Probe asset exceeded its byte bound"));
        });
        response.on("error", reject);
        response.on("end", () =>
          resolveResult({
            sentHost: host,
            status: response.statusCode,
            hasCsp: typeof response.headers["content-security-policy"] === "string",
            contentType: response.headers["content-type"] ?? null,
            bytes,
          }),
        );
      },
    );
    req.setTimeout(5000, () => req.destroy(new Error("Local transport probe timed out")));
    req.on("error", reject);
    req.end();
  });
}
const server = spawn(
  process.execPath,
  [
    resolve("apps/web/node_modules/next/dist/bin/next"),
    "start",
    "--hostname",
    "127.0.0.1",
    "--port",
    "3100",
  ],
  {
    cwd: resolve("apps/web"),
    env: environment,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  },
);
// Confirm this owned child is ready, rather than accepting a different listener on its port.
// Keep only a small diagnostic suffix and never print environment or server responses.
let ready = false,
  diagnosticSuffix = "";
server.stdout.on("data", (part) => {
  diagnosticSuffix = (diagnosticSuffix + String(part)).slice(-512);
  if (diagnosticSuffix.includes("Ready in")) ready = true;
});
server.stderr.resume();
let exited = false,
  spawnError;
server.on("exit", () => {
  exited = true;
});
server.on("error", (error) => {
  spawnError = error;
  exited = true;
});
let probeError, cleanupError;
try {
  for (let attempt = 0; attempt < 60 && !exited && !ready; attempt++) await delay(250);
  if (spawnError) throw spawnError;
  assert.equal(ready && !exited, true, "owned isolated loopback server must start");
  const internal = await asset("127.0.0.1:3100");
  console.log(JSON.stringify({ name: "unqualified internal transport", ...internal }));
  assert.equal(internal.status, 404);
  assert.equal(internal.bytes, 0);
  assert.equal(internal.hasCsp, false);
  const gateway = await asset("127.0.0.1:3443", "https");
  console.log(JSON.stringify({ name: "actual TLS gateway Host", ...gateway }));
  assert.equal(gateway.status, 200);
  assert.equal(gateway.hasCsp, true);
  assert.equal(gateway.contentType, "image/webp");
  assert.ok(gateway.bytes > 0);
  const spoof = await asset("hostile.example.org", "https");
  console.log(JSON.stringify({ name: "foreign Host", ...spoof }));
  assert.equal(spoof.status, 404);
  assert.equal(spoof.bytes, 0);
} catch (error) {
  probeError = error;
} finally {
  server.kill();
  for (let attempt = 0; attempt < 40 && !exited; attempt++) await delay(50);
  if (!exited) cleanupError = new Error("Owned probe server did not stop");
}
if (probeError && cleanupError)
  throw new AggregateError([probeError, cleanupError], "Transport probe and cleanup failed");
if (probeError) throw probeError;
if (cleanupError) throw cleanupError;
