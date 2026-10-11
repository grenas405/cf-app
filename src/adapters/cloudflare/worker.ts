/**
 * The Cloudflare Workers adapter: the first (and production) home of the
 * core. It does three things and nothing else:
 *
 *   1. maps Worker bindings (`env.ASSETS`) onto the core's ports,
 *   2. reads platform facts (`request.cf`, the clock) into a context,
 *   3. hands the request to the core.
 *
 * Static files never reach this code: `run_worker_first: ["/api", "/api/*"]` in
 * wrangler.jsonc lets Cloudflare serve them directly from its network.
 *
 * @module
 */

import { createApp, type LogEvent, type Ports } from "../../core/mod.ts";
import { readEdgeInfo } from "./edge.ts";

/** The bindings declared in wrangler.jsonc. */
export interface Env {
  readonly ASSETS: {
    readonly fetch: (request: Request) => Promise<Response>;
  };
}

/** Write a log event as one JSON line, which Workers Logs indexes. */
export function logToWorkersLogs(event: LogEvent): void {
  const line = JSON.stringify(event);
  // deno-lint-ignore no-console
  if (event.level === "error") console.error(line);
  // deno-lint-ignore no-console
  else console.log(line);
}

/** Fill the core's ports with Cloudflare bindings. */
export function portsFrom(env: Env): Ports {
  return {
    serveStatic: (request) => env.ASSETS.fetch(request),
    log: logToWorkersLogs,
  };
}

/** The Worker entry point (ES module syntax). */
export default {
  fetch(request: Request, env: Env): Promise<Response> {
    const app = createApp(portsFrom(env));
    return app(request, {
      edge: readEdgeInfo(request),
      receivedAt: Date.now(),
    });
  },
};
