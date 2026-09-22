import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { request as httpRequest } from "node:http";
import { createServer } from "node:https";

/**
 * PRD-006c D9. A dependency-free TLS terminator for the review browser run.
 *
 * Why it exists: the runtime composition requires `OALO_APP_URL` and every allowed origin to be
 * `https:`, the browser mutation gate compares the request's `origin` and `host` to them, and the
 * session cookie is `__Host-` prefixed and therefore `Secure`. A plain-http local server cannot
 * exercise sign-in, a campaign write, or an approval under those rules. Rather than weakening any
 * of the three, the gate gives the browser a genuinely secure context on the loopback interface.
 *
 * What it is allowed to do: accept TLS on one port and forward the bytes to one plain-http port on
 * `127.0.0.1`. It rewrites nothing except the connection itself. The `host` header is replaced with
 * the terminator's own authority, because that is the authority the browser asked for and the one
 * the mutation gate must see; `x-forwarded-proto` states the scheme for anything that wants it.
 *
 * It uses `node:https` and `node:http` and nothing else. A proxy dependency would be a runtime
 * dependency in the lockfile for a thing that only ever runs inside a test gate.
 *
 * It is never a production component. The certificate is self-signed, generated per run into a
 * temporary directory, and never committed.
 *
 * Usage:
 *   node tooling/scripts/browser/https-proxy.mjs \
 *     --listen-port 3443 --target-port 3100 --cert <path> --key <path>
 */

const HOST = "127.0.0.1";
/** A ceiling, so a hung upstream fails the run instead of holding the gate open. */
const UPSTREAM_TIMEOUT_MS = 120_000;

export function parseProxyArguments(argv) {
  const options = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const name = argv[index];
    const value = argv[index + 1];
    if (typeof name !== "string" || !name.startsWith("--") || value === undefined) {
      throw new Error(`Expected --name value pairs, saw ${String(name)}`);
    }
    options.set(name.slice(2), value);
  }
  const listenPort = Number.parseInt(options.get("listen-port") ?? "", 10);
  const targetPort = Number.parseInt(options.get("target-port") ?? "", 10);
  const cert = options.get("cert");
  const key = options.get("key");
  if (!Number.isInteger(listenPort) || listenPort <= 0 || listenPort > 65535) {
    throw new Error("--listen-port must be a TCP port");
  }
  if (!Number.isInteger(targetPort) || targetPort <= 0 || targetPort > 65535) {
    throw new Error("--target-port must be a TCP port");
  }
  if (cert === undefined || key === undefined) {
    throw new Error("--cert and --key are required");
  }
  return Object.freeze({ cert, key, listenPort, targetPort });
}

export async function startHttpsTerminator(options) {
  const [cert, key] = await Promise.all([
    readFile(options.cert, "utf8"),
    readFile(options.key, "utf8"),
  ]);

  const server = createServer({ cert, key }, (incoming, outgoing) => {
    const authority = `${HOST}:${String(options.listenPort)}`;
    const upstream = httpRequest(
      {
        host: HOST,
        port: options.targetPort,
        method: incoming.method,
        path: incoming.url,
        headers: {
          ...incoming.headers,
          host: authority,
          "x-forwarded-proto": "https",
          "x-forwarded-host": authority,
        },
      },
      (response) => {
        outgoing.writeHead(response.statusCode ?? 502, response.headers);
        response.pipe(outgoing);
      },
    );
    upstream.setTimeout(UPSTREAM_TIMEOUT_MS, () => {
      upstream.destroy(new Error("The upstream did not answer in time"));
    });
    upstream.on("error", (error) => {
      if (!outgoing.headersSent) outgoing.writeHead(502, { "content-type": "text/plain" });
      outgoing.end(`The review server did not answer: ${error.message}\n`);
    });
    incoming.pipe(upstream);
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(options.listenPort, HOST, () => {
      server.off("error", reject);
      resolve(undefined);
    });
  });
  return server;
}

const invokedPath =
  process.argv[1] === undefined ? undefined : pathToFileURL(resolve(process.argv[1])).href;

if (invokedPath === import.meta.url) {
  const options = parseProxyArguments(process.argv.slice(2));
  const server = await startHttpsTerminator(options);
  process.stdout.write(
    `[https-proxy] terminating TLS on https://${HOST}:${String(options.listenPort)} for http://${HOST}:${String(options.targetPort)}\n`,
  );
  const close = () => {
    server.close(() => process.exit(0));
  };
  process.once("SIGINT", close);
  process.once("SIGTERM", close);
}
