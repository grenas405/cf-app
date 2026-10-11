/**
 * The source explorer: a file tree grouped by layer, and a viewer showing a
 * module's purpose, exports, imports, importers and highlighted source.
 *
 * @module
 */

import { h } from "../dom.ts";
import {
  type Catalog,
  type CatalogModule,
  entriesOf,
  importersOf,
  LAYER_NAMES,
  LAYER_ORDER,
  shortName,
  symbolRange,
} from "./catalog.ts";
import { codeRows, scrollToLine } from "./code.ts";

/** What other widgets can ask of the explorer. */
export interface Explorer {
  readonly open: (path: string, symbol?: string) => void;
}

function refLink(path: string, layer: string): HTMLElement {
  return h("a", {
    class: "ref",
    href: "#anatomy",
    "data-open-module": path,
    "data-layer": layer,
  }, [shortName(path)]);
}

function chips(
  label: string,
  items: readonly HTMLElement[],
): HTMLElement | null {
  return items.length === 0
    ? null
    : h("div", {}, [h("span", {}, [label]), ...items]);
}

function headOf(catalog: Catalog, entry: CatalogModule): HTMLElement {
  const layerOf = (path: string): string =>
    catalog.modules.find((m) => m.path === path)?.layer ?? "project";
  const localImports = entry.imports.filter((i) => !i.external);
  const packages = [
    ...new Set(entry.imports.filter((i) => i.external).map((i) => i.target)),
  ];
  return h("header", { class: "viewer__head" }, [
    h("p", { class: "viewer__path" }, [
      h("span", { class: "badge", "data-layer": entry.layer }, [
        LAYER_NAMES[entry.layer],
      ]),
      entry.path,
      h("small", {}, [`${entry.lines} lines`]),
    ]),
    entry.doc === "" ? null : h("p", { class: "viewer__doc" }, [entry.doc]),
    h("div", { class: "viewer__meta" }, [
      chips("exports", entry.exports.map((name) => h("code", {}, [name]))),
      chips("imports", [
        ...localImports.map((i) => refLink(i.target, layerOf(i.target))),
        ...packages.map((name) => h("code", {}, [name])),
      ]),
      chips(
        "used by",
        importersOf(catalog, entry.path).map((path) =>
          refLink(path, layerOf(path))
        ),
      ),
    ]),
  ]);
}

function treeOf(
  catalog: Catalog,
  onPick: (path: string) => void,
): HTMLElement[] {
  const entries = entriesOf(catalog);
  return LAYER_ORDER.flatMap((layer) => {
    const files = entries.filter((e) => e.layer === layer).sort((a, b) =>
      a.path.localeCompare(b.path)
    );
    if (files.length === 0) return [];
    return [h("div", { class: "tree__group", "data-layer": layer }, [
      h("p", { class: "tree__label" }, [LAYER_NAMES[layer]]),
      ...files.map((file) => {
        const button = h("button", {
          class: "tree__file",
          type: "button",
          "data-path": file.path,
        }, [
          h("span", {}, [shortName(file.path)]),
          h("small", {}, [String(file.lines)]),
        ]);
        button.addEventListener("click", () => onPick(file.path));
        return button;
      }),
    ])];
  });
}

/** Scroll `container` (not the page) just enough to show `child`. */
function keepVisible(container: HTMLElement, child: HTMLElement): void {
  const top = child.offsetTop - container.offsetTop;
  const bottom = top + child.offsetHeight;
  if (top < container.scrollTop) container.scrollTop = top - 8;
  else if (bottom > container.scrollTop + container.clientHeight) {
    container.scrollTop = bottom - container.clientHeight + 8;
  }
}

/** Mount the explorer into its tree and viewer containers. */
export function mountExplorer(
  tree: HTMLElement,
  viewer: HTMLElement,
  catalog: Catalog,
): Explorer {
  const entries = entriesOf(catalog);

  const open = (path: string, symbol?: string): void => {
    const entry = entries.find((e) => e.path === path);
    if (entry === undefined) return;
    const line = entry.symbols.find((s) => s.name === symbol)?.line;
    const lit = line === undefined
      ? undefined
      : symbolRange(entry.source, line);
    const code = h(
      "pre",
      { class: "viewer__code" },
      codeRows(entry.path, entry.source, lit ? { lit } : {}),
    );
    viewer.replaceChildren(headOf(catalog, entry), code);
    viewer.setAttribute("data-layer", entry.layer);
    for (const button of tree.querySelectorAll<HTMLElement>(".tree__file")) {
      const current = button.dataset["path"] === path;
      button.setAttribute("aria-current", String(current));
      if (current) keepVisible(tree, button);
    }
    if (lit !== undefined) {
      requestAnimationFrame(() => scrollToLine(code, lit[0]));
    }
  };

  tree.replaceChildren(...treeOf(catalog, (path) => open(path)));
  open("src/core/app.ts", "respond");
  return { open };
}
