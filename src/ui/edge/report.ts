/**
 * Turn the server's `EdgeReport` into display strings, and paint them into
 * every `[data-edge-field]` slot on the page (hero HUD, menu, probe panel).
 *
 * @module
 */

import type { EdgeReport } from "../../core/features/edge.ts";
import { all } from "../dom.ts";

/** Human labels for the runtimes the adapters report. */
const RUNTIMES: Readonly<Record<string, string>> = {
  "cloudflare-workers": "Cloudflare Workers",
  "deno": "Deno (local)",
};

/** Display strings for each field. Pure. */
export function edgeFields(report: EdgeReport): Record<string, string> {
  const place = [
    report.visitorCity,
    report.visitorRegion,
    report.visitorCountry,
  ]
    .filter((part): part is string => typeof part === "string" && part !== "")
    .join(", ");
  return {
    runtime: RUNTIMES[report.runtime] ?? report.runtime,
    colo: report.colo ?? (report.runtime === "deno" ? "localhost" : "unknown"),
    visitor: place === "" ? "not shared" : place,
    protocol:
      [report.httpProtocol, report.tlsVersion].filter(Boolean).join(" · ") ||
      "local",
  };
}

/** Write the fields into every matching slot, flashing the ones that changed. */
export function paintEdgeFields(report: EdgeReport): void {
  const fields = edgeFields(report);
  for (const slot of all("[data-edge-field]")) {
    const value = fields[slot.dataset["edgeField"] ?? ""];
    if (value === undefined || slot.textContent === value) continue;
    slot.textContent = value;
    slot.classList.remove("is-fresh");
    void slot.offsetWidth;
    slot.classList.add("is-fresh");
  }
}
