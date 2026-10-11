import { assertEquals } from "@std/assert";
import { readEdgeInfo } from "../../src/adapters/cloudflare/edge.ts";
import worker, {
  type Env,
  portsFrom,
} from "../../src/adapters/cloudflare/worker.ts";

/** A request as Cloudflare delivers it, with a `cf` object attached. */
function withCf(url: string, cf: unknown, init?: RequestInit): Request {
  const request = new Request(url, init);
  Object.defineProperty(request, "cf", { value: cf });
  return request;
}

const env: Env = {
  ASSETS: {
    fetch: (request) =>
      Promise.resolve(new Response(`asset ${new URL(request.url).pathname}`)),
  },
};

Deno.test("readEdgeInfo() maps request.cf and reads nothing else", () => {
  const info = readEdgeInfo(withCf("https://okc.example/", {
    colo: "OKC",
    city: "Oklahoma City",
    region: "Oklahoma",
    country: "US",
    httpProtocol: "HTTP/3",
    tlsVersion: "TLSv1.3",
    latitude: "35.4",
    postalCode: "73102",
  }));
  assertEquals(info, {
    runtime: "cloudflare-workers",
    colo: "OKC",
    visitorCity: "Oklahoma City",
    visitorRegion: "Oklahoma",
    visitorCountry: "US",
    httpProtocol: "HTTP/3",
    tlsVersion: "TLSv1.3",
  });
});

Deno.test("readEdgeInfo() survives a missing or malformed cf object", () => {
  assertEquals(
    readEdgeInfo(new Request("https://okc.example/")).runtime,
    "cloudflare-workers",
  );
  const odd = readEdgeInfo(
    withCf("https://okc.example/", { colo: 42, city: "x".repeat(500) }),
  );
  assertEquals(odd.colo, undefined);
  assertEquals(odd.visitorCity, undefined);
});

Deno.test("portsFrom() routes static files to the ASSETS binding", async () => {
  const response = await portsFrom(env).serveStatic(
    new Request("https://okc.example/app.js"),
  );
  assertEquals(await response.text(), "asset /app.js");
});

Deno.test("the Worker's fetch handler runs the core end to end", async () => {
  const health = await worker.fetch(
    withCf("https://okc.example/api/health", { colo: "OKC" }),
    env,
  );
  assertEquals(await health.json(), {
    status: "ok",
    runtime: "cloudflare-workers",
  });
  const edge = await worker.fetch(
    withCf("https://okc.example/api/edge", { colo: "OKC" }),
    env,
  );
  assertEquals((await edge.json()).colo, "OKC");
  const page = await worker.fetch(
    new Request("https://okc.example/index.html"),
    env,
  );
  assertEquals(page.headers.get("x-frame-options"), "DENY");
});
