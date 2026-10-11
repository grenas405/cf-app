import { assert, assertEquals } from "@std/assert";
import { createApp } from "../../src/core/app.ts";
import { SECURITY_HEADERS } from "../../src/core/security/policy.ts";
import type { LogEvent, Ports, RequestContext } from "../../src/core/types.ts";

const context: RequestContext = {
  edge: { runtime: "test", colo: "OKC" },
  receivedAt: 0,
};

/** Fake ports that record what the core asked of the outside world. */
function fakePorts(
  serveStatic: Ports["serveStatic"] = () =>
    Promise.resolve(new Response("static")),
): {
  ports: Ports;
  logs: LogEvent[];
  staticCalls: string[];
} {
  const logs: LogEvent[] = [];
  const staticCalls: string[] = [];
  return {
    logs,
    staticCalls,
    ports: {
      serveStatic: (request) => {
        staticCalls.push(new URL(request.url).pathname);
        return serveStatic(request);
      },
      log: (event) => logs.push(event),
    },
  };
}

const at = (path: string, init?: RequestInit): Request =>
  new Request(`https://okc.example${path}`, init);

Deno.test("static paths go out through the serveStatic port", async () => {
  const { ports, staticCalls } = fakePorts();
  const response = await createApp(ports)(at("/css/base.css"), context);
  assertEquals(await response.text(), "static");
  assertEquals(staticCalls, ["/css/base.css"]);
});

Deno.test("writes to static paths are refused without touching the port", async () => {
  const { ports, staticCalls } = fakePorts();
  const response = await createApp(ports)(at("/", { method: "POST" }), context);
  assertEquals(response.status, 405);
  assertEquals(staticCalls, []);
});

Deno.test("every response carries the security policy", async () => {
  const { ports } = fakePorts();
  const app = createApp(ports);
  for (const path of ["/", "/api/health", "/api/missing"]) {
    const response = await app(at(path), context);
    for (const rule of SECURITY_HEADERS) {
      assertEquals(
        response.headers.get(rule.name),
        rule.value,
        `${path} ${rule.name}`,
      );
    }
  }
});

Deno.test("API routes answer from the context the adapter gave", async () => {
  const { ports } = fakePorts();
  const app = createApp(ports);
  assertEquals(await (await app(at("/api/health"), context)).json(), {
    status: "ok",
    runtime: "test",
  });
  const edge = await (await app(at("/api/edge"), context)).json();
  assertEquals(edge.colo, "OKC");
  assertEquals(edge.receivedAt, "1970-01-01T00:00:00.000Z");
});

Deno.test("GET /api describes routes with JSON Schema", async () => {
  const { ports } = fakePorts();
  const doc = await (await createApp(ports)(at("/api"), context)).json();
  const paths = doc.routes.map((r: { path: string }) => r.path);
  assertEquals(paths, [
    "/api",
    "/api/health",
    "/api/edge",
    "/api/estimate",
    "/api/blueprint",
  ]);
  const estimate = doc.routes.find((r: { path: string }) =>
    r.path === "/api/estimate"
  );
  assertEquals(estimate.input.additionalProperties, false);
  assertEquals(estimate.input.properties.monthlyVisitors.maximum, 10_000_000);
  assertEquals(doc.security.length, SECURITY_HEADERS.length);
});

Deno.test("unknown API paths and wrong methods get problem responses", async () => {
  const { ports } = fakePorts();
  const app = createApp(ports);
  const missing = await app(at("/api/nope"), context);
  assertEquals(missing.status, 404);
  assertEquals(
    missing.headers.get("content-type"),
    "application/problem+json; charset=utf-8",
  );
  const wrong = await app(at("/api/estimate"), context);
  assertEquals(wrong.status, 405);
  assertEquals(wrong.headers.get("allow"), "POST");
});

Deno.test("HEAD answers like GET without a body", async () => {
  const { ports } = fakePorts();
  const response = await createApp(ports)(
    at("/api/health", { method: "HEAD" }),
    context,
  );
  assertEquals(response.status, 200);
  assertEquals(response.body, null);
});

Deno.test("an exploding port becomes a safe 500 and one log line", async () => {
  const { ports, logs } = fakePorts(() =>
    Promise.reject(new Error("disk on fire"))
  );
  const response = await createApp(ports)(at("/index.html"), context);
  assertEquals(response.status, 500);
  const body = await response.json();
  assertEquals(body.detail, "Something went wrong on our side.");
  assert(!JSON.stringify(body).includes("disk on fire"));
  assertEquals(logs.length, 1);
  assertEquals(logs[0]?.detail?.["message"], "disk on fire");
});

Deno.test("successful requests log nothing (Rule of Silence)", async () => {
  const { ports, logs } = fakePorts();
  await createApp(ports)(at("/api/health"), context);
  assertEquals(logs, []);
});

Deno.test("an estimate round-trips through the whole pipeline", async () => {
  const { ports } = fakePorts();
  const response = await createApp(ports)(
    at("/api/estimate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://okc.example",
      },
      body: JSON.stringify({
        monthlyVisitors: 5000,
        pagesPerVisit: 4,
        apiCallsPerPage: 1,
        cpuMsPerCall: 3,
        currentMonthlyHosting: 40,
      }),
    }),
    context,
  );
  assertEquals(response.status, 200);
  assertEquals((await response.json()).plan, "free");
});
