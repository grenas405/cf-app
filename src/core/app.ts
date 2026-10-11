/**
 * The composition root of the core. It assembles small parts into one
 * function, `(request, context) => response`, and never touches the outside
 * world except through the ports an adapter passes in.
 *
 *   request -> route lookup -> feature handler | static port
 *           -> error boundary -> security headers -> response
 *
 * @module
 */

import { STATUS_CODE } from "@std/http/status";
import { blueprintRoute } from "./features/blueprint/route.ts";
import { discoveryRoute } from "./features/discovery.ts";
import { edgeRoute } from "./features/edge.ts";
import { estimateRoute } from "./features/estimate/route.ts";
import { healthRoute } from "./features/health.ts";
import { isReadMethod } from "./http/guards.ts";
import { methodNotAllowed, problem, withoutBody } from "./http/responses.ts";
import { isApiPath, matchRoute } from "./http/router.ts";
import { withSecurityHeaders } from "./security/headers.ts";
import type { App, Ports, RequestContext, Route } from "./types.ts";

/** Every feature, as a flat list. Adding a feature means adding a line. */
export const FEATURE_ROUTES: readonly Route[] = [
  healthRoute,
  edgeRoute,
  estimateRoute,
  blueprintRoute,
];

/** The full route table, including the self-describing index. */
export const ROUTES: readonly Route[] = [
  discoveryRoute(FEATURE_ROUTES),
  ...FEATURE_ROUTES,
];

/** Decide who answers: a feature, the static file port, or a problem. */
export function dispatch(
  routes: readonly Route[],
  ports: Ports,
  request: Request,
  context: RequestContext,
): Promise<Response> | Response {
  const { pathname } = new URL(request.url);

  if (!isApiPath(pathname)) {
    return isReadMethod(request.method)
      ? ports.serveStatic(request)
      : methodNotAllowed(["GET", "HEAD"]);
  }

  const match = matchRoute(routes, request.method, pathname);
  switch (match.kind) {
    case "found":
      return match.route.handle(request, context);
    case "method-not-allowed":
      return methodNotAllowed(match.allow);
    case "not-found":
      return problem(STATUS_CODE.NotFound, `No API route at ${pathname}.`);
  }
}

/** Answer a request, turning any unexpected failure into a safe 500. */
export async function respond(
  routes: readonly Route[],
  ports: Ports,
  request: Request,
  context: RequestContext,
): Promise<Response> {
  let response: Response;
  try {
    response = await dispatch(routes, ports, request, context);
  } catch (error) {
    ports.log({
      level: "error",
      event: "unhandled-error",
      detail: {
        path: new URL(request.url).pathname,
        message: error instanceof Error ? error.message : String(error),
      },
    });
    response = problem(
      STATUS_CODE.InternalServerError,
      "Something went wrong on our side.",
    );
  }
  const secured = withSecurityHeaders(response);
  return request.method === "HEAD" ? withoutBody(secured) : secured;
}

/** Assemble the app around the ports an adapter provides. */
export function createApp(
  ports: Ports,
  routes: readonly Route[] = ROUTES,
): App {
  return (request, context) => respond(routes, ports, request, context);
}
