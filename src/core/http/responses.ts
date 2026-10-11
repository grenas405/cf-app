/**
 * Response builders. Each one is a pure function from data to a `Response`,
 * so every endpoint answers in the same shapes: JSON for success and
 * RFC 9457 "problem details" for failure.
 *
 * @module
 */

import { STATUS_CODE, STATUS_TEXT, type StatusCode } from "@std/http/status";

/** One reason a request body was rejected. */
export interface FieldError {
  readonly path: string;
  readonly message: string;
}

/** RFC 9457 problem details. Never includes stack traces or internals. */
export interface Problem {
  readonly type: "about:blank";
  readonly title: string;
  readonly status: number;
  readonly detail?: string;
  readonly errors?: readonly FieldError[];
}

/** API answers are per-request facts: never cache them anywhere. */
function apiHeaders(contentType: string, extra?: HeadersInit): Headers {
  const headers = new Headers(extra);
  headers.set("Content-Type", contentType);
  headers.set("Cache-Control", "no-store");
  return headers;
}

/** A JSON response. */
export function json(
  body: unknown,
  status: StatusCode = STATUS_CODE.OK,
  extra?: HeadersInit,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: apiHeaders("application/json; charset=utf-8", extra),
  });
}

/** Build the problem object itself (useful on its own in tests and docs). */
export function problemBody(
  status: StatusCode,
  detail?: string,
  errors?: readonly FieldError[],
): Problem {
  return {
    type: "about:blank",
    title: STATUS_TEXT[status],
    status,
    ...(detail === undefined ? {} : { detail }),
    ...(errors === undefined ? {} : { errors }),
  };
}

/** An `application/problem+json` error response. */
export function problem(
  status: StatusCode,
  detail?: string,
  errors?: readonly FieldError[],
  extra?: HeadersInit,
): Response {
  return new Response(JSON.stringify(problemBody(status, detail, errors)), {
    status,
    headers: apiHeaders("application/problem+json; charset=utf-8", extra),
  });
}

/** 405 with the `Allow` header listing what would have worked. */
export function methodNotAllowed(allow: readonly string[]): Response {
  return problem(
    STATUS_CODE.MethodNotAllowed,
    `Use ${allow.join(" or ")} for this resource.`,
    undefined,
    { Allow: allow.join(", ") },
  );
}

/** Same status and headers, no body: how HEAD answers a GET route. */
export function withoutBody(response: Response): Response {
  return new Response(null, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}
