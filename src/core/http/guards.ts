/**
 * Request guards: small yes/no questions asked before any work is done.
 * Each maps to an OWASP control and none of them reads the request body.
 *
 * @module
 */

/**
 * CSRF defense (OWASP CSRF Cheat Sheet): refuse writes that a browser marks as
 * coming from another site, via Fetch Metadata first and `Origin` second.
 * Non-browser clients send neither header and are allowed through.
 */
export function isSameOrigin(request: Request): boolean {
  const site = request.headers.get("Sec-Fetch-Site");
  if (site !== null && site !== "same-origin" && site !== "none") return false;

  const origin = request.headers.get("Origin");
  return origin === null || origin === new URL(request.url).origin;
}

/** Only accept bodies that declare themselves as JSON. */
export function isJsonContentType(request: Request): boolean {
  const declared = request.headers.get("Content-Type") ?? "";
  const mediaType = declared.split(";")[0] ?? "";
  return mediaType.trim().toLowerCase() === "application/json";
}

/**
 * Cheap early rejection of oversized bodies (OWASP API4: unrestricted
 * resource consumption). The body reader enforces the same limit for
 * clients that lie about, or omit, `Content-Length`.
 */
export function declaredLengthWithin(
  request: Request,
  maxBytes: number,
): boolean {
  const declared = request.headers.get("Content-Length");
  if (declared === null) return true;
  const length = Number(declared);
  return Number.isInteger(length) && length >= 0 && length <= maxBytes;
}

/** Static files are read-only. */
export function isReadMethod(method: string): boolean {
  return method === "GET" || method === "HEAD";
}
