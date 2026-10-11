/**
 * The Deno adapter: the same core, served by `Deno.serve`, with static files
 * from `@std/http/file-server`. It exists to prove the core is portable and
 * to give a zero-config local server (`deno task dev`).
 *
 * `serveDir` reads files with `Deno.stat`/`Deno.open`, which Workers do not
 * have; that is exactly why static serving is a port, not core code.
 *
 * @module
 */

import { serveDir, serveFile } from "@std/http/file-server";
import {
  createApp,
  type Handler,
  type LogEvent,
  type Ports,
} from "../../core/mod.ts";
import { parseConfig } from "./config.ts";

/** Where `deno task build` writes the site. */
export const ASSET_ROOT = "dist/public";

/** A 404 that shows the site's own not-found page. */
async function notFoundPage(request: Request, root: string): Promise<Response> {
  const plain = new Request(request.url, { method: request.method });
  const page = await serveFile(plain, `${root}/404.html`);
  return new Response(page.body, { status: 404, headers: page.headers });
}

/** Serve files from `root` with std/http/file-server. */
export function serveAssets(root: string): Handler {
  return async (request) => {
    const response = await serveDir(request, {
      fsRoot: root,
      quiet: true,
      showDirListing: false,
      showDotfiles: false,
    });
    return response.status === 404 ? notFoundPage(request, root) : response;
  };
}

/** Write a log event as one JSON line on stderr. */
export function logToStderr(event: LogEvent): void {
  // deno-lint-ignore no-console
  console.error(JSON.stringify(event));
}

/** Fill the core's ports with Deno implementations. */
export function denoPorts(root: string): Ports {
  return { serveStatic: serveAssets(root), log: logToStderr };
}

if (import.meta.main) {
  const config = parseConfig({
    PORT: Deno.env.get("PORT"),
    HOST: Deno.env.get("HOST"),
  });
  if (!config.ok) {
    // deno-lint-ignore no-console
    console.error(config.error);
    Deno.exit(1);
  }
  const app = createApp(denoPorts(ASSET_ROOT));
  Deno.serve(
    { port: config.value.port, hostname: config.value.hostname },
    (request) =>
      app(request, { edge: { runtime: "deno" }, receivedAt: Date.now() }),
  );
}
