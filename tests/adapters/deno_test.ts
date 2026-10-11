import { assert, assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import { parseConfig } from "../../src/adapters/deno/config.ts";
import { denoPorts, serveAssets } from "../../src/adapters/deno/server.ts";
import { createApp } from "../../src/core/mod.ts";

const root = fromFileUrl(new URL("../fixtures/public", import.meta.url));

Deno.test("parseConfig() defaults to loopback on port 8000", () => {
  assertEquals(parseConfig({ PORT: undefined, HOST: undefined }), {
    ok: true,
    value: { port: 8000, hostname: "127.0.0.1" },
  });
  assertEquals(parseConfig({ PORT: "9000", HOST: "0.0.0.0" }), {
    ok: true,
    value: { port: 9000, hostname: "0.0.0.0" },
  });
});

Deno.test("parseConfig() explains bad values instead of guessing", () => {
  const bad = parseConfig({ PORT: "eighty", HOST: "example.com" });
  assertEquals(bad.ok, false);
  if (!bad.ok) {
    assert(bad.error.includes("port"));
    assert(bad.error.includes("hostname"));
  }
});

Deno.test("serveAssets() serves files with std/http/file-server", async () => {
  const response = await serveAssets(root)(new Request("http://localhost/"));
  assertEquals(response.status, 200);
  assert((await response.text()).includes("fixture"));
});

Deno.test("serveAssets() falls back to the site's 404 page", async () => {
  const response = await serveAssets(root)(
    new Request("http://localhost/nope"),
  );
  assertEquals(response.status, 404);
  assert((await response.text()).includes("not here"));
});

Deno.test("the same core runs on Deno with the security policy applied", async () => {
  const app = createApp(denoPorts(root));
  const page = await app(new Request("http://localhost/"), {
    edge: { runtime: "deno" },
    receivedAt: 0,
  });
  assertEquals(page.status, 200);
  assertEquals(page.headers.get("x-content-type-options"), "nosniff");
  await page.body?.cancel();
});
