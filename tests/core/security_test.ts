import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import {
  renderHeadersFile,
  withSecurityHeaders,
} from "../../src/core/security/headers.ts";
import {
  CONTENT_SECURITY_POLICY,
  SECURITY_HEADERS,
  serializeCsp,
} from "../../src/core/security/policy.ts";

Deno.test("CSP denies by default and enforces Trusted Types", () => {
  const csp = serializeCsp(CONTENT_SECURITY_POLICY);
  assert(csp.startsWith("default-src 'none'"));
  assertStringIncludes(csp, "script-src 'self'");
  assertStringIncludes(csp, "frame-ancestors 'none'");
  assertStringIncludes(csp, "require-trusted-types-for 'script'");
  assertEquals(csp.includes("unsafe-inline"), false);
  assertEquals(csp.includes("unsafe-eval"), false);
});

Deno.test("serializeCsp() joins directives and sources", () => {
  assertEquals(serializeCsp({ "a": ["x", "y"], "b": [] }), "a x y; b");
});

Deno.test("withSecurityHeaders() sets every rule and keeps the response", async () => {
  const original = new Response("body", {
    status: 418,
    headers: { "X-Keep": "yes" },
  });
  const secured = withSecurityHeaders(original);
  assertEquals(secured.status, 418);
  assertEquals(secured.headers.get("x-keep"), "yes");
  assertEquals(await secured.text(), "body");
  for (const rule of SECURITY_HEADERS) {
    assertEquals(secured.headers.get(rule.name), rule.value);
  }
});

Deno.test("withSecurityHeaders() overrides weaker values", () => {
  const weak = new Response(null, {
    headers: { "X-Frame-Options": "ALLOWALL" },
  });
  assertEquals(
    withSecurityHeaders(weak).headers.get("x-frame-options"),
    "DENY",
  );
});

Deno.test("renderHeadersFile() writes Cloudflare's _headers format", () => {
  const file = renderHeadersFile([{ name: "A", value: "1", why: "" }, {
    name: "B",
    value: "2",
    why: "",
  }]);
  assertEquals(file, "/*\n  A: 1\n  B: 2\n");
  assertEquals(
    renderHeadersFile().split("\n").length,
    SECURITY_HEADERS.length + 2,
  );
});

Deno.test("every header rule explains itself", () => {
  for (const rule of SECURITY_HEADERS) assert(rule.why.length > 20, rule.name);
});
