/**
 * Print `catalog.json`: this codebase describing itself. Every module's
 * layer, doc comment, imports, exports, symbols and source, plus the live
 * results of the architecture rules. The "Anatomy" section of the UI is
 * rendered entirely from this file.
 *
 *   deno run --allow-read=src,... src/tooling/emit_catalog.ts > catalog.json
 *
 * @module
 */

import {
  checkArchitecture,
  RULES,
  type SourceModule,
  toModule,
  type Violation,
} from "./architecture.ts";
import { listFiles, readAll, writeStdout } from "./files.ts";
import {
  exportsOf,
  type ImportRef,
  type Layer,
  lineCount,
  moduleDoc,
  type SymbolRef,
  symbolsOf,
} from "./source_facts.ts";

/** Project files shown alongside the code. */
export const DOCUMENTS: readonly string[] = [
  "CLAUDE.md",
  "deno.json",
  "wrangler.jsonc",
];

/** A source module, as published in catalog.json. */
export interface CatalogModule {
  readonly path: string;
  readonly layer: Layer;
  readonly doc: string;
  readonly lines: number;
  readonly imports: readonly ImportRef[];
  readonly exports: readonly string[];
  readonly symbols: readonly SymbolRef[];
  readonly source: string;
}

/** A project document (config or prose). */
export interface CatalogDocument {
  readonly path: string;
  readonly lines: number;
  readonly source: string;
}

/** An architecture rule and what it found. */
export interface CatalogRule {
  readonly id: string;
  readonly title: string;
  readonly why: string;
  readonly violations: readonly Violation[];
}

/** The whole file. */
export interface Catalog {
  readonly generatedBy: string;
  readonly modules: readonly CatalogModule[];
  readonly documents: readonly CatalogDocument[];
  readonly rules: readonly CatalogRule[];
}

/** A module entry in the catalog. */
export function describeModule(module: SourceModule): CatalogModule {
  return {
    path: module.path,
    layer: module.layer,
    doc: moduleDoc(module.source),
    lines: lineCount(module.source),
    imports: module.imports,
    exports: exportsOf(module.source),
    symbols: symbolsOf(module.source),
    source: module.source,
  };
}

/** Assemble the catalog from file contents. Pure. */
export function buildCatalog(
  sources: readonly { path: string; source: string }[],
  documents: readonly { path: string; source: string }[],
): Catalog {
  const modules = sources.map((file) => toModule(file.path, file.source));
  const violations = checkArchitecture(modules);
  return {
    generatedBy: "src/tooling/emit_catalog.ts",
    modules: modules.map(describeModule),
    documents: documents.map((doc) => ({
      path: doc.path,
      lines: lineCount(doc.source),
      source: doc.source,
    })),
    rules: RULES.map((rule) => ({
      id: rule.id,
      title: rule.title,
      why: rule.why,
      violations: violations.filter((v) => v.rule === rule.id),
    })),
  };
}

if (import.meta.main) {
  const paths = (await listFiles("src")).filter((path) => path.endsWith(".ts"));
  const catalog = buildCatalog(
    await readAll(paths),
    await readAll(DOCUMENTS),
  );
  await writeStdout(JSON.stringify(catalog));
}
