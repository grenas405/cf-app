/**
 * The principles section as data: each OWASP control and Unix rule, what it
 * means here, and the exact files (and symbols) that apply it.
 *
 * @module
 */

/** A pointer into the codebase. */
export interface Ref {
  readonly path: string;
  readonly symbol?: string;
}

/** One principle and its evidence. */
export interface Principle {
  readonly tag: string;
  readonly title: string;
  readonly text: string;
  readonly refs: readonly Ref[];
}

export const OWASP: readonly Principle[] = [
  {
    tag: "A01:2025 Broken Access Control",
    title: "Cross-site writes are refused",
    text:
      "Fetch Metadata and Origin checks stop other sites from posting on a visitor's behalf (CSRF).",
    refs: [{ path: "src/core/http/guards.ts", symbol: "isSameOrigin" }],
  },
  {
    tag: "A02:2025 Security Misconfiguration",
    title: "One header policy, generated everywhere",
    text:
      "CSP with Trusted Types, HSTS, frame denial and isolation headers live in one table, applied by the core and compiled into Cloudflare's _headers.",
    refs: [
      { path: "src/core/security/policy.ts", symbol: "SECURITY_HEADERS" },
      { path: "src/tooling/emit_headers.ts" },
    ],
  },
  {
    tag: "A03:2025 Software Supply Chain Failures",
    title: "Two runtime dependencies, both from JSR",
    text:
      "@std/http and @zod/zod, version-locked in deno.lock. The architecture rules forbid the core from importing anything else.",
    refs: [{ path: "deno.json" }, {
      path: "src/tooling/architecture.ts",
      symbol: "CORE_PACKAGES",
    }],
  },
  {
    tag: "A05:2025 Injection",
    title: "Strict schemas, no HTML strings",
    text:
      "Every body passes a strict zod schema (unknown keys rejected). The browser builds DOM with textContent only, so no string ever becomes markup.",
    refs: [{ path: "src/core/http/json_body.ts", symbol: "readJsonBody" }, {
      path: "src/ui/dom.ts",
      symbol: "h",
    }],
  },
  {
    tag: "A09:2025 Logging & Alerting Failures",
    title: "Structured logs through a port",
    text:
      "Unexpected errors are logged as JSON lines via the log port (Workers Logs in production) with no visitor data in them.",
    refs: [{ path: "src/core/app.ts", symbol: "respond" }, {
      path: "src/adapters/cloudflare/worker.ts",
      symbol: "logToWorkersLogs",
    }],
  },
  {
    tag: "A10:2025 Mishandling of Exceptional Conditions",
    title: "Fail closed, explain safely",
    text:
      "Failures are values (Result), never surprises. Anything unexpected becomes a generic RFC 9457 problem with no stack trace.",
    refs: [{ path: "src/core/result.ts" }, {
      path: "src/core/http/responses.ts",
      symbol: "problem",
    }],
  },
  {
    tag: "API4:2023 Unrestricted Resource Consumption",
    title: "Bounded everything",
    text:
      "Bodies are capped (2 KiB for estimates) and read with a hard limit; numbers have ranges; arrays have maximum lengths.",
    refs: [{ path: "src/core/http/body.ts", symbol: "readTextWithin" }, {
      path: "src/core/features/estimate/route.ts",
    }],
  },
];

export const UNIX: readonly Principle[] = [
  {
    tag: "Modularity",
    title: "Simple parts, clean interfaces",
    text:
      "Two ports (serveStatic, log) are the whole contract between the core and any runtime.",
    refs: [{ path: "src/core/types.ts", symbol: "Ports" }],
  },
  {
    tag: "Separation",
    title: "Policy apart from mechanism",
    text:
      "The security policy is data; applying it is a separate function. The core is policy; adapters are mechanism.",
    refs: [{ path: "src/core/security/policy.ts" }, {
      path: "src/core/security/headers.ts",
      symbol: "withSecurityHeaders",
    }],
  },
  {
    tag: "Composition",
    title: "Programs that pipe",
    text:
      "Build tools print to stdout and the shell redirects them: emit_headers.ts > _headers, emit_catalog.ts > catalog.json.",
    refs: [{ path: "src/tooling/files.ts", symbol: "writeStdout" }, {
      path: "deno.json",
    }],
  },
  {
    tag: "Generation",
    title: "Programs that write programs",
    text:
      "Cloudflare's header file and this page's entire Anatomy section are generated from source, never hand-maintained.",
    refs: [{ path: "src/tooling/emit_catalog.ts", symbol: "buildCatalog" }],
  },
  {
    tag: "Transparency",
    title: "Easy to inspect",
    text:
      "GET /api describes every route, its JSON Schema and the security policy, derived from the running code.",
    refs: [{ path: "src/core/features/discovery.ts", symbol: "describeApi" }],
  },
  {
    tag: "Repair",
    title: "Fail noisily and early",
    text:
      "Bad input stops at the first failing check with a precise, field-level explanation.",
    refs: [{ path: "src/core/http/json_body.ts", symbol: "toFieldErrors" }],
  },
  {
    tag: "Silence",
    title: "Nothing to say, say nothing",
    text: "Successful requests log nothing. Only unexpected errors make noise.",
    refs: [{ path: "src/core/app.ts", symbol: "respond" }],
  },
  {
    tag: "Least surprise",
    title: "Web standards all the way down",
    text:
      "Request in, Response out, exact-match routes, standard status codes from @std/http.",
    refs: [{ path: "src/core/http/router.ts", symbol: "matchRoute" }],
  },
];
