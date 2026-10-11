/**
 * Two ways to deliver one policy: stamp it onto a `Response` at runtime, or
 * render it as a Cloudflare `_headers` file at build time.
 *
 * @module
 */

import { type HeaderRule, SECURITY_HEADERS } from "./policy.ts";

/** A copy of `response` with every security header set. */
export function withSecurityHeaders(
  response: Response,
  rules: readonly HeaderRule[] = SECURITY_HEADERS,
): Response {
  const headers = new Headers(response.headers);
  for (const rule of rules) headers.set(rule.name, rule.value);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/** Render rules in Cloudflare's `_headers` format for a URL pattern. */
export function renderHeadersFile(
  rules: readonly HeaderRule[] = SECURITY_HEADERS,
  pattern = "/*",
): string {
  const lines = rules.map((rule) => `  ${rule.name}: ${rule.value}`);
  return [pattern, ...lines].join("\n") + "\n";
}
