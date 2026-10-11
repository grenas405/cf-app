/**
 * Draw the dependency graph as SVG from the computed layout, with layer
 * toggles, hover tracing of everything a module pulls in, and a re-layout
 * whenever the available width changes.
 *
 * @module
 */

import { h, svg } from "../dom.ts";
import {
  type Catalog,
  type Layer,
  LAYER_NAMES,
  LAYER_ORDER,
  shortName,
} from "./catalog.ts";
import {
  type GraphInput,
  layoutGraph,
  NODE_H,
  NODE_W,
  type PlacedNode,
  reachable,
} from "./graph_layout.ts";

const TOGGLED: readonly Layer[] = [
  "core",
  "cloudflare",
  "deno",
  "tooling",
  "ui",
];

/** Graph inputs for the chosen layers. */
export function graphInputs(
  catalog: Catalog,
  layers: ReadonlySet<string>,
): GraphInput[] {
  return catalog.modules
    .filter((m) => layers.has(m.layer))
    .map((m) => ({
      path: m.path,
      layer: m.layer,
      deps: m.imports.filter((i) => !i.external).map((i) => i.target),
    }));
}

/** A vertical S-curve from the bottom of an importer to the top of a dependency. */
export function edgePath(from: PlacedNode, to: PlacedNode): string {
  const x1 = from.x + NODE_W / 2;
  const y1 = from.y + NODE_H;
  const x2 = to.x + NODE_W / 2;
  const y2 = to.y;
  const bend = Math.max(18, (y2 - y1) / 2);
  return `M${x1},${y1} C${x1},${y1 + bend} ${x2},${y2 - bend} ${x2},${y2}`;
}

function draw(
  catalog: Catalog,
  layers: ReadonlySet<string>,
  onOpen: (path: string) => void,
  panel: HTMLElement,
  width: number,
): SVGSVGElement {
  const inputs = graphInputs(catalog, layers);
  const layout = layoutGraph(inputs, LAYER_ORDER, width);
  const at = new Map(layout.nodes.map((node) => [node.path, node]));
  const edges = layout.edges.flatMap((edge) => {
    const from = at.get(edge.from);
    const to = at.get(edge.to);
    if (from === undefined || to === undefined) return [];
    return [
      svg("path", {
        class: "g-edge",
        d: edgePath(from, to),
        "data-from": edge.from,
        "data-to": edge.to,
      }),
    ];
  });
  const nodes = layout.nodes.map((node) => {
    const group = svg("g", {
      class: "g-node",
      "data-layer": node.layer,
      "data-path": node.path,
      transform: `translate(${node.x} ${node.y})`,
      tabindex: 0,
      role: "button",
      "aria-label": `Open ${node.path}`,
    }, [
      svg("rect", { width: NODE_W, height: NODE_H, rx: 8 }),
      svg("circle", { cx: 13, cy: NODE_H / 2, r: 4 }),
      svg("text", { x: 24, y: NODE_H / 2 + 4 }, [shortName(node.path)]),
    ]);
    const trace = (on: boolean): void => {
      const hot = reachable(inputs, node.path);
      hot.add(node.path);
      panel.classList.toggle("is-tracing", on);
      for (const n of nodes) {
        n.classList.toggle(
          "is-hot",
          on && hot.has(n.getAttribute("data-path") ?? ""),
        );
      }
      for (const e of edges) {
        e.classList.toggle(
          "is-hot",
          on && hot.has(e.getAttribute("data-from") ?? "") &&
            hot.has(e.getAttribute("data-to") ?? ""),
        );
      }
    };
    group.addEventListener("pointerenter", () => trace(true));
    group.addEventListener("pointerleave", () => trace(false));
    group.addEventListener("focus", () => trace(true));
    group.addEventListener("blur", () => trace(false));
    group.addEventListener("click", () => onOpen(node.path));
    group.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onOpen(node.path);
      }
    });
    return group;
  });
  return svg("svg", {
    width: layout.width,
    height: layout.height,
    viewBox: `0 0 ${layout.width} ${layout.height}`,
    role: "img",
    "aria-label": "Module dependency graph",
  }, [svg("g", {}, edges), svg("g", {}, nodes)]);
}

/** Mount the graph and its layer toggles. */
export function mountGraph(
  host: HTMLElement,
  toggles: HTMLElement,
  catalog: Catalog,
  onOpen: (path: string) => void,
): void {
  const panel = host.closest<HTMLElement>(".graph") ?? host;
  const shown = new Set<string>(["core", "cloudflare", "deno", "tooling"]);
  let width = 0;
  const render = (): void => {
    width = host.clientWidth;
    host.replaceChildren(
      draw(catalog, shown, onOpen, panel, Math.max(360, width)),
    );
  };
  new ResizeObserver(() => {
    if (Math.abs(host.clientWidth - width) > 40) render();
  }).observe(host);
  toggles.replaceChildren(...TOGGLED.map((layer) => {
    const button = h("button", {
      class: "toggle",
      type: "button",
      "data-layer": layer,
      "aria-pressed": String(shown.has(layer)),
    }, [LAYER_NAMES[layer]]);
    button.addEventListener("click", () => {
      if (shown.has(layer)) shown.delete(layer);
      else shown.add(layer);
      button.setAttribute("aria-pressed", String(shown.has(layer)));
      render();
    });
    return button;
  }));
  render();
}
