import { assert, assertEquals, assertFalse } from "@std/assert";
import {
  concatBytes,
  decodeUtf8,
  parseJson,
  readTextWithin,
} from "../../src/core/http/body.ts";
import {
  declaredLengthWithin,
  isJsonContentType,
  isReadMethod,
  isSameOrigin,
} from "../../src/core/http/guards.ts";
import {
  json,
  methodNotAllowed,
  problem,
  problemBody,
  withoutBody,
} from "../../src/core/http/responses.ts";
import { isApiPath, matchRoute } from "../../src/core/http/router.ts";
import type { Route } from "../../src/core/types.ts";

const url = "https://okc.example/api/estimate";

Deno.test("json() sets content type and forbids caching", async () => {
  const response = json({ a: 1 }, 201);
  assertEquals(response.status, 201);
  assertEquals(
    response.headers.get("content-type"),
    "application/json; charset=utf-8",
  );
  assertEquals(response.headers.get("cache-control"), "no-store");
  assertEquals(await response.json(), { a: 1 });
});

Deno.test("problem() follows RFC 9457 and omits empty fields", async () => {
  const response = problem(404, "Nope.");
  assertEquals(
    response.headers.get("content-type"),
    "application/problem+json; charset=utf-8",
  );
  assertEquals(await response.json(), {
    type: "about:blank",
    title: "Not Found",
    status: 404,
    detail: "Nope.",
  });
  assertEquals(problemBody(400), {
    type: "about:blank",
    title: "Bad Request",
    status: 400,
  });
});

Deno.test("methodNotAllowed() advertises the allowed methods", () => {
  const response = methodNotAllowed(["GET", "HEAD"]);
  assertEquals(response.status, 405);
  assertEquals(response.headers.get("allow"), "GET, HEAD");
});

Deno.test("withoutBody() keeps status and headers", () => {
  const response = withoutBody(json({ big: "body" }));
  assertEquals(response.status, 200);
  assertEquals(response.body, null);
  assertEquals(response.headers.get("cache-control"), "no-store");
});

const routes: Route[] = [
  {
    method: "GET",
    path: "/api/health",
    summary: "",
    handle: () => new Response("ok"),
  },
  {
    method: "POST",
    path: "/api/estimate",
    summary: "",
    handle: () => new Response("ok"),
  },
];

Deno.test("matchRoute() finds, rejects methods and misses", () => {
  assertEquals(matchRoute(routes, "GET", "/api/health").kind, "found");
  assertEquals(matchRoute(routes, "HEAD", "/api/health").kind, "found");
  assertEquals(matchRoute(routes, "GET", "/api/estimate"), {
    kind: "method-not-allowed",
    allow: ["POST"],
  });
  assertEquals(matchRoute(routes, "GET", "/api/health/").kind, "not-found");
});

Deno.test("isApiPath() only matches the /api tree", () => {
  assert(isApiPath("/api"));
  assert(isApiPath("/api/edge"));
  assertFalse(isApiPath("/apis"));
  assertFalse(isApiPath("/"));
});

Deno.test("isSameOrigin() uses Fetch Metadata, then Origin", () => {
  const req = (headers: HeadersInit): Request =>
    new Request(url, { method: "POST", headers });
  assert(isSameOrigin(req({})));
  assert(isSameOrigin(req({ "Sec-Fetch-Site": "same-origin" })));
  assert(isSameOrigin(req({ Origin: "https://okc.example" })));
  assertFalse(isSameOrigin(req({ "Sec-Fetch-Site": "cross-site" })));
  assertFalse(isSameOrigin(req({ "Sec-Fetch-Site": "same-site" })));
  assertFalse(isSameOrigin(req({ Origin: "https://evil.example" })));
});

Deno.test("isJsonContentType() ignores parameters and case", () => {
  const req = (type: string): Request =>
    new Request(url, { method: "POST", headers: { "Content-Type": type } });
  assert(isJsonContentType(req("application/json")));
  assert(isJsonContentType(req("Application/JSON; charset=utf-8")));
  assertFalse(isJsonContentType(req("text/plain")));
  assertFalse(isJsonContentType(new Request(url, { method: "POST" })));
});

Deno.test("declaredLengthWithin() rejects big or bogus lengths", () => {
  const req = (length?: string): Request =>
    new Request(url, {
      method: "POST",
      headers: length === undefined ? {} : { "Content-Length": length },
    });
  assert(declaredLengthWithin(req(), 10));
  assert(declaredLengthWithin(req("10"), 10));
  assertFalse(declaredLengthWithin(req("11"), 10));
  assertFalse(declaredLengthWithin(req("-1"), 10));
  assertFalse(declaredLengthWithin(req("ten"), 10));
});

Deno.test("isReadMethod() allows only GET and HEAD", () => {
  assert(isReadMethod("GET"));
  assert(isReadMethod("HEAD"));
  assertFalse(isReadMethod("POST"));
});

Deno.test("readTextWithin() stops at the limit, even when streaming", async () => {
  const small = new Request(url, { method: "POST", body: "hello" });
  assertEquals(await readTextWithin(small, 5), { ok: true, value: "hello" });

  const stream = new ReadableStream<Uint8Array>({
    pull(controller): void {
      controller.enqueue(new Uint8Array(1024));
    },
  });
  const endless = new Request(
    url,
    { method: "POST", body: stream, duplex: "half" } as RequestInit,
  );
  assertEquals(await readTextWithin(endless, 4096), {
    ok: false,
    error: "too-large",
  });
});

Deno.test("decodeUtf8() refuses malformed bytes", () => {
  assertEquals(decodeUtf8(new Uint8Array([0xff, 0xfe])), {
    ok: false,
    error: "unreadable",
  });
  assertEquals(decodeUtf8(new TextEncoder().encode("Tulsa")), {
    ok: true,
    value: "Tulsa",
  });
});

Deno.test("concatBytes() and parseJson() are total", () => {
  assertEquals(
    concatBytes([new Uint8Array([1]), new Uint8Array([2, 3])]),
    new Uint8Array([1, 2, 3]),
  );
  assertEquals(parseJson('{"a":1}'), { ok: true, value: { a: 1 } });
  assertEquals(parseJson("{"), { ok: false, error: "not-json" });
});
