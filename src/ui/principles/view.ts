/**
 * Render the principle lists with links that open the cited code.
 *
 * @module
 */

import { byId, h } from "../dom.ts";
import { OWASP, type Principle, UNIX } from "./content.ts";

function layerFor(path: string): string {
  if (path.startsWith("src/core/")) return "core";
  if (path.startsWith("src/adapters/cloudflare/")) return "cloudflare";
  if (path.startsWith("src/ui/")) return "ui";
  if (path.startsWith("src/tooling/")) return "tooling";
  return "project";
}

/** One principle card. */
export function principleCard(principle: Principle): HTMLElement {
  return h("li", { class: "principle" }, [
    h("p", { class: "principle__tag" }, [principle.tag]),
    h("p", { class: "principle__title" }, [principle.title]),
    h("p", { class: "principle__text" }, [principle.text]),
    h(
      "div",
      { class: "principle__refs" },
      principle.refs.map((ref) =>
        h("a", {
          class: "ref",
          href: "#anatomy",
          "data-layer": layerFor(ref.path),
          "data-open-module": ref.path,
          "data-symbol": ref.symbol,
        }, [
          ref.symbol === undefined
            ? ref.path
            : `${ref.path.split("/").pop()} · ${ref.symbol}`,
        ])
      ),
    ),
  ]);
}

/** Fill both lists. */
export function installPrinciples(): void {
  byId("owasp-list")?.replaceChildren(...OWASP.map(principleCard));
  byId("unix-list")?.replaceChildren(...UNIX.map(principleCard));
}
