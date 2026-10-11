/**
 * Assemble the Anatomy section from the catalog, and let any link on the
 * page open a module with `data-open-module` (plus optional `data-symbol`).
 *
 * @module
 */

import { all, byId, reveal } from "../dom.ts";
import type { Catalog } from "./catalog.ts";
import { mountGraph } from "./graph.ts";
import { mountLifecycle } from "./lifecycle.ts";
import { mountOverview } from "./overview.ts";
import { mountExplorer } from "./viewer.ts";

/** The file (and symbol) that best introduces each layer. */
const LAYER_ENTRY: Readonly<Record<string, readonly [string, string?]>> = {
  core: ["src/core/mod.ts"],
  ports: ["src/core/types.ts", "Ports"],
  cloudflare: ["src/adapters/cloudflare/worker.ts", "portsFrom"],
  deno: ["src/adapters/deno/server.ts", "serveAssets"],
  ui: ["src/ui/main.ts"],
  tooling: ["src/tooling/architecture.ts", "RULES"],
};

/** Wire everything that depends on catalog.json. */
export function installAnatomy(catalog: Catalog): void {
  const tree = byId("explorer-tree");
  const viewer = byId("viewer");
  if (tree === null || viewer === null) return;
  const explorer = mountExplorer(tree, viewer, catalog);
  const explorerBox = viewer.closest(".explorer") ?? viewer;

  const graphHost = byId("graph");
  const toggles = byId("graph-toggles");
  if (graphHost !== null && toggles !== null) {
    mountGraph(graphHost, toggles, catalog, (path) => {
      explorer.open(path);
      reveal(explorerBox);
    });
  }
  mountOverview(catalog);
  mountLifecycle(catalog);

  document.addEventListener("click", (event) => {
    const link = event.target instanceof Element
      ? event.target.closest<HTMLElement>("[data-open-module]")
      : null;
    if (link === null) return;
    event.preventDefault();
    explorer.open(link.dataset["openModule"] ?? "", link.dataset["symbol"]);
    if (!link.closest(".explorer")) reveal(explorerBox);
  });

  const diagram = document.querySelector<HTMLElement>(".rings__diagram");
  for (const button of all<HTMLButtonElement>(".layer-btn")) {
    const layer = button.dataset["layer"] ?? "";
    button.addEventListener(
      "pointerenter",
      () => diagram?.setAttribute("data-focus", layer),
    );
    button.addEventListener(
      "pointerleave",
      () => diagram?.removeAttribute("data-focus"),
    );
    button.addEventListener("click", () => {
      all(".layer-btn").forEach((b) =>
        b.setAttribute("aria-pressed", String(b === button))
      );
      diagram?.setAttribute("data-focus", layer);
      const [path, symbol] = LAYER_ENTRY[layer] ?? [];
      if (path !== undefined) explorer.open(path, symbol);
      reveal(explorerBox);
    });
  }
}
