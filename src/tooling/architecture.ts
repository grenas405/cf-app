/**
 * The architecture, written as executable rules ("fitness functions").
 * The test suite fails when a rule is broken, and the catalog publishes the
 * same results to the UI, so the diagram on the page is checked, not drawn.
 *
 * @module
 */

import {
  type ImportRef,
  importsOf,
  type Layer,
  layerOf,
  lineCount,
  moduleDoc,
  stripComments,
  stripStrings,
} from "./source_facts.ts";

/** A source file plus the facts the rules need. */
export interface SourceModule {
  readonly path: string;
  readonly layer: Layer;
  readonly source: string;
  readonly imports: readonly ImportRef[];
}

/** One architectural rule. `check` returns a message per violation. */
export interface Rule {
  readonly id: string;
  readonly title: string;
  readonly why: string;
  readonly check: (module: SourceModule) => readonly string[];
}

/** A broken rule, located. */
export interface Violation {
  readonly rule: string;
  readonly path: string;
  readonly message: string;
}

/** The longest a module may grow before it must be split. */
export const MAX_MODULE_LINES = 300;

/** The only third-party code the core may depend on. */
export const CORE_PACKAGES: readonly string[] = [
  "@std/http/status",
  "@zod/zod",
];

/** Runtime-specific globals and impure calls the core must never touch. */
const IMPURE_CODE =
  /\b(Deno|Bun|process|caches|window|document|localStorage|navigator)\s*\.|\b(Date\.now|Math\.random|console\.\w+|fetch|setTimeout|setInterval|crypto\.getRandomValues)\s*\(/;

/** Build a `SourceModule` from a path and its text. */
export function toModule(path: string, source: string): SourceModule {
  return {
    path,
    layer: layerOf(path),
    source,
    imports: importsOf(path, source),
  };
}

/** Lines of code (comments and string contents removed) matching a pattern. */
export function offendingLines(source: string, pattern: RegExp): string[] {
  return stripStrings(stripComments(source))
    .split("\n")
    .flatMap((line, i) =>
      pattern.test(line) ? [`line ${i + 1}: ${line.trim()}`] : []
    );
}

const isAdapter = (layer: Layer): boolean =>
  layer === "cloudflare" || layer === "deno";

export const RULES: readonly Rule[] = [
  {
    id: "portable-core",
    title: "The core runs anywhere",
    why:
      "Core files import only other core files and runtime-agnostic JSR packages, so any adapter can host them.",
    check: (m) =>
      m.layer !== "core" ? [] : m.imports
        .filter((i) =>
          i.external
            ? !CORE_PACKAGES.includes(i.target)
            : !i.target.startsWith("src/core/")
        )
        .map((i) => `imports ${i.specifier}`),
  },
  {
    id: "pure-core",
    title: "The core has no side effects",
    why:
      "No runtime globals, clocks, randomness, logging or network calls: those arrive through ports and context.",
    check: (m) =>
      m.layer !== "core" ? [] : offendingLines(m.source, IMPURE_CODE),
  },
  {
    id: "narrow-boundary",
    title: "Adapters enter through one door",
    why:
      "Adapters import the core only via src/core/mod.ts, so its public surface stays small and deliberate.",
    check: (m) =>
      !isAdapter(m.layer) ? [] : m.imports
        .filter((i) =>
          i.target.startsWith("src/core/") && i.target !== "src/core/mod.ts"
        )
        .map((i) => `reaches into ${i.target}`),
  },
  {
    id: "independent-adapters",
    title: "Adapters never import each other",
    why:
      "Each runtime's wiring stands alone; deleting one adapter cannot break another.",
    check: (m) =>
      !isAdapter(m.layer) ? [] : m.imports
        .filter((i) =>
          !i.external && isAdapter(layerOf(i.target)) &&
          layerOf(i.target) !== m.layer
        )
        .map((i) => `imports ${i.target}`),
  },
  {
    id: "ui-shares-types-only",
    title: "The browser shares types, not code",
    why:
      "The UI may import the core's types to stay in sync with the API, but never its code or any adapter.",
    check: (m) =>
      m.layer !== "ui" ? [] : m.imports
        .filter((i) => !i.external && layerOf(i.target) !== "ui" && !i.typeOnly)
        .map((i) => `imports code from ${i.target}`),
  },
  {
    id: "no-classes",
    title: "No classes, no god objects",
    why:
      "Behavior lives in small named functions over plain data, so nothing accumulates hidden state.",
    check: (m) =>
      offendingLines(
        m.source,
        /^\s*(export\s+)?(default\s+)?(abstract\s+)?class\s+\w+/,
      ),
  },
  {
    id: "small-modules",
    title: `Modules stay under ${MAX_MODULE_LINES} lines`,
    why:
      "Each file does one thing and fits on a screen or two (Unix: do one thing well).",
    check: (m) => {
      const lines = lineCount(m.source);
      return lines > MAX_MODULE_LINES ? [`${lines} lines`] : [];
    },
  },
  {
    id: "documented",
    title: "Every module explains itself",
    why:
      "A leading @module comment says why the file exists; the catalog shows it on the page.",
    check: (m) =>
      moduleDoc(m.source) === "" ? ["missing @module doc comment"] : [],
  },
];

/** Run every rule over every module. */
export function checkArchitecture(
  modules: readonly SourceModule[],
  rules: readonly Rule[] = RULES,
): Violation[] {
  return rules.flatMap((rule) =>
    modules.flatMap((module) =>
      rule.check(module).map((message) => ({
        rule: rule.id,
        path: module.path,
        message,
      }))
    )
  );
}
