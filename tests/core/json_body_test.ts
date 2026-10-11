import { assertEquals } from "@std/assert";
import { z } from "@zod/zod";
import { readJsonBody } from "../../src/core/http/json_body.ts";

const Schema = z.strictObject({ visits: z.number().int().min(0) });
const url = "https://okc.example/api/thing";

function post(
  body: string,
  headers: HeadersInit = { "Content-Type": "application/json" },
): Request {
  return new Request(url, { method: "POST", body, headers });
}

async function statusOf(request: Request, max = 64): Promise<number> {
  const result = await readJsonBody(request, Schema, max);
  return result.ok ? 200 : result.error.status;
}

Deno.test("valid JSON passes through typed", async () => {
  const result = await readJsonBody(post('{"visits":3}'), Schema, 64);
  assertEquals(result, { ok: true, value: { visits: 3 } });
});

Deno.test("each guard answers with its own status, first failure wins", async () => {
  assertEquals(
    await statusOf(
      post("{}", {
        "Content-Type": "application/json",
        Origin: "https://evil.example",
      }),
    ),
    403,
  );
  assertEquals(
    await statusOf(post("{}", { "Content-Type": "text/plain" })),
    415,
  );
  assertEquals(
    await statusOf(post(JSON.stringify({ visits: 1, pad: "x".repeat(100) }))),
    413,
  );
  assertEquals(await statusOf(post("{nope"), 64), 400);
  assertEquals(await statusOf(post('{"visits":-1}')), 422);
});

Deno.test("422 lists every field problem, including unknown keys", async () => {
  const result = await readJsonBody(
    post('{"visits":"many","isAdmin":true}'),
    Schema,
    64,
  );
  if (result.ok) throw new Error("expected a failure");
  const body = await result.error.json();
  assertEquals(body.status, 422);
  assertEquals(body.errors.map((e: { path: string }) => e.path).sort(), [
    "(body)",
    "visits",
  ]);
});
