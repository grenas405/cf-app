/**
 * `GET /api`: the API describes itself. Routes, their input contracts (zod
 * schemas converted to JSON Schema) and the security policy are all derived
 * from the same values the code runs on, so the description cannot go stale.
 *
 * @module
 */

import { z } from "@zod/zod";
import { json } from "../http/responses.ts";
import { type HeaderRule, SECURITY_HEADERS } from "../security/policy.ts";
import type { Route } from "../types.ts";

/** A route, as published to clients. */
export interface RouteDoc {
  readonly method: string;
  readonly path: string;
  readonly summary: string;
  readonly input?: unknown;
}

/** The discovery document. */
export interface Discovery {
  readonly name: string;
  readonly routes: readonly RouteDoc[];
  readonly security: readonly HeaderRule[];
}

/** Describe one route, converting its zod schema to JSON Schema. */
export function describeRoute(route: Route): RouteDoc {
  const { method, path, summary } = route;
  return route.input === undefined
    ? { method, path, summary }
    : { method, path, summary, input: z.toJSONSchema(route.input) };
}

/** Build the discovery document for a set of routes. */
export function describeApi(routes: readonly Route[]): Discovery {
  return {
    name: "OKC Edge API",
    routes: routes.map(describeRoute),
    security: SECURITY_HEADERS,
  };
}

/** The `GET /api` route, describing itself alongside `routes`. */
export function discoveryRoute(routes: readonly Route[]): Route {
  const self: Route = {
    method: "GET",
    path: "/api",
    summary:
      "This document: every route, its input schema and the security policy.",
    handle: () => json(describeApi([self, ...routes])),
  };
  return self;
}
