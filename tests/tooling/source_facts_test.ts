import { assertEquals } from "@std/assert";
import {
  exportsOf,
  importsOf,
  layerOf,
  lineCount,
  moduleDoc,
  resolveRelative,
  stripComments,
  stripStrings,
  symbolsOf,
} from "../../src/tooling/source_facts.ts";

const sample = `/**
 * Does one thing.
 *
 * @module
 */

import { z } from "@zod/zod";
import type { Route } from "../types.ts";
export { createApp, type App } from "./app.ts";

// import { fake } from "./commented.ts";
export const LIMIT = 3;
export async function run(): Promise<void> {}
export interface Thing {}
`;

Deno.test("layerOf() classifies by path", () => {
  assertEquals(layerOf("src/core/app.ts"), "core");
  assertEquals(layerOf("src/adapters/cloudflare/worker.ts"), "cloudflare");
  assertEquals(layerOf("src/adapters/deno/server.ts"), "deno");
  assertEquals(layerOf("src/ui/main.ts"), "ui");
  assertEquals(layerOf("src/tooling/files.ts"), "tooling");
  assertEquals(layerOf("CLAUDE.md"), "project");
});

Deno.test("resolveRelative() resolves POSIX-style without the disk", () => {
  assertEquals(
    resolveRelative("src/core/http/body.ts", "../result.ts"),
    "src/core/result.ts",
  );
  assertEquals(
    resolveRelative("src/core/app.ts", "./types.ts"),
    "src/core/types.ts",
  );
});

Deno.test("importsOf() finds imports and re-exports, skipping comments", () => {
  assertEquals(importsOf("src/core/features/x.ts", sample), [
    {
      specifier: "@zod/zod",
      target: "@zod/zod",
      typeOnly: false,
      external: true,
    },
    {
      specifier: "../types.ts",
      target: "src/core/types.ts",
      typeOnly: true,
      external: false,
    },
    {
      specifier: "./app.ts",
      target: "src/core/features/app.ts",
      typeOnly: false,
      external: false,
    },
  ]);
});

Deno.test("exportsOf() lists declarations and re-exports", () => {
  assertEquals(exportsOf(sample), [
    "LIMIT",
    "run",
    "Thing",
    "createApp",
    "App",
  ]);
});

Deno.test("symbolsOf() records start lines", () => {
  assertEquals(symbolsOf(sample).map((s) => [s.name, s.line]), [["LIMIT", 12], [
    "run",
    13,
  ], ["Thing", 14]]);
});

Deno.test("moduleDoc() extracts the leading @module comment", () => {
  assertEquals(moduleDoc(sample), "Does one thing.");
  assertEquals(moduleDoc("const a = 1;"), "");
});

Deno.test("stripComments() and stripStrings() leave only code", () => {
  assertEquals(
    stripComments("a(); // Deno.exit()\n * Deno.env\nb();"),
    "a();\n\nb();",
  );
  assertEquals(stripStrings(`x("window.open", 'Deno.exit')`), `x("", '')`);
});

Deno.test("lineCount() matches editors", () => {
  assertEquals(lineCount("a\nb\n"), 2);
  assertEquals(lineCount("a\nb"), 2);
});
