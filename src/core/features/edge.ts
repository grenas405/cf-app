/**
 * `GET /api/edge`: tells the browser where its request was answered.
 * On Cloudflare that is a real data center; on a laptop it is localhost.
 *
 * @module
 */

import { json } from "../http/responses.ts";
import type { EdgeInfo, RequestContext, Route } from "../types.ts";

/** What the browser learns about the server that answered it. */
export interface EdgeReport extends EdgeInfo {
  readonly receivedAt: string;
}

/** Combine the adapter's facts with the time the request arrived. */
export function edgeReport(context: RequestContext): EdgeReport {
  return {
    ...context.edge,
    receivedAt: new Date(context.receivedAt).toISOString(),
  };
}

export const edgeRoute: Route = {
  method: "GET",
  path: "/api/edge",
  summary: "Reports which data center and runtime answered this request.",
  handle: (_request, context) => json(edgeReport(context)),
};
