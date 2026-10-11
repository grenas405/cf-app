/**
 * Facts about a source file, read with plain text processing: its layer,
 * imports, exports, top-level symbols and module doc. Pure functions over
 * strings, shared by the catalog generator and the architecture tests.
 *
 * @module
 */

/** The architectural layer a file belongs to. */
export type Layer =
  | "core"
  | "cloudflare"
  | "deno"
  | "ui"
  | "tooling"
  | "project";

/** One import or re-export statement. */
export interface ImportRef {
  readonly specifier: string;
  /** Repo-relative path for local imports, or the package name. */
  readonly target: string;
  readonly typeOnly: boolean;
  readonly external: boolean;
}

/** A named top-level declaration and the line it starts on. */
export interface SymbolRef {
  readonly name: string;
  readonly line: number;
}

/** Classify a repo-relative path. */
export function layerOf(path: string): Layer {
  if (path.startsWith("src/core/")) return "core";
  if (path.startsWith("src/adapters/cloudflare/")) return "cloudflare";
  if (path.startsWith("src/adapters/deno/")) return "deno";
  if (path.startsWith("src/ui/")) return "ui";
  if (path.startsWith("src/tooling/")) return "tooling";
  return "project";
}

/**
 * Blank out comment lines and trailing `// …` comments so rules only look at
 * code. Line-based on purpose: it relies on `deno fmt` layout instead of
 * pretending to be a full tokenizer. Line numbers stay intact.
 */
export function stripComments(source: string): string {
  return source
    .split("\n")
    .map((line) => /^\s*(\/\/|\/\*|\*)/.test(line) ? "" : line)
    .map((line) => line.replace(/\s+\/\/\s.*$/, ""))
    .join("\n");
}

/** Empty out single-line string literals, so rules don't read prose as code. */
export function stripStrings(source: string): string {
  return source.replace(
    /"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\\n]|\\.)*`/g,
    (literal) => `${literal[0]}${literal[0]}`,
  );
}

/** Resolve `./x.ts` relative to `from`, POSIX style, without touching disk. */
export function resolveRelative(from: string, specifier: string): string {
  const parts = from.split("/").slice(0, -1);
  for (const segment of specifier.split("/")) {
    if (segment === "..") parts.pop();
    else if (segment !== ".") parts.push(segment);
  }
  return parts.join("/");
}

/** Every `import … from` and `export … from` in a module. */
export function importsOf(path: string, source: string): ImportRef[] {
  const pattern =
    /^(?:import|export)\s+(type\s+)?[^;=()]*?\bfrom\s*["']([^"']+)["']/gm;
  return [...source.matchAll(pattern)].map((match) => {
    const specifier = match[2] ?? "";
    const external = !specifier.startsWith(".");
    return {
      specifier,
      target: external ? specifier : resolveRelative(path, specifier),
      typeOnly: match[1] !== undefined,
      external,
    };
  });
}

/** Names a module exports, including re-exports. */
export function exportsOf(source: string): string[] {
  const declared = [
    ...source.matchAll(
      /^export\s+(?:default\s+)?(?:async\s+)?(?:function\*?|const|let|interface|type|class|enum)\s+([A-Za-z_$][\w$]*)/gm,
    ),
  ].map((match) => match[1] ?? "");
  const listed = [...source.matchAll(/^export\s+(?:type\s+)?\{([^}]*)\}/gm)]
    .flatMap((match) => (match[1] ?? "").split(","))
    .map((name) => name.replace(/^\s*type\s+/, "").split(/\s+as\s+/).pop())
    .map((name) => (name ?? "").trim())
    .filter((name) => name.length > 0);
  const hasDefault = /^export\s+default\s+(?!function|class|async)/m.test(
    source,
  );
  return [...declared, ...listed, ...(hasDefault ? ["default"] : [])];
}

/** 1-based line number of a character offset. */
export function lineAt(source: string, offset: number): number {
  return source.slice(0, offset).split("\n").length;
}

/** Top-level functions and constants, with the line each starts on. */
export function symbolsOf(source: string): SymbolRef[] {
  const pattern =
    /^(?:export\s+)?(?:default\s+)?(?:async\s+)?(?:function\*?|const|interface|type)\s+([A-Za-z_$][\w$]*)/gm;
  return [...source.matchAll(pattern)].map((match) => ({
    name: match[1] ?? "",
    line: lineAt(source, match.index ?? 0),
  }));
}

/** The text of the leading `/** … @module *\/` comment, if there is one. */
export function moduleDoc(source: string): string {
  const block = /^\/\*\*([\s\S]*?)\*\//.exec(source.trimStart());
  if (block === null || !(block[1] ?? "").includes("@module")) return "";
  return (block[1] ?? "")
    .split("\n")
    .map((line) => line.replace(/^\s*\*\s?/, ""))
    .join("\n")
    .replace(/@module[\s\S]*$/, "")
    .trim();
}

/** Count lines the way editors do. */
export function lineCount(source: string): number {
  return source.endsWith("\n")
    ? source.split("\n").length - 1
    : source.split("\n").length;
}
