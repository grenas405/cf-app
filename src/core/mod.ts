/**
 * The public surface of the core. Adapters import from here and nowhere else,
 * which keeps the boundary small enough to read in one glance.
 *
 * @module
 */

export { createApp, ROUTES } from "./app.ts";
export { err, ok, type Result } from "./result.ts";
export { renderHeadersFile } from "./security/headers.ts";
export { type HeaderRule, SECURITY_HEADERS } from "./security/policy.ts";
export type {
  App,
  EdgeInfo,
  Handler,
  LogEvent,
  Ports,
  RequestContext,
} from "./types.ts";
