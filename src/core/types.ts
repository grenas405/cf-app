/**
 * The vocabulary of the core. Everything is expressed with Web Platform
 * primitives (`Request`, `Response`), which is what lets the same core run on
 * Cloudflare Workers, Deno, Bun or Node without a single change.
 *
 * @module
 */

import type { z } from "@zod/zod";

/** The universal shape of an HTTP server: a request in, a response out. */
export type Handler = (request: Request) => Promise<Response>;

/** Where and how a request reached us. Adapters fill in what they know. */
export interface EdgeInfo {
  /** Which adapter is running the core, e.g. `cloudflare-workers`. */
  readonly runtime: string;
  /** Data center that answered, as an IATA airport code, e.g. `OKC`. */
  readonly colo?: string | undefined;
  /** The visitor's approximate location, from IP geolocation. */
  readonly visitorCity?: string | undefined;
  readonly visitorRegion?: string | undefined;
  readonly visitorCountry?: string | undefined;
  readonly httpProtocol?: string | undefined;
  readonly tlsVersion?: string | undefined;
}

/** Facts about a single request, supplied by the adapter. */
export interface RequestContext {
  readonly edge: EdgeInfo;
  /** Milliseconds since the epoch, read from the adapter's clock. */
  readonly receivedAt: number;
}

/** A structured log line. Values are primitives so they serialize safely. */
export interface LogEvent {
  readonly level: "info" | "warn" | "error";
  readonly event: string;
  readonly detail?: Readonly<Record<string, string | number | boolean>>;
}

/**
 * Ports: the only doors between the core and the outside world.
 * The core declares what it needs; each adapter decides how to provide it.
 */
export interface Ports {
  /** Serve a file from the static asset directory. */
  readonly serveStatic: Handler;
  /** Emit a structured log line. */
  readonly log: (event: LogEvent) => void;
}

/** A route's request handler. */
export type RouteHandler = (
  request: Request,
  context: RequestContext,
) => Response | Promise<Response>;

/** One API endpoint, described as plain data. */
export interface Route {
  readonly method: "GET" | "POST";
  readonly path: `/api${string}`;
  readonly summary: string;
  /** The schema the request body must satisfy, published at `GET /api`. */
  readonly input?: z.ZodType;
  readonly handle: RouteHandler;
}

/** The core, fully assembled: what every adapter calls. */
export type App = (
  request: Request,
  context: RequestContext,
) => Promise<Response>;
