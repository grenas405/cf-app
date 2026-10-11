/**
 * The cost estimator: sliders -> debounced `POST /api/estimate` -> bill.
 * Slider ranges are read from the schema the API publishes, so the form and
 * the validator can never disagree.
 *
 * @module
 */

import type { Discovery } from "../../core/features/discovery.ts";
import type { Estimate } from "../../core/features/estimate/estimate.ts";
import type { EstimateInput } from "../../core/features/estimate/schema.ts";
import { bodyOf, postJson, problemOf } from "../api.ts";
import { byId, h } from "../dom.ts";
import { usd } from "../format.ts";
import { tween } from "../motion.ts";
import { boundsFrom, fillPercent, SLIDERS } from "./sliders.ts";

function inputOf(id: string): HTMLInputElement | null {
  return byId<HTMLInputElement>(id);
}

/** Current slider values as an API payload. */
export function readEstimateInput(): EstimateInput {
  const entries = SLIDERS.map((
    spec,
  ) => [spec.field, spec.toValue(Number(inputOf(spec.input)?.value ?? 0))]);
  return Object.fromEntries(entries) as EstimateInput;
}

function paintSliders(): void {
  for (const spec of SLIDERS) {
    const input = inputOf(spec.input);
    const output = byId(spec.output);
    if (input === null || output === null) continue;
    output.textContent = spec.show(spec.toValue(Number(input.value)));
    input.style.setProperty(
      "--fill",
      fillPercent(Number(input.value), Number(input.min), Number(input.max)),
    );
  }
}

/** Adopt the ranges from the published schema. */
export function applySchema(discovery: Discovery): void {
  const schema = discovery.routes.find((route) =>
    route.path === "/api/estimate"
  )?.input;
  for (const spec of SLIDERS.filter((s) => s.schemaBounds)) {
    const input = inputOf(spec.input);
    const { min, max } = boundsFrom(schema, spec.field);
    if (input === null) continue;
    if (min !== undefined) input.min = String(min);
    if (max !== undefined) input.max = String(max);
  }
  paintSliders();
}

function compareBars(estimate: Estimate): HTMLElement[] {
  const top = Math.max(estimate.currentMonthlyUsd, estimate.monthlyUsd, 1);
  const row = (label: string, value: number, kind: string): HTMLElement => {
    const fill = h("div", { class: `lab__fill lab__fill--${kind}` });
    fill.style.transform = `scaleX(${Math.max(0.01, value / top)})`;
    return h("div", { class: "lab__row" }, [
      h("div", { class: "lab__row-head" }, [
        h("span", {}, [label]),
        h("b", {}, [usd(value)]),
      ]),
      h("div", { class: "lab__track" }, [fill]),
    ]);
  };
  const savings = estimate.monthlySavingsUsd;
  return [
    row("Hosting today", estimate.currentMonthlyUsd, "origin"),
    row("On Workers", estimate.monthlyUsd, "edge"),
    h(
      "p",
      { class: "lab__verdict" },
      savings > 0
        ? [
          "About ",
          h("b", {}, [usd(savings * 12)]),
          " a year back in your pocket.",
        ]
        : ["Comparable cost, with a global network included."],
    ),
  ];
}

/** Wire the sliders to the API. */
export function installCost(discovery: Promise<Discovery | null>): void {
  const form = byId<HTMLFormElement>("cost-form");
  const total = byId("bill-total");
  const plan = byId("bill-plan");
  const compare = byId("bill-compare");
  const lines = byId("bill-lines");
  const notes = byId("bill-notes");
  const bill = total?.closest<HTMLElement>(".bill");
  if (!form || !total || !plan || !compare || !lines || !notes || !bill) return;

  let shown = 0;
  let sequence = 0;
  let timer = 0;

  const refresh = async (): Promise<void> => {
    const mine = ++sequence;
    bill.classList.add("is-busy");
    const response = await postJson<Estimate>(
      "/api/estimate",
      readEstimateInput(),
    );
    if (mine !== sequence) return;
    bill.classList.remove("is-busy");
    const estimate = bodyOf(response);
    if (estimate === null) {
      const problem = problemOf(response);
      lines.replaceChildren(
        h("li", { class: "bill__error" }, [
          problem?.detail ?? "The edge could not be reached.",
        ]),
      );
      return;
    }
    tween(
      shown,
      estimate.monthlyUsd,
      900,
      (value) => total.textContent = value.toFixed(2),
    );
    shown = estimate.monthlyUsd;
    plan.textContent = estimate.plan === "free" ? "Free plan" : "Workers Paid";
    plan.classList.toggle("badge--ok", estimate.plan === "free");
    compare.replaceChildren(...compareBars(estimate));
    lines.replaceChildren(
      ...estimate.lines.map((line) =>
        h("li", { class: "bill__line" }, [
          h("span", {}, [line.label]),
          h("b", {}, [usd(line.usd)]),
          h("code", {}, [line.formula]),
        ])
      ),
    );
    notes.replaceChildren(...estimate.notes.map((note) => h("li", {}, [note])));
  };

  form.addEventListener("input", () => {
    paintSliders();
    clearTimeout(timer);
    timer = setTimeout(refresh, 160);
  });
  form.addEventListener("submit", (event) => event.preventDefault());
  paintSliders();
  void discovery.then((doc) => {
    if (doc !== null) applySchema(doc);
    return refresh();
  });
}
