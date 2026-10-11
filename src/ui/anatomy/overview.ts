/**
 * Numbers about the codebase, derived from the catalog: stats tiles, layer
 * counts on the ring legend, and the architecture rules with their results.
 *
 * @module
 */

import { all, byId, h } from "../dom.ts";
import { count } from "../format.ts";
import type { Catalog } from "./catalog.ts";

/** Headline facts about the code. Pure. */
export function codeStats(
  catalog: Catalog,
): { label: string; value: string }[] {
  const modules = catalog.modules;
  const lines = modules.reduce((sum, m) => sum + m.lines, 0);
  const core = modules.filter((m) => m.layer === "core");
  const packages = new Set(
    modules
      .filter((m) => m.layer === "core" || m.layer === "cloudflare")
      .flatMap((m) =>
        m.imports.filter((i) => i.external).map((i) =>
          i.target.split("/").slice(0, 2).join("/")
        )
      ),
  );
  const classes =
    catalog.rules.find((r) => r.id === "no-classes")?.violations.length ?? 0;
  return [
    { label: "modules", value: count(modules.length) },
    { label: "lines of TypeScript", value: count(lines) },
    {
      label: "lines per module (avg)",
      value: count(lines / Math.max(1, modules.length)),
    },
    { label: "pure core modules", value: count(core.length) },
    { label: "JSR packages in production", value: count(packages.size) },
    { label: "classes", value: count(classes) },
  ];
}

/** Paint stats, legend counts and rules. */
export function mountOverview(catalog: Catalog): void {
  byId("anatomy-stats")?.replaceChildren(
    ...codeStats(catalog).map((stat) =>
      h("div", { class: "stat" }, [
        h("b", {}, [stat.value]),
        h("span", {}, [stat.label]),
      ])
    ),
  );

  for (const slot of all("[data-layer-count]")) {
    const layer = slot.dataset["layerCount"];
    const n = catalog.modules.filter((m) => m.layer === layer).length;
    slot.textContent = `${n} module${n === 1 ? "" : "s"}`;
  }
  const modulesSlot = byId("menu-modules");
  if (modulesSlot !== null) {
    modulesSlot.textContent = String(catalog.modules.length);
  }

  const passing = catalog.rules.filter((r) => r.violations.length === 0).length;
  const badge = byId("rules-badge");
  if (badge !== null) {
    badge.textContent = `${passing}/${catalog.rules.length} passing`;
    badge.classList.toggle("badge--ok", passing === catalog.rules.length);
  }
  byId("rules-list")?.replaceChildren(...catalog.rules.map((rule) => {
    const pass = rule.violations.length === 0;
    return h("li", { class: `rule ${pass ? "is-pass" : "is-fail"}` }, [
      h("span", {
        class: "rule__mark",
        "aria-label": pass ? "passing" : "failing",
      }, [pass ? "✓" : "✗"]),
      h("span", { class: "rule__title" }, [rule.title]),
      h("span", { class: "rule__why" }, [
        rule.why,
        ...rule.violations.map((v) =>
          h("code", {}, [` ${v.path}: ${v.message}`])
        ),
      ]),
    ]);
  }));
}
