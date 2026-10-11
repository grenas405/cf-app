/**
 * `GET /api/health`: the smallest possible proof that the core is alive,
 * and which adapter is hosting it.
 *
 * @module
 */

import { json } from "../http/responses.ts";
import type { Route } from "../types.ts";

/** The health response body. */
export interface Health {
  readonly status: "ok";
  readonly runtime: string;
}

export const healthRoute: Route = {
  method: "GET",
  path: "/api/health",
  summary: "Liveness check that names the runtime hosting the core.",
  handle: (_request, context) => {
    const body: Health = { status: "ok", runtime: context.edge.runtime };
    return json(body);
  },
};
