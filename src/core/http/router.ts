/**
 * Routing as a lookup in a table of plain data. No regexes, no wildcards,
 * no registration side effects: a path either matches exactly or it doesn't.
 *
 * @module
 */

import type { Route } from "../types.ts";

/** The three things a route lookup can tell you. */
export type Match =
  | { readonly kind: "found"; readonly route: Route }
  | { readonly kind: "method-not-allowed"; readonly allow: readonly string[] }
  | { readonly kind: "not-found" };

/** Does this path belong to the API rather than the static site? */
export function isApiPath(pathname: string): boolean {
  return pathname === "/api" || pathname.startsWith("/api/");
}

/** Find the route for a method and path. `HEAD` falls back to `GET`. */
export function matchRoute(
  routes: readonly Route[],
  method: string,
  pathname: string,
): Match {
  const samePath = routes.filter((route) => route.path === pathname);
  if (samePath.length === 0) return { kind: "not-found" };

  const wanted = method === "HEAD" ? "GET" : method;
  const route = samePath.find((candidate) => candidate.method === wanted);
  if (route !== undefined) return { kind: "found", route };

  return {
    kind: "method-not-allowed",
    allow: samePath.map((candidate) => candidate.method),
  };
}
