/** The browser code's pure parts, tested without a browser. */
import { assert, assertAlmostEquals, assertEquals } from "@std/assert";
import { symbolRange } from "../../src/ui/anatomy/catalog.ts";
import {
  depths,
  layoutGraph,
  reachable,
} from "../../src/ui/anatomy/graph_layout.ts";
import { tokenize, toLines } from "../../src/ui/anatomy/highlight.ts";
import {
  boundsFrom,
  fillPercent,
  visitsAt,
} from "../../src/ui/cost/sliders.ts";
import {
  compareLatency,
  CUSTOMERS,
  greatCircleKm,
  minRoundTripMs,
  ORIGINS,
} from "../../src/ui/edge/physics.ts";
import { edgeFields } from "../../src/ui/edge/report.ts";
import { burstVectors } from "../../src/ui/effects/press.ts";
import { scrollFraction } from "../../src/ui/effects/scroll.ts";
import { median } from "../../src/ui/format.ts";
import {
  fitProjection,
  inside,
  OKC,
  OKLAHOMA_BORDER,
} from "../../src/ui/hero/oklahoma.ts";
import { curtainFrom, letterDelay } from "../../src/ui/nav/choreography.ts";
import { okcTime } from "../../src/ui/nav/clock.ts";

const city = (id: string) =>
  [...CUSTOMERS, ...ORIGINS].find((c) => c.id === id)!;

Deno.test("physics: OKC to Tulsa is ~157 km as the crow flies, a ~1.6 ms floor", () => {
  const km = greatCircleKm(city("okc"), city("tul"));
  assertAlmostEquals(km, 157, 3);
  assertAlmostEquals(minRoundTripMs(km), 1.57, 0.05);
});

Deno.test("physics: the edge beats a Virginia server for Tulsa", () => {
  const result = compareLatency(city("tul"), city("iad"));
  assertEquals(result.edge.name, "Oklahoma City");
  assert(result.edgeMs < result.originMs / 5);
});

Deno.test("hero: OKC projects inside the Oklahoma outline", () => {
  const project = fitProjection(OKLAHOMA_BORDER, 0, 0, 800, 400);
  assert(inside(project(OKC), OKLAHOMA_BORDER.map(project)));
  assertEquals(inside(project([-90, 35]), OKLAHOMA_BORDER.map(project)), false);
});

Deno.test("menu: the curtain always covers the viewport", () => {
  const curtain = curtainFrom(1300, 30, 1440, 900);
  assert(Math.hypot(1300, 900 - 30) <= curtain.radius);
  assert(letterDelay(0, 1) > letterDelay(0, 0));
  assert(letterDelay(1, 0) > letterDelay(0, 0));
});

Deno.test("buttons: burst vectors fan all the way around", () => {
  const sparks = burstVectors(12, 100);
  assertEquals(sparks.length, 12);
  assert(sparks.some((s) => s.dx > 0) && sparks.some((s) => s.dx < 0));
  assert(sparks.every((s) => Math.hypot(s.dx, s.dy) <= 100 * 1.1));
});

Deno.test("sliders: visit ladder clamps and schema bounds are read", () => {
  assertEquals(visitsAt(-3), 1_000);
  assertEquals(visitsAt(99), 10_000_000);
  assertEquals(
    boundsFrom({ properties: { a: { minimum: 1, maximum: 30 } } }, "a"),
    { min: 1, max: 30 },
  );
  assertEquals(boundsFrom(undefined, "a"), {});
  assertEquals(fillPercent(5, 0, 10), "50%");
});

Deno.test("anatomy: tokenizer keeps every character", () => {
  const source = 'export const x = "hi"; // note\nfoo(1);';
  const tokens = tokenize(source);
  assertEquals(tokens.map((t) => t.text).join(""), source);
  assertEquals(tokens.find((t) => t.text === '"hi"')?.kind, "string");
  assertEquals(toLines(tokens).length, 2);
});

Deno.test("anatomy: symbol ranges stop at the closing brace, not a paren", () => {
  const source =
    "function f(\n  a: number,\n): void {\n  g();\n}\nconst z = 1;";
  assertEquals(symbolRange(source, 1), [1, 5]);
  assertEquals(symbolRange(source, 6), [6, 6]);
});

Deno.test("anatomy: graph depth, reach and layout fit the width", () => {
  const inputs = [
    { path: "a", layer: "core", deps: ["b"] },
    { path: "b", layer: "core", deps: ["c"] },
    { path: "c", layer: "core", deps: [] },
  ];
  assertEquals(Object.fromEntries(depths(inputs)), { a: 2, b: 1, c: 0 });
  assertEquals([...reachable(inputs, "a")].sort(), ["b", "c"]);
  const layout = layoutGraph(inputs, ["core"], 600);
  assertEquals(layout.edges.length, 2);
  assert(layout.nodes.every((n) => n.x >= 0 && n.x + 184 <= layout.width));
});

Deno.test("misc: scroll fraction, median, clock and edge labels", () => {
  assertEquals(scrollFraction(500, 2000, 1000), 0.5);
  assertEquals(scrollFraction(0, 500, 1000), 0);
  assertEquals(median([5, 1, 3]), 3);
  assertEquals(median([4, 1, 3, 2]), 2.5);
  assertEquals(okcTime(new Date("2026-07-04T17:00:00Z")), "12:00 PM");
  assertEquals(
    edgeFields({ runtime: "deno", receivedAt: "" }).colo,
    "localhost",
  );
  assertEquals(
    edgeFields({ runtime: "cloudflare-workers", colo: "OKC", receivedAt: "" })
      .runtime,
    "Cloudflare Workers",
  );
});
