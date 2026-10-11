/**
 * The physics lab: pick a customer and a server location, see the minimum
 * round trip to each, and how much the nearest edge saves.
 *
 * @module
 */

import { byId, h } from "../dom.ts";
import { count } from "../format.ts";
import { type City, compareLatency, CUSTOMERS, ORIGINS } from "./physics.ts";

function fill(
  select: HTMLSelectElement,
  cities: readonly City[],
  chosen: string,
): void {
  select.replaceChildren(
    ...cities.map((city) =>
      h("option", { value: city.id, selected: city.id === chosen }, [city.name])
    ),
  );
}

function bar(
  label: string,
  km: number,
  msValue: number,
  scale: number,
  kind: string,
): HTMLElement {
  const fillBar = h("div", { class: `lab__fill lab__fill--${kind}` });
  fillBar.style.transform = `scaleX(${Math.max(0.015, msValue / scale)})`;
  return h("div", { class: "lab__row" }, [
    h("div", { class: "lab__row-head" }, [
      h("span", {}, [`${label} · ${count(km)} km`]),
      h("b", {}, [`≥ ${msValue.toFixed(1)} ms`]),
    ]),
    h("div", { class: "lab__track" }, [fillBar]),
  ]);
}

/** Wire the two selects to the bars. */
export function installLab(): void {
  const customer = byId<HTMLSelectElement>("lab-customer");
  const origin = byId<HTMLSelectElement>("lab-origin");
  const out = byId("lab-bars");
  if (customer === null || origin === null || out === null) return;
  fill(customer, CUSTOMERS, "tul");
  fill(origin, ORIGINS, "iad");

  const render = (): void => {
    const c = CUSTOMERS.find((city) => city.id === customer.value);
    const o = ORIGINS.find((city) => city.id === origin.value);
    if (c === undefined || o === undefined) return;
    const result = compareLatency(c, o);
    const scale = Math.max(result.originMs, result.edgeMs, 1);
    const saved = result.originMs - result.edgeMs;
    out.replaceChildren(
      bar("Single server", result.originKm, result.originMs, scale, "origin"),
      bar(
        `Edge in ${result.edge.name}`,
        result.edgeKm,
        result.edgeMs,
        scale,
        "edge",
      ),
      h(
        "p",
        { class: "lab__verdict" },
        saved > 0.5
          ? [
            "The edge saves at least ",
            h("b", {}, [`${saved.toFixed(1)} ms`]),
            " on every round trip, and pages make dozens of them.",
          ]
          : [
            "Your customer is already next to your server. The edge's win here is resilience: no single building to lose.",
          ],
      ),
    );
  };
  customer.addEventListener("change", render);
  origin.addEventListener("change", render);
  render();
}
