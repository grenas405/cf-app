/**
 * Loading and querying catalog.json, the codebase's description of itself.
 * The types come from the generator, so both ends agree on the format.
 *
 * @module
 */

import type { Catalog, CatalogModule } from "../../tooling/emit_catalog.ts";
import type { Layer } from "../../tooling/source_facts.ts";
import { bodyOf, getJson } from "../api.ts";

export type { Catalog, CatalogModule, Layer };

/** Display order of layers, from the heart outward. */
export const LAYER_ORDER: readonly Layer[] = [
  "core",
  "cloudflare",
  "deno",
  "ui",
  "tooling",
  "project",
];

export const LAYER_NAMES: Readonly<Record<Layer, string>> = {
  core: "Core",
  cloudflare: "Cloudflare adapter",
  deno: "Deno adapter",
  ui: "Browser",
  tooling: "Tooling",
  project: "Project files",
};

/** Fetch the catalog, or `null` if the build didn't produce one. */
export async function loadCatalog(): Promise<Catalog | null> {
  return bodyOf(await getJson<Catalog>("/catalog.json"));
}

/** A short, unique-enough label for a path. */
export function shortName(path: string): string {
  return path.replace(
    /^src\/(core\/(features\/)?|adapters\/|ui\/|tooling\/)/,
    "",
  );
}

/** Every file, documents included, as viewer entries. */
export function entriesOf(catalog: Catalog): CatalogModule[] {
  const documents = catalog.documents.map((doc): CatalogModule => ({
    path: doc.path,
    layer: "project",
    doc: "",
    lines: doc.lines,
    imports: [],
    exports: [],
    symbols: [],
    source: doc.source,
  }));
  return [...catalog.modules, ...documents];
}

/** Modules that import `path`. */
export function importersOf(catalog: Catalog, path: string): string[] {
  return catalog.modules
    .filter((m) => m.imports.some((i) => !i.external && i.target === path))
    .map((m) => m.path);
}

/**
 * The lines a top-level symbol spans: from its declaration to the first
 * brace or bracket that closes at column zero (a `)` there only ends a
 * parameter list). Returns 1-based, inclusive bounds.
 */
export function symbolRange(
  source: string,
  startLine: number,
): [number, number] {
  const lines = source.split("\n");
  const first = lines[startLine - 1] ?? "";
  if (/;\s*$/.test(first)) return [startLine, startLine];
  for (let n = startLine; n < Math.min(lines.length, startLine + 80); n++) {
    if (/^[}\]]/.test(lines[n] ?? "")) return [startLine, n + 1];
  }
  return [startLine, startLine];
}
