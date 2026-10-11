/**
 * The security policy, written once as data (OWASP Secure Headers Project).
 *
 * This single list is applied to API responses by the core at runtime and
 * compiled into Cloudflare's `_headers` file at build time, so the API and
 * the static site can never drift apart.
 *
 * @module
 */

/** One response header and the reason it exists. */
export interface HeaderRule {
  readonly name: string;
  readonly value: string;
  readonly why: string;
}

/** Content-Security-Policy directives. Nothing is allowed unless listed. */
export const CONTENT_SECURITY_POLICY: Readonly<
  Record<string, readonly string[]>
> = {
  "default-src": ["'none'"],
  "script-src": ["'self'"],
  "style-src": ["'self'"],
  "img-src": ["'self'"],
  "font-src": ["'self'"],
  "connect-src": ["'self'"],
  "manifest-src": ["'self'"],
  "base-uri": ["'none'"],
  "form-action": ["'self'"],
  "frame-ancestors": ["'none'"],
  "object-src": ["'none'"],
  "require-trusted-types-for": ["'script'"],
  "trusted-types": ["'none'"],
};

/** Turn the directive table into a header value. */
export function serializeCsp(
  directives: Readonly<Record<string, readonly string[]>>,
): string {
  return Object.entries(directives)
    .map(([name, sources]) => [name, ...sources].join(" "))
    .join("; ");
}

/** Every header we send on every response. */
export const SECURITY_HEADERS: readonly HeaderRule[] = [
  {
    name: "Content-Security-Policy",
    value: serializeCsp(CONTENT_SECURITY_POLICY),
    why:
      "Only code and styles from this origin may run. No inline scripts, no third-party trackers, and DOM injection sinks are locked by Trusted Types.",
  },
  {
    name: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
    why:
      "Browsers remember to use HTTPS for two years, so nobody on café Wi-Fi can downgrade the connection.",
  },
  {
    name: "X-Content-Type-Options",
    value: "nosniff",
    why:
      "Files are treated as exactly the type we declare, never guessed into something executable.",
  },
  {
    name: "X-Frame-Options",
    value: "DENY",
    why:
      "No other site can embed this page in a frame to trick visitors into clicking (clickjacking).",
  },
  {
    name: "Referrer-Policy",
    value: "no-referrer",
    why: "Visitors' browsing paths are not leaked to any other site.",
  },
  {
    name: "Permissions-Policy",
    value:
      "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()",
    why:
      "Powerful browser features this site never needs are switched off, even for injected code.",
  },
  {
    name: "Cross-Origin-Opener-Policy",
    value: "same-origin",
    why: "Pop-ups from other sites cannot reach into this window.",
  },
  {
    name: "Cross-Origin-Resource-Policy",
    value: "same-origin",
    why: "Other sites cannot hotlink or side-channel-read our responses.",
  },
  {
    name: "Cross-Origin-Embedder-Policy",
    value: "require-corp",
    why:
      "Only resources that opt in can load here, which isolates this page from other origins.",
  },
];
