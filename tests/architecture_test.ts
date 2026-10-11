/**
 * Fitness functions: the architecture described in CLAUDE.md, enforced.
 * The same rules are published on the page via catalog.json.
 */
import { assertEquals } from "@std/assert";
import {
  checkArchitecture,
  RULES,
  toModule,
} from "../src/tooling/architecture.ts";
import { listFiles, readAll } from "../src/tooling/files.ts";

const files = await readAll(
  (await listFiles("src")).filter((path) => path.endsWith(".ts")),
);
const modules = files.map((file) => toModule(file.path, file.source));

for (const rule of RULES) {
  Deno.test(`architecture: ${rule.title}`, () => {
    const violations = checkArchitecture(modules, [rule]);
    assertEquals(
      violations,
      [],
      `${rule.why}\n${JSON.stringify(violations, null, 2)}`,
    );
  });
}

Deno.test("architecture rules actually bite", () => {
  const bad = [
    toModule(
      "src/core/bad.ts",
      `/** x @module */\nimport { serveDir } from "@std/http/file-server";\nexport const t = Date.now();\n`,
    ),
    toModule(
      "src/adapters/deno/bad.ts",
      `/** x @module */\nimport { a } from "../cloudflare/edge.ts";\nimport { b } from "../../core/app.ts";\n`,
    ),
    toModule(
      "src/ui/bad.ts",
      `/** x @module */\nimport { createApp } from "../core/mod.ts";\nexport class Widget {}\n`,
    ),
    toModule("src/tooling/bad.ts", "export const undocumented = 1;\n"),
  ];
  const broken = new Set(checkArchitecture(bad).map((v) => v.rule));
  assertEquals([...broken].sort(), [
    "documented",
    "independent-adapters",
    "narrow-boundary",
    "no-classes",
    "portable-core",
    "pure-core",
    "ui-shares-types-only",
  ]);
});
